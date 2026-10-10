<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\BomItem;
use App\Models\Material;
use App\Models\Product;
use App\Support\Erp;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function index(Request $r)
    {
        return Product::query()
            ->when($r->query('q'), fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('sku', 'like', "%$s%")))
            ->when($r->query('category'), fn ($q, $v) => $q->where('category', $v))
            ->when($r->query('status'), fn ($q, $v) => $q->where('status', $v))
            ->orderByDesc('updated')->get();
    }

    public function show(string $id)
    {
        $p = Product::findOrFail($id);
        return $p->toArray() + ['bom' => $this->bomFor($id), 'reserved' => Erp::reservedFor($id)];
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'name' => 'required|string|max:150', 'sku' => 'required|string|max:50|unique:products,sku',
            'category' => 'required|string', 'brand' => 'required|string', 'description' => 'nullable|string',
            'status' => 'nullable|in:Active,Draft,Inactive', 'price' => 'required|numeric|min:0', 'export_price' => 'nullable|numeric|min:0',
            'reorder' => 'nullable|integer|min:0', 'stock' => 'nullable|integer|min:0', 'variants' => 'nullable|array',
        ]);
        $p = Product::create($d + ['id' => 'p'.time().random_int(10, 99), 'updated' => Erp::today()]);
        Activity::log("New product created: {$p->name} (".count($p->variants ?? []).' variants)', 'prod');
        return response()->json($p, 201);
    }

    public function update(Request $r, string $id)
    {
        $p = Product::findOrFail($id);
        $p->update($r->only(['name', 'category', 'brand', 'description', 'status', 'price', 'export_price', 'reorder', 'variants']) + ['updated' => Erp::today()]);
        return $p;
    }

    public function destroy(string $id)
    {
        Product::findOrFail($id)->delete();
        BomItem::where('product_id', $id)->delete();
        return response()->noContent();
    }

    public function duplicate(string $id)
    {
        $src = Product::findOrFail($id);
        $copy = $src->replicate();
        $copy->id = 'p'.time().random_int(10, 99);
        $copy->name = $src->name.' (Copy)';
        $copy->status = 'Draft';
        $copy->stock = 0;
        $copy->sku = $src->sku.'-C';
        $copy->variants = collect($src->variants)->map(fn ($v) => ['id' => $copy->id.'-'.$v['sku'], 'sku' => $v['sku'].'-C'] + $v)->all();
        $copy->updated = Erp::today();
        $copy->save();
        return response()->json($copy, 201);
    }

    public function bom(string $id)
    {
        return $this->bomFor($id);
    }

    public function saveBom(Request $r, string $id)
    {
        Product::findOrFail($id);
        $rows = $r->validate(['lines' => 'present|array', 'lines.*.material_id' => 'required|exists:materials,id', 'lines.*.qty' => 'required|numeric|min:0', 'lines.*.unit' => 'required|string'])['lines'];
        BomItem::where('product_id', $id)->delete();
        foreach ($rows as $l) BomItem::create($l + ['product_id' => $id]);
        return $this->bomFor($id);
    }

    private function bomFor(string $id)
    {
        $mats = Material::all()->keyBy('id');
        return BomItem::where('product_id', $id)->get()->map(fn ($b) => [
            'material_id' => $b->material_id, 'material' => $mats[$b->material_id]->name ?? $b->material_id,
            'qty' => $b->qty, 'unit' => $b->unit, 'unit_cost' => $mats[$b->material_id]->unit_cost ?? 0,
        ]);
    }

    public function categories()
    {
        return Product::selectRaw('category as name, count(*) as products, sum(stock) as stock')->groupBy('category')->get();
    }

    public function brands()
    {
        return Product::selectRaw('brand as name, count(*) as products, sum(stock) as stock')->groupBy('brand')->get();
    }

    public function attributes()
    {
        $attrs = [];
        foreach (Product::all() as $p) {
            foreach ($p->variants ?? [] as $v) {
                foreach ($v['combo'] ?? [] as $k => $val) $attrs[$k][$val] = true;
            }
        }
        return collect($attrs)->map(fn ($vals, $name) => ['name' => $name, 'values' => array_keys($vals)])->values();
    }
}
