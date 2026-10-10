<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Support\Erp;
use Illuminate\Http\Request;

class HrController extends Controller
{
    public const PAYROLL_STAGES = ['Attendance Locked', 'Salary Calculated', 'Under Review', 'Approved', 'Paid'];

    public function employees(Request $r)
    {
        return Employee::query()
            ->when($r->query('dept'), fn ($q, $v) => $q->where('dept', $v))
            ->when($r->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('id', 'like', "%$s%")))
            ->orderBy('id')->get();
    }

    public function employee(string $id)
    {
        $e = Employee::findOrFail($id);
        return $e->toArray() + [
            'salary' => self::salary($e->basic),
            'attendance' => Attendance::where('emp_id', $id)->orderByDesc('date')->limit(30)->get(),
            'leaves' => LeaveRequest::where('emp_id', $id)->orderByDesc('id')->get(),
        ];
    }

    public function storeEmployee(Request $r)
    {
        $d = $r->validate(['name' => 'required', 'dept' => 'required|in:'.implode(',', Erp::DEPARTMENTS), 'designation' => 'required', 'role' => 'required|in:'.implode(',', Erp::ROLES),
            'joined' => 'required|date', 'type' => 'required|in:Permanent,Contract,Probation', 'basic' => 'required|numeric|min:0']);
        $id = Employee::nextId('EMP-');
        $e = Employee::create($d + [
            'id' => $id, 'status' => 'Active', 'phone' => '+880 17XX-XXXXXX', 'email' => strtolower(str_replace(' ', '.', $d['name'])).'@winnerapparels.com',
            'leave' => ['casual' => 10, 'sick' => 14, 'annual' => 20], 'perf' => ['output' => 0, 'rejectRate' => 0, 'efficiency' => 0],
        ]);
        Attendance::create(['date' => Erp::today(), 'emp_id' => $id, 'in' => '08:12', 'out' => '—', 'status' => 'Present', 'hours' => 0]);
        Activity::log("New employee onboarded: {$e->name} ({$e->designation})", 'hr');
        return response()->json($e, 201);
    }

    public function updateEmployee(Request $r, string $id)
    {
        $e = Employee::findOrFail($id);
        $e->update($r->only(['name', 'dept', 'designation', 'role', 'type', 'status', 'basic', 'phone', 'email']));
        return $e;
    }

    public function departments()
    {
        return Employee::all()->groupBy('dept')->map(fn ($g, $dept) => [
            'name' => $dept, 'headcount' => $g->count(), 'payroll' => $g->sum('basic'),
            'head' => $g->sortByDesc('basic')->first()?->name,
        ])->values();
    }

    public function designations()
    {
        return Employee::all()->groupBy(fn ($e) => $e->dept.'|'.$e->designation)->map(function ($g) {
            $f = $g->first();
            return ['designation' => $f->designation, 'dept' => $f->dept, 'role' => $f->role, 'headcount' => $g->count(), 'avg_basic' => round($g->avg('basic'))];
        })->values();
    }

    public function attendance(Request $r)
    {
        $date = $r->query('date', Erp::today());
        $emps = Employee::pluck('name', 'id');
        $rows = Attendance::where('date', $date)->get()->map(fn ($a) => $a->toArray() + ['employee' => $emps[$a->emp_id] ?? $a->emp_id]);
        return [
            'date' => $date, 'rows' => $rows,
            'summary' => ['Present' => $rows->where('status', 'Present')->count(), 'Late' => $rows->where('status', 'Late')->count(),
                'Absent' => $rows->where('status', 'Absent')->count(), 'Leave' => $rows->where('status', 'Leave')->count()],
        ];
    }

    public function leaves()
    {
        $emps = Employee::pluck('name', 'id');
        return LeaveRequest::orderByDesc('id')->get()->map(fn ($l) => $l->toArray() + ['employee' => $emps[$l->emp_id] ?? $l->emp_id]);
    }

    public function storeLeave(Request $r)
    {
        $d = $r->validate(['emp_id' => 'required|exists:employees,id', 'type' => 'required|in:Casual,Sick,Annual', 'from' => 'required|date', 'to' => 'required|date|after_or_equal:from', 'reason' => 'nullable|string']);
        $days = (new \DateTime($d['from']))->diff(new \DateTime($d['to']))->days + 1;
        return response()->json(LeaveRequest::create($d + ['id' => LeaveRequest::nextId('LV-', 4), 'days' => $days, 'status' => 'Pending']), 201);
    }

    public function decideLeave(Request $r, string $id)
    {
        $d = $r->validate(['status' => 'required|in:Approved,Rejected']);
        $l = LeaveRequest::findOrFail($id);
        abort_if($l->status !== 'Pending', 422, 'Leave request already decided.');
        $l->update($d);
        if ($d['status'] === 'Approved') {
            $e = Employee::find($l->emp_id);
            $bal = $e->leave;
            $k = strtolower($l->type);
            $bal[$k] = max(0, ($bal[$k] ?? 0) - $l->days);
            $e->leave = $bal;
            $e->save();
            Activity::log("Employee leave approved – {$e->name} ({$l->type}, {$l->days} day".($l->days > 1 ? 's' : '').')', 'hr');
        }
        return $l;
    }

    public static function salary(float $basic): array
    {
        $house = (int) round($basic * .25);
        $medical = (int) round($basic * .1);
        $transport = (int) round($basic * .1);
        return ['basic' => $basic, 'house' => $house, 'medical' => $medical, 'transport' => $transport, 'gross' => $basic + $house + $medical + $transport];
    }

    public function salaryStructure()
    {
        return Employee::orderBy('id')->get()->map(fn ($e) => ['id' => $e->id, 'name' => $e->name, 'dept' => $e->dept, 'designation' => $e->designation] + self::salary($e->basic));
    }

    public function payroll()
    {
        $emps = Employee::where('status', 'Active')->get();
        $gross = $emps->sum(fn ($e) => self::salary($e->basic)['gross']);
        $ded = (int) round($gross * .05);
        $stage = Erp::system()['payroll_stage'] ?? 2;
        return [
            'current' => ['month' => 'October 2026', 'employees' => $emps->count(), 'gross' => $gross, 'deductions' => $ded, 'net' => $gross - $ded,
                'stage' => $stage, 'stage_name' => self::PAYROLL_STAGES[min($stage, 4)], 'stages' => self::PAYROLL_STAGES],
            'history' => PayrollRun::orderByDesc('id')->get(),
        ];
    }

    public function advancePayroll()
    {
        $stage = Erp::system()['payroll_stage'] ?? 2;
        if ($stage < 5) Erp::patchSystem(['payroll_stage' => ++$stage]);
        if ($stage === 5) Activity::log('October 2026 payroll marked as paid', 'hr');
        return $this->payroll();
    }
}
