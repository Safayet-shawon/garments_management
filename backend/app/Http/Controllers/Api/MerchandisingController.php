<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Buyer;
use App\Models\Country;
use App\Models\Order;
use App\Models\Product;
use App\Support\Erp;
use Illuminate\Http\Request;

class MerchandisingController extends Controller
{
    public function orders(Request $r)
    {
        return Order::orderByDesc('id')->get()->map(fn ($o) => Erp::presentOrder($o))
            ->when($r->query('status'), fn ($c, $s) => $c->where('status', $s))->values();
    }

    public function order(string $id)
    {
        return Erp::presentOrder(Order::findOrFail($id));
    }

    public function storeOrder(Request $r)
    {
        $d = $r->validate(['buyer_po' => 'required', 'buyer' => 'required|exists:buyers,id', 'date' => 'nullable|date', 'ship_date' => 'required|date',
            'lines' => 'required|array|min:1', 'lines.*.productId' => 'required|exists:products,id', 'lines.*.variant' => 'required', 'lines.*.qty' => 'required|integer|gt:0']);
        $buyer = Buyer::find($d['buyer']);
        $products = Product::all()->keyBy('id');
        $lines = collect($d['lines'])->map(function ($l) use ($products) {
            $p = $products[$l['productId']];
            $v = collect($p->variants)->firstWhere('name', $l['variant']) ?? $p->variants[0];
            return ['productId' => $p->id, 'sku' => $v['sku'], 'variant' => $v['name'], 'qty' => (int) $l['qty'], 'price' => $p->export_price];
        })->all();
        $o = Order::create(['id' => Order::nextId('WA-2026-', 4), 'buyer_po' => $d['buyer_po'], 'buyer' => $buyer->id, 'date' => $d['date'] ?? Erp::today(),
            'ship_date' => $d['ship_date'], 'country' => $buyer->country, 'merchandiser' => $buyer->merchandiser, 'term' => $buyer->term, 'lines' => $lines, 'step' => 0, 'cancelled' => false]);
        Activity::log("New buyer order {$o->id} received ({$o->buyer_po})", 'po');
        return response()->json(Erp::presentOrder($o), 201);
    }

    public function advance(string $id)
    {
        $o = Order::findOrFail($id);
        abort_if($o->cancelled || $o->step >= 7, 422, 'Order cannot be advanced.');
        $next = $o->step + 1;
        if ($next === 4) {
            foreach (collect($o->lines)->groupBy('productId') as $pid => $lines) {
                $p = Product::find($pid);
                $need = $lines->sum('qty');
                $avail = $p->stock - Erp::reservedFor($pid, $o->id);
                if ($avail < $need) {
                    return response()->json(['message' => "Not enough finished {$p->name}: ".number_format($avail).' available, '.number_format($need).' needed. Complete production first.'], 422);
                }
            }
        }
        if ($next === 6) {
            foreach ($o->lines as $l) {
                $p = Product::find($l['productId']);
                $p->stock = max(0, $p->stock - $l['qty']);
                $p->save();
            }
            Erp::patchSystem(['sales_adj' => (Erp::system()['sales_adj'] ?? 0) + Erp::orderValue($o)]);
        }
        $o->step = $next;
        $o->save();
        Activity::log("Order $id → ".Erp::ORDER_STEPS[$next], 'po');
        return Erp::presentOrder($o);
    }

    public function cancel(string $id)
    {
        $o = Order::findOrFail($id);
        abort_if($o->step >= 6, 422, 'Shipped orders cannot be cancelled.');
        $o->update(['cancelled' => true]);
        return Erp::presentOrder($o);
    }

    public function buyers()
    {
        $orders = Order::where('cancelled', false)->get()->groupBy('buyer');
        return Buyer::orderBy('id')->get()->map(fn ($b) => $b->toArray() + [
            'orders' => count($orders[$b->id] ?? []), 'value' => collect($orders[$b->id] ?? [])->sum(fn ($o) => Erp::orderValue($o)),
        ]);
    }

    public function storeBuyer(Request $r)
    {
        $d = $r->validate(['name' => 'required', 'type' => 'required', 'country' => 'required|exists:countries,code', 'contact' => 'nullable', 'email' => 'nullable|email', 'merchandiser' => 'nullable', 'term' => 'nullable']);
        $b = Buyer::create($d + ['id' => Buyer::nextId('B-'), 'status' => 'Active']);
        Activity::log("New buyer added: {$b->name}", 'sup');
        return response()->json($b, 201);
    }

    public function countries()
    {
        $orders = Order::where('cancelled', false)->get()->groupBy('country');
        return Country::orderBy('name')->get()->map(fn ($c) => $c->toArray() + ['orders' => count($orders[$c->code] ?? [])]);
    }

    public function storeCountry(Request $r)
    {
        $d = $r->validate(['code' => 'required|size:2|unique:countries,code', 'name' => 'required', 'region' => 'required', 'currency' => 'required', 'port' => 'required']);
        $c = Country::create($d);
        Activity::log("New destination country added: {$c->name}", 'sup');
        return response()->json($c, 201);
    }

    public function shipments()
    {
        $countries = Country::all()->keyBy('code');
        return Order::where('cancelled', false)->where('step', '>=', 4)->orderBy('ship_date')->get()->map(fn ($o) => [
            'order_id' => $o->id, 'buyer' => $o->buyer, 'country' => $o->country, 'port' => $countries[$o->country]->port ?? null,
            'ship_date' => $o->ship_date, 'status' => Erp::orderStatus($o), 'step_name' => Erp::ORDER_STEPS[$o->step],
            'quantity' => collect($o->lines)->sum('qty'), 'value' => Erp::orderValue($o),
        ]);
    }
}
