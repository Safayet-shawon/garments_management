<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Employee;
use App\Models\User;
use App\Support\Erp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class SettingsController extends Controller
{
    public function users()
    {
        return User::orderBy('id')->get();
    }

    public function storeUser(Request $r)
    {
        $d = $r->validate(['name' => 'required', 'email' => 'required|email|unique:users', 'role' => 'required|in:'.implode(',', Erp::ROLES), 'password' => 'required|min:6']);
        return response()->json(User::create($d), 201);
    }

    public function updateUser(Request $r, int $id)
    {
        $u = User::findOrFail($id);
        $d = $r->validate(['name' => 'sometimes|required', 'role' => 'sometimes|in:'.implode(',', Erp::ROLES), 'status' => 'sometimes|in:Active,Inactive']);
        $u->update($d);
        return $u;
    }

    public function roles()
    {
        $perm = [
            'Admin' => ['*'], 'Manager' => ['catalog', 'inventory', 'manufacturing', 'procurement', 'hr', 'merchandising', 'reports'],
            'Supervisor' => ['manufacturing', 'inventory.view'], 'Production Worker' => ['manufacturing.view'], 'HR Officer' => ['hr'],
            'Store Keeper' => ['inventory', 'procurement.receiving'], 'Accountant' => ['procurement', 'hr.payroll', 'reports'],
            'QC Inspector' => ['manufacturing.qc'], 'Merchandiser' => ['merchandising', 'catalog.view'],
        ];
        $counts = Employee::selectRaw('role, count(*) c')->groupBy('role')->pluck('c', 'role');
        return collect(Erp::ROLES)->map(fn ($r) => ['name' => $r, 'permissions' => $perm[$r] ?? [], 'employees' => $counts[$r] ?? 0]);
    }

    public function system()
    {
        return Erp::system();
    }

    public function updateSystem(Request $r)
    {
        return Erp::patchSystem($r->validate(['company' => 'sometimes|string', 'factory' => 'sometimes|string', 'currency' => 'sometimes|string|size:3']));
    }

    public function activities()
    {
        return Activity::orderByDesc('id')->limit(30)->get();
    }

    /** Re-create the demo data set. */
    public function reset()
    {
        Artisan::call('migrate:fresh', ['--seed' => true, '--force' => true]);
        return ['message' => 'Demo data has been reset'];
    }
}
