<?php

namespace App\Support;

use App\Models\Material;
use App\Models\Order;
use App\Models\ProductionPlan;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\BomItem;

/** Shared business rules ported from the original Winner Apparels app. */
class Erp
{
    public const PLAN_STAGES = ['Planned', 'Material Check', 'Cutting', 'Sewing', 'Finishing', 'Quality Control', 'Completed'];
    public const PO_STATUSES = ['Draft', 'Approved', 'Ordered', 'Partially Received', 'Received', 'Closed'];
    public const ORDER_STEPS = ['Order Received', 'Sample Approved', 'Materials Booked', 'In Production', 'Goods Allocated', 'Packed', 'Shipped', 'Payment Received'];
    public const DEPARTMENTS = ['Management', 'HR', 'Production', 'Cutting', 'Sewing', 'Finishing', 'Quality Control', 'Warehouse', 'Procurement', 'Merchandising', 'Accounts'];
    public const ROLES = ['Admin', 'Manager', 'Supervisor', 'Production Worker', 'HR Officer', 'Store Keeper', 'Accountant', 'QC Inspector', 'Merchandiser'];

    public static function today(): string
    {
        return Setting::read('system', [])['today'] ?? now()->toDateString();
    }

    public static function system(): array
    {
        return Setting::read('system', []);
    }

    public static function patchSystem(array $patch): array
    {
        $v = array_merge(self::system(), $patch);
        Setting::put('system', $v);
        return $v;
    }

    public static function movement(array $m): StockMovement
    {
        return StockMovement::create($m + [
            'id' => 'mv'.str_replace('.', '', uniqid('', true)),
            'date' => self::today(),
            'user' => 'Safayet Shawon',
        ]);
    }

    /** Material requirements for producing $qty of a product. */
    public static function requirements(string $productId, int|float $qty): array
    {
        $mats = Material::all()->keyBy('id');
        return BomItem::where('product_id', $productId)->get()->map(function ($line) use ($mats, $qty) {
            $mat = $mats[$line->material_id];
            $required = round($line->qty * $qty, 2);
            $short = max(0, round($required - $mat->on_hand, 2));
            return [
                'material_id' => $mat->id, 'material' => $mat->name, 'sku' => $mat->sku, 'unit' => $line->unit,
                'per_unit' => $line->qty, 'required' => $required, 'available' => $mat->on_hand,
                'shortage' => $short, 'status' => $short > 0 ? 'Short' : 'Ready',
            ];
        })->all();
    }

    public static function planReady(ProductionPlan $plan): bool
    {
        return $plan->mat_issued || collect(self::requirements($plan->product_id, $plan->target))->every(fn ($r) => $r['shortage'] == 0);
    }

    public static function presentPlan(ProductionPlan $plan): array
    {
        $a = $plan->toArray();
        $a['display_status'] = ($plan->status === 'Planned' && self::planReady($plan)) ? 'Ready' : $plan->status;
        $a['materials_ready'] = self::planReady($plan);
        $a['progress'] = $plan->target ? min(100, (int) round($plan->sewn / $plan->target * 100)) : 0;
        return $a;
    }

    public static function orderValue(Order $o): float
    {
        return collect($o->lines)->sum(fn ($l) => $l['qty'] * $l['price']);
    }

    public static function orderStatus(Order $o): string
    {
        if ($o->cancelled) return 'Cancelled';
        if ($o->step <= 1) return 'Sampling';
        if ($o->step <= 3) return 'In Production';
        if ($o->step <= 5) return 'Ready to Ship';
        return $o->step === 6 ? 'Shipped' : 'Completed';
    }

    public static function presentOrder(Order $o): array
    {
        $a = $o->toArray();
        $a['value'] = self::orderValue($o);
        $a['quantity'] = collect($o->lines)->sum('qty');
        $a['status'] = self::orderStatus($o);
        $a['step_name'] = self::ORDER_STEPS[$o->step];
        return $a;
    }

    /** Units of a product reserved by orders that are allocated / packed. */
    public static function reservedFor(string $productId, ?string $exceptOrder = null): int
    {
        return Order::where('cancelled', false)->whereBetween('step', [4, 5])
            ->when($exceptOrder, fn ($q) => $q->where('id', '!=', $exceptOrder))->get()
            ->sum(fn ($o) => collect($o->lines)->where('productId', $productId)->sum('qty'));
    }
}
