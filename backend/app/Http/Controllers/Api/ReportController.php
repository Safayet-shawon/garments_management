<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Material;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductionPlan;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Support\Erp;

class ReportController extends Controller
{
    public const KINDS = ['sales', 'inventory', 'production', 'procurement', 'hr'];

    public function show(string $kind)
    {
        abort_unless(in_array($kind, self::KINDS), 404, 'Unknown report');
        return ['kind' => $kind] + $this->{$kind}();
    }

    private function sales(): array
    {
        $orders = Order::where('cancelled', false)->get();
        $byBuyer = $orders->groupBy('buyer')->map(fn ($g, $b) => ['buyer' => $b, 'orders' => $g->count(), 'quantity' => $g->sum(fn ($o) => collect($o->lines)->sum('qty')), 'value' => $g->sum(fn ($o) => Erp::orderValue($o))])->values();
        $byCountry = $orders->groupBy('country')->map(fn ($g, $c) => ['country' => $c, 'orders' => $g->count(), 'value' => $g->sum(fn ($o) => Erp::orderValue($o))])->values();
        $byProduct = [];
        foreach ($orders as $o) foreach ($o->lines as $l) {
            $byProduct[$l['productId']]['product_id'] = $l['productId'];
            $byProduct[$l['productId']]['quantity'] = ($byProduct[$l['productId']]['quantity'] ?? 0) + $l['qty'];
            $byProduct[$l['productId']]['value'] = ($byProduct[$l['productId']]['value'] ?? 0) + $l['qty'] * $l['price'];
        }
        return ['total_value' => $orders->sum(fn ($o) => Erp::orderValue($o)), 'orders' => $orders->count(), 'by_buyer' => $byBuyer, 'by_country' => $byCountry, 'by_product' => array_values($byProduct)];
    }

    private function inventory(): array
    {
        $mats = Material::all();
        return [
            'raw_material_value' => $mats->sum(fn ($m) => $m->on_hand * $m->unit_cost),
            'finished_goods_units' => Product::sum('stock'),
            'by_status' => $mats->groupBy('status')->map->count(),
            'materials' => $mats->map(fn ($m) => $m->only(['id', 'name', 'on_hand', 'unit', 'status']) + ['value' => round($m->on_hand * $m->unit_cost)])->values(),
        ];
    }

    private function production(): array
    {
        $plans = ProductionPlan::where('status', '!=', 'Cancelled')->get();
        return [
            'plans' => $plans->count(), 'target' => $plans->sum('target'), 'sewn' => $plans->sum('sewn'), 'finished' => $plans->sum('finished'),
            'efficiency' => $plans->sum('target') ? round($plans->sum('sewn') / $plans->sum('target') * 100, 1) : 0,
            'rows' => $plans->map(fn ($p) => $p->only(['id', 'product_id', 'target', 'cut', 'sewn', 'finished', 'stage', 'status']))->values(),
        ];
    }

    private function procurement(): array
    {
        $pos = PurchaseOrder::all();
        $sup = Supplier::pluck('name', 'id');
        return [
            'total_value' => $pos->sum(fn ($p) => collect($p->items)->sum(fn ($i) => $i['qty'] * $i['price'])),
            'by_status' => $pos->groupBy('status')->map->count(),
            'by_supplier' => $pos->groupBy('supplier_id')->map(fn ($g, $s) => ['supplier' => $sup[$s] ?? $s, 'orders' => $g->count(), 'value' => $g->sum(fn ($p) => collect($p->items)->sum(fn ($i) => $i['qty'] * $i['price']))])->values(),
        ];
    }

    private function hr(): array
    {
        $emps = Employee::all();
        return [
            'headcount' => $emps->count(), 'monthly_basic' => $emps->sum('basic'),
            'by_dept' => $emps->groupBy('dept')->map(fn ($g, $d) => ['dept' => $d, 'headcount' => $g->count(), 'basic' => $g->sum('basic')])->values(),
            'by_type' => $emps->groupBy('type')->map->count(),
        ];
    }
}
