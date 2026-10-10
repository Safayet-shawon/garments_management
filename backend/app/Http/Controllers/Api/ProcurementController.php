<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Material;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use App\Models\Supplier;
use App\Support\Erp;
use Illuminate\Http\Request;

class ProcurementController extends Controller
{
    public function suppliers()
    {
        return Supplier::orderBy('name')->get();
    }

    public function storeSupplier(Request $r)
    {
        $d = $r->validate(['name' => 'required', 'type' => 'required', 'contact' => 'nullable', 'phone' => 'nullable', 'location' => 'nullable',
            'rating' => 'nullable|numeric|between:0,5', 'status' => 'nullable|in:Active,Inactive']);
        $s = Supplier::create($d + ['id' => 's'.time()]);
        Activity::log("New supplier added: {$s->name}", 'sup');
        return response()->json($s, 201);
    }

    public function updateSupplier(Request $r, string $id)
    {
        $s = Supplier::findOrFail($id);
        $s->update($r->only(['name', 'type', 'contact', 'phone', 'location', 'rating', 'status']));
        return $s;
    }

    public function requisitions()
    {
        $mats = Material::all()->keyBy('id');
        return PurchaseRequisition::orderByDesc('id')->get()->map(fn ($p) => $p->toArray() + ['material' => $mats[$p->material_id]->name ?? null, 'unit' => $mats[$p->material_id]->unit ?? null]);
    }

    public function storeRequisition(Request $r)
    {
        $d = $r->validate(['material_id' => 'required|exists:materials,id', 'qty' => 'required|numeric|gt:0', 'reason' => 'nullable', 'supplier_id' => 'nullable|exists:suppliers,id',
            'expected' => 'nullable|date', 'priority' => 'nullable|in:Low,Normal,High', 'notes' => 'nullable']);
        $pr = PurchaseRequisition::create($d + ['id' => PurchaseRequisition::nextId('PR-2026-'), 'created' => Erp::today()]);
        Activity::log("Purchase requirement {$pr->id} created", 'po');
        return response()->json($pr, 201);
    }

    public function orders()
    {
        $sup = Supplier::pluck('name', 'id');
        return PurchaseOrder::orderByDesc('id')->get()->map(fn ($po) => $po->toArray() + [
            'supplier' => $sup[$po->supplier_id] ?? '—',
            'total' => collect($po->items)->sum(fn ($i) => $i['qty'] * $i['price']),
        ]);
    }

    public function storeOrder(Request $r)
    {
        $d = $r->validate(['supplier_id' => 'required|exists:suppliers,id', 'items' => 'required|array|min:1', 'items.*.material_id' => 'required|exists:materials,id',
            'items.*.qty' => 'required|numeric|gt:0', 'items.*.price' => 'required|numeric|min:0', 'expected' => 'nullable|date',
            'warehouse' => 'nullable|string', 'notes' => 'nullable|string', 'req_id' => 'nullable|exists:purchase_requisitions,id']);
        $items = collect($d['items'])->map(fn ($i) => $i + ['received' => 0])->all();
        $po = PurchaseOrder::create(['id' => PurchaseOrder::nextId('PO-2026-'), 'supplier_id' => $d['supplier_id'], 'items' => $items,
            'expected' => $d['expected'] ?? null, 'warehouse' => $d['warehouse'] ?? 'RM-WH', 'notes' => $d['notes'] ?? '', 'status' => 'Draft', 'created' => Erp::today()]);
        if (! empty($d['req_id'])) {
            PurchaseRequisition::find($d['req_id'])->update(['status' => 'PO Created', 'po_id' => $po->id]);
        }
        Activity::log("Purchase order {$po->id} created (draft)", 'po');
        return response()->json($po, 201);
    }

    public function setStatus(Request $r, string $id)
    {
        $d = $r->validate(['status' => 'required|in:'.implode(',', Erp::PO_STATUSES)]);
        $po = PurchaseOrder::findOrFail($id);
        $po->update($d);
        Activity::log("Purchase order $id → {$d['status']}", 'po');
        return $po;
    }
}
