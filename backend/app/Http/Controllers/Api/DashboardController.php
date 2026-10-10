<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Material;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductionPlan;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use App\Support\Erp;

class DashboardController extends Controller
{
    public function index()
    {
        $sys = Erp::system();
        $orders = Order::where('cancelled', false)->get();
        $plans = ProductionPlan::all();
        $today = Erp::today();
        $att = Attendance::where('date', $today)->get();
        $low = Material::all()->filter(fn ($m) => $m->status !== 'Healthy');
        $trend = $this->salesTrend();

        return [
            'as_of' => $today,
            'kpis' => [
                'sales_30d' => array_sum(array_column($trend, 'revenue')) + ($sys['sales_adj'] ?? 0),
                'open_orders' => $orders->where('step', '<', 6)->count(),
                'output_today' => $sys['output_today'] ?? 0,
                'active_plans' => $plans->where('status', 'In Progress')->count(),
                'low_stock' => $low->count(),
                'critical_stock' => $low->where('status', 'Critical')->count(),
                'pending_pos' => PurchaseOrder::whereIn('status', ['Draft', 'Approved', 'Ordered', 'Partially Received'])->count(),
                'pending_requisitions' => PurchaseRequisition::where('status', 'Pending Purchase')->count(),
                'employees' => Employee::where('status', 'Active')->count(),
                'present_today' => $att->whereIn('status', ['Present', 'Late'])->count(),
                'attendance_rate' => $att->count() ? round($att->whereIn('status', ['Present', 'Late'])->count() / $att->count() * 100, 1) : 0,
                'finished_goods' => Product::sum('stock'),
            ],
            'sales_trend' => $trend,
            'production_by_stage' => collect(Erp::PLAN_STAGES)->map(fn ($s) => ['stage' => $s, 'plans' => $plans->where('stage', $s)->count()]),
            'orders_by_status' => $orders->groupBy(fn ($o) => Erp::orderStatus($o))->map->count(),
            'low_stock_items' => $low->sortBy('on_hand')->take(6)->values(),
            'recent_orders' => Order::orderByDesc('id')->limit(5)->get()->map(fn ($o) => Erp::presentOrder($o)),
            'activities' => Activity::orderByDesc('id')->limit(8)->get(),
        ];
    }

    /** 30 days of revenue (deterministic demo curve, same as the original app). */
    private function salesTrend(): array
    {
        $seed = 20261008 + 17;
        $rnd = function () use (&$seed) {
            $seed = ($seed * 1664525 + 1013904223) % 4294967296;
            return $seed / 4294967296;
        };
        $raw = [];
        for ($i = 0; $i < 29; $i++) $raw[] = 300000 + $rnd() * 300000 + ($i % 7 === 5 ? 90000 : 0);
        $total = array_sum($raw);
        $vals = array_map(fn ($v) => (int) round($v / $total * 12365000 / 1000) * 1000, $raw);
        $vals[] = 485000;
        $out = [];
        foreach ($vals as $i => $v) {
            $out[] = ['date' => date('M j', strtotime("2026-09-09 +$i days")), 'revenue' => $v, 'orders' => (int) round($v / 6800 + $rnd() * 6)];
        }
        return $out;
    }
}
