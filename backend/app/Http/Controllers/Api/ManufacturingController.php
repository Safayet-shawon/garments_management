<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Product;
use App\Models\ProductionPlan;
use App\Support\Erp;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ManufacturingController extends Controller
{
    public function index(Request $r)
    {
        $products = Product::pluck('name', 'id');
        return ProductionPlan::orderByDesc('id')
            ->when($r->query('stage'), fn ($q, $v) => $q->where('stage', $v))
            ->get()->map(fn ($p) => Erp::presentPlan($p) + ['product' => $products[$p->product_id] ?? null]);
    }

    public function show(string $id)
    {
        $p = ProductionPlan::findOrFail($id);
        return Erp::presentPlan($p) + ['product' => Product::find($p->product_id)?->name, 'requirements' => Erp::requirements($p->product_id, $p->target)];
    }

    public function store(Request $r)
    {
        $d = $r->validate(['product_id' => 'required|exists:products,id', 'variant' => 'nullable|string', 'target' => 'required|integer|min:1',
            'start' => 'required|date', 'end' => 'required|date|after_or_equal:start', 'supervisor' => 'nullable|string',
            'priority' => 'nullable|in:Low,Normal,High', 'notes' => 'nullable|string', 'team' => 'nullable|string']);
        $p = ProductionPlan::create($d + ['id' => ProductionPlan::nextId('PP-2026-'), 'status' => 'Planned', 'stage' => 'Planned']);
        Activity::log("Production plan {$p->id} created", 'prod');
        return response()->json(Erp::presentPlan($p->fresh()), 201);
    }

    public function requirements(Request $r)
    {
        $d = $r->validate(['product_id' => 'required|exists:products,id', 'qty' => 'required|numeric|gt:0']);
        return Erp::requirements($d['product_id'], $d['qty']);
    }

    public function action(Request $r, string $id, string $action)
    {
        $p = ProductionPlan::findOrFail($id);
        $stageIdx = fn ($s) => array_search($s, Erp::PLAN_STAGES);
        $qty = fn () => (int) $r->validate(['qty' => 'required|integer|gt:0'])['qty'];

        switch ($action) {
            case 'start':
                if (! Erp::planReady($p)) throw ValidationException::withMessages(['materials' => 'Raw materials are short for this plan.']);
                $p->fill(['status' => 'In Progress', 'stage' => 'Cutting', 'mat_issued' => true]);
                Activity::log("Production started: $id", 'prod');
                break;
            case 'cancel':
                $p->status = 'Cancelled';
                break;
            case 'assign-team':
                $d = $r->validate(['team' => 'required|string', 'supervisor' => 'required|string']);
                $p->fill($d);
                break;
            case 'start-cutting':
                $p->fill(['cutting_started' => true, 'issued' => max($p->issued, (int) round($p->target * .1))]);
                break;
            case 'record-cutting':
                $q = $qty();
                $waste = (int) $r->input('waste_kg', 0);
                $p->cut = min($p->target, $p->cut + $q);
                $p->waste_kg += $waste;
                $p->issued = max($p->issued, $p->cut);
                $p->cutting_started = true;
                if ($stageIdx($p->stage) < 2) $p->stage = 'Cutting';
                Activity::log("Cutting output recorded: $q pcs for $id", 'prod');
                break;
            case 'start-sewing':
                $p->sewing_started = true;
                if ($stageIdx($p->stage) < 3) $p->stage = 'Sewing';
                break;
            case 'record-sewing':
                $q = $qty();
                $reject = (int) $r->input('rejected', 0);
                $add = min($p->cut, $p->sewn + $q) - $p->sewn;
                $p->sewn += $add;
                $p->sew_reject += $reject;
                $p->sewing_started = true;
                if ($stageIdx($p->stage) < 3) $p->stage = 'Sewing';
                Erp::patchSystem(['output_today' => (Erp::system()['output_today'] ?? 2350) + $add]);
                Activity::log("Sewing output recorded: $q pcs for $id", 'prod');
                break;
            case 'record-finishing':
                $q = $qty();
                $p->finished = min($p->sewn, $p->finished + $q);
                if ($stageIdx($p->stage) < 4) $p->stage = 'Finishing';
                if ($p->finished >= $p->target) $p->fill(['stage' => 'Quality Control', 'qc_status' => 'Pending']);
                Activity::log("Finishing output recorded: $q pcs for $id", 'prod');
                break;
            case 'send-qc':
                $p->fill(['stage' => 'Quality Control', 'qc_status' => 'Pending']);
                break;
            case 'complete-qc':
                $d = $r->validate(['inspected' => 'required|integer|gt:0', 'rejected' => 'required|integer|min:0|lte:inspected', 'reasons' => 'nullable|array', 'inspector' => 'nullable|string']);
                $p->fill(['qc_inspected' => $d['inspected'], 'qc_rejected' => $d['rejected'], 'qc_passed' => $d['inspected'] - $d['rejected'],
                    'qc_reasons' => $d['reasons'] ?? [], 'qc_inspector' => $d['inspector'] ?? $p->qc_inspector, 'qc_status' => 'Passed']);
                Activity::log(number_format($p->qc_passed)." finished units passed QC ($id)", 'fg');
                break;
            case 'move-to-fg':
                if ($p->qc_status !== 'Passed') throw ValidationException::withMessages(['qc' => 'Batch has not passed QC.']);
                $prod = Product::findOrFail($p->product_id);
                $prod->stock += $p->qc_passed;
                $prod->updated = Erp::today();
                $prod->save();
                $p->fill(['qc_status' => 'Moved to Finished Goods', 'status' => 'Completed', 'stage' => 'Completed']);
                Erp::movement(['sku' => $prod->variants[0]['sku'] ?? $prod->sku, 'item' => $prod->name, 'warehouse' => 'FG-WH',
                    'type' => 'PRODUCTION_OUTPUT', 'qty' => $p->qc_passed, 'unit' => 'pcs', 'ref' => $id]);
                Activity::log(number_format($p->qc_passed)." {$prod->name} units added to Finished Goods", 'fg');
                break;
            default:
                abort(404, 'Unknown action');
        }
        $p->save();
        return Erp::presentPlan($p->fresh());
    }

    public function report()
    {
        $plans = ProductionPlan::whereNotIn('status', ['Cancelled'])->get();
        $sum = fn ($f) => $plans->sum($f);
        return [
            'plans' => $plans->count(), 'target' => $sum('target'), 'cut' => $sum('cut'), 'sewn' => $sum('sewn'), 'finished' => $sum('finished'),
            'waste_kg' => $sum('waste_kg'), 'sew_reject' => $sum('sew_reject'), 'qc_passed' => $sum('qc_passed'), 'qc_rejected' => $sum('qc_rejected'),
            'by_stage' => $plans->groupBy('stage')->map->count(),
            'by_team' => $plans->where('team', '!=', 'Unassigned')->groupBy('team')->map(fn ($g) => ['plans' => $g->count(), 'sewn' => $g->sum('sewn'), 'target' => $g->sum('target')]),
        ];
    }
}
