<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Material;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Support\Erp;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function materials(Request $r)
    {
        return Material::query()
            ->when($r->query('warehouse'), fn ($q, $v) => $q->where('warehouse', $v))
            ->when($r->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('sku', 'like', "%$s%")))
            ->orderBy('name')->get();
    }

    public function lowStock()
    {
        return Material::all()->filter(fn ($m) => $m->status !== 'Healthy')->sortBy('on_hand')->values();
    }

    public function finishedGoods()
    {
        return Product::all()->map(function ($p) {
            $reserved = Erp::reservedFor($p->id);
            $avail = $p->stock - $reserved;
            return $p->only(['id', 'name', 'sku', 'category', 'stock', 'reorder']) + [
                'reserved' => $reserved, 'available' => $avail,
                'status' => $avail <= $p->reorder * .4 ? 'Critical' : ($avail <= $p->reorder ? 'Low' : 'Healthy'),
            ];
        });
    }

    public function reservations()
    {
        return \App\Models\Order::where('cancelled', false)->whereBetween('step', [4, 5])->get()->flatMap(fn ($o) => collect($o->lines)->map(fn ($l) => [
            'order_id' => $o->id, 'buyer' => $o->buyer, 'product_id' => $l['productId'], 'variant' => $l['variant'], 'sku' => $l['sku'],
            'qty' => $l['qty'], 'stage' => Erp::ORDER_STEPS[$o->step],
        ]))->values();
    }

    public function movements(Request $r)
    {
        return StockMovement::query()->when($r->query('type'), fn ($q, $v) => $q->where('type', $v))
            ->orderByDesc('date')->orderByDesc('created_at')->limit(200)->get();
    }

    public function warehouses()
    {
        return Warehouse::all()->map(fn ($w) => $w->toArray() + [
            'items' => Material::where('warehouse', $w->code)->count(),
            'value' => Material::where('warehouse', $w->code)->get()->sum(fn ($m) => $m->on_hand * $m->unit_cost),
        ]);
    }

    public function storeWarehouse(Request $r)
    {
        $d = $r->validate(['code' => 'required|unique:warehouses,code', 'name' => 'required', 'location' => 'nullable', 'type' => 'required']);
        return response()->json(Warehouse::create($d + ['id' => 'w'.time()]), 201);
    }

    public function receive(Request $r)
    {
        $d = $r->validate([
            'material_id' => 'required|exists:materials,id', 'qty' => 'required|numeric|gt:0', 'warehouse' => 'required',
            'po_id' => 'nullable|exists:purchase_orders,id', 'batch' => 'nullable|string', 'quality' => 'nullable|in:Accepted,Rejected',
        ]);
        $accepted = ($d['quality'] ?? 'Accepted') !== 'Rejected';
        $m = Material::findOrFail($d['material_id']);
        if ($accepted) {
            $m->on_hand = round($m->on_hand + $d['qty'], 2);
            $m->save();
        }
        Erp::movement(['sku' => $m->sku, 'item' => $m->name, 'warehouse' => $d['warehouse'], 'type' => 'RECEIPT',
            'qty' => $accepted ? $d['qty'] : 0, 'unit' => $m->unit, 'ref' => ($d['po_id'] ?? 'Direct').' · '.($d['batch'] ?? 'No lot')]);
        if (! empty($d['po_id'])) {
            $po = PurchaseOrder::find($d['po_id']);
            $items = $po->items;
            foreach ($items as &$it) {
                if ($it['material_id'] === $m->id && $accepted) $it['received'] += $d['qty'];
            }
            unset($it);
            $po->items = $items;
            if ($accepted) {
                $po->status = collect($items)->every(fn ($i) => $i['received'] >= $i['qty']) ? 'Received' : 'Partially Received';
            }
            $po->save();
        }
        Activity::log("Material received: {$d['qty']} {$m->unit} {$m->name}".(! empty($d['po_id']) ? " against {$d['po_id']}" : ''), 'po');
        return $m->fresh();
    }

    public function adjust(Request $r)
    {
        $d = $r->validate(['material_id' => 'required|exists:materials,id', 'delta' => 'required|numeric|not_in:0', 'reason' => 'required|string']);
        $m = Material::findOrFail($d['material_id']);
        $m->on_hand = max(0, round($m->on_hand + $d['delta'], 2));
        $m->save();
        Erp::movement(['sku' => $m->sku, 'item' => $m->name, 'warehouse' => $m->warehouse, 'type' => 'ADJUSTMENT', 'qty' => $d['delta'],
            'unit' => $m->unit, 'ref' => 'ADJ-'.random_int(100, 999).' ('.$d['reason'].')']);
        Activity::log("Stock adjustment: {$m->name} ".($d['delta'] > 0 ? '+' : '')."{$d['delta']} {$m->unit} ({$d['reason']})");
        return $m;
    }
}
