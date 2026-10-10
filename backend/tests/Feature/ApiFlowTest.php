<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_dashboard_and_lists_load(): void
    {
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('kpis.employees', 126);
        $this->getJson('/api/products')->assertOk()->assertJsonCount(6);
        $this->getJson('/api/inventory/low-stock')->assertOk();
    }

    public function test_receiving_material_updates_stock_and_po(): void
    {
        $this->postJson('/api/inventory/receive', ['material_id' => 'm7', 'qty' => 1000, 'warehouse' => 'RM-WH', 'po_id' => 'PO-2026-016'])
            ->assertOk()->assertJsonPath('on_hand', 5500);
        $po = $this->getJson('/api/procurement/orders')->json();
        $this->assertSame('PO-2026-016', collect($po)->firstWhere('id', 'PO-2026-016')['id']);
    }

    public function test_production_flow_adds_finished_goods(): void
    {
        $before = $this->getJson('/api/products/p1')->json('stock');
        $id = $this->postJson('/api/manufacturing/plans', ['product_id' => 'p1', 'target' => 100, 'start' => '2026-10-12', 'end' => '2026-10-20'])->assertCreated()->json('id');
        foreach ([['start', []], ['record-cutting', ['qty' => 100]], ['record-sewing', ['qty' => 100]], ['record-finishing', ['qty' => 100]],
            ['complete-qc', ['inspected' => 100, 'rejected' => 4]], ['move-to-fg', []]] as [$action, $body]) {
            $this->postJson("/api/manufacturing/plans/$id/$action", $body)->assertOk();
        }
        $this->assertSame($before + 96, $this->getJson('/api/products/p1')->json('stock'));
    }

    public function test_leave_approval_reduces_balance(): void
    {
        $this->putJson('/api/hr/leaves/LV-2041/decision', ['status' => 'Approved'])->assertOk();
        $this->assertSame(8, $this->getJson('/api/hr/employees/EMP-003')->json('leave.casual'));
    }

    public function test_order_cannot_be_allocated_without_stock(): void
    {
        $this->postJson('/api/merchandising/orders', ['buyer_po' => 'T', 'buyer' => 'B-001', 'ship_date' => '2026-12-01', 'lines' => [['productId' => 'p3', 'variant' => 'L / Grey', 'qty' => 99999]]])->assertCreated();
        $id = $this->getJson('/api/merchandising/orders')->json('0.id');
        foreach (range(1, 3) as $_) $this->postJson("/api/merchandising/orders/$id/advance")->assertOk();
        $this->postJson("/api/merchandising/orders/$id/advance")->assertStatus(422);
    }
}
