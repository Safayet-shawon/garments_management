<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Attendance;
use App\Models\BomItem;
use App\Models\Buyer;
use App\Models\Country;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\Material;
use App\Models\Order;
use App\Models\PayrollRun;
use App\Models\Product;
use App\Models\ProductionPlan;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

/**
 * Loads the same demo data set that the original Winner Apparels app shipped with.
 */
class DatabaseSeeder extends Seeder
{
    private int $seed = 20261008;

    private function rnd(): float
    {
        $this->seed = ($this->seed * 1664525 + 1013904223) % 4294967296;
        return $this->seed / 4294967296;
    }

    private function pick(array $a)
    {
        return $a[(int) floor($this->rnd() * count($a))];
    }

    public function run(): void
    {
        $this->users();
        $this->warehouses();
        $this->suppliers();
        $this->materials();
        $this->products();
        $this->bom();
        $this->movements();
        $this->requisitions();
        $this->purchaseOrders();
        $this->plans();
        $this->employees();
        $this->leaves();
        $this->payroll();
        $this->countries();
        $this->buyersAndOrders();
        $this->activities();
        Setting::put('system', [
            'company' => 'Winner Apparels Ltd.', 'factory' => 'Gazipur Factory', 'currency' => 'BDT',
            'today' => '2026-10-08', 'payroll_stage' => 2, 'output_today' => 2350, 'sales_adj' => 0,
        ]);
    }

    private function users(): void
    {
        foreach ([
            ['Safayet Shawon', 'admin@winnerapparels.com', 'Admin'],
            ['Tanvir Hossain', 'tanvir@winnerapparels.com', 'Manager'],
            ['Sadia Rahman', 'sadia@winnerapparels.com', 'Store Keeper'],
            ['Nusrat Jahan', 'nusrat@winnerapparels.com', 'QC Inspector'],
        ] as [$name, $email, $role]) {
            User::create(['name' => $name, 'email' => $email, 'role' => $role, 'password' => 'password']);
        }
    }

    private function warehouses(): void
    {
        foreach ([
            ['w1', 'MF-WH', 'Main Factory Warehouse', 'Dhaka', 'Production Floor Store'],
            ['w2', 'FG-WH', 'Finished Goods Warehouse', 'Gazipur', 'Finished Goods'],
            ['w3', 'RM-WH', 'Raw Material Warehouse', 'Narayanganj', 'Raw Material'],
        ] as [$id, $code, $name, $loc, $type]) {
            Warehouse::create(compact('id', 'code', 'name', 'type') + ['location' => $loc]);
        }
    }

    private function suppliers(): void
    {
        foreach ([
            ['s1', 'Bengal Textile Mills', 'Fabric Manufacturer', 'Abdul Karim', '+880 17XX-XXXXXX', 'Dhaka', 4.8, 'Active'],
            ['s2', 'Dhaka Fabric House', 'Fabric Supplier', 'Shahidul Islam', '+880 18XX-XXXXXX', 'Dhaka', 4.5, 'Active'],
            ['s3', 'Prime Accessories Ltd.', 'Accessories Supplier', 'Farhana Akter', '+880 19XX-XXXXXX', 'Gazipur', 4.6, 'Active'],
            ['s4', 'Metro Packaging', 'Packaging Supplier', 'Jamal Uddin', '+880 16XX-XXXXXX', 'Narayanganj', 4.4, 'Active'],
            ['s5', 'National Thread Supply', 'Thread Supplier', 'Rafiq Mia', '+880 15XX-XXXXXX', 'Chattogram', 4.7, 'Active'],
            ['s6', 'Rupsha Denim Mills', 'Fabric Manufacturer', 'Sohel Rana', '+880 17XX-XXXXXX', 'Narayanganj', 4.3, 'Active'],
            ['s7', 'Padma Trims & Labels', 'Accessories Supplier', 'Rokeya Begum', '+880 13XX-XXXXXX', 'Dhaka', 4.1, 'Inactive'],
        ] as [$id, $name, $type, $contact, $phone, $location, $rating, $status]) {
            Supplier::create(compact('id', 'name', 'type', 'contact', 'phone', 'location', 'rating', 'status'));
        }
    }

    private function materials(): void
    {
        // id, name, sku, warehouse, unit, onHand, reserved, reorder, critical, unitCost, supplier
        foreach ([
            ['m1', 'Cotton Fabric', 'FAB-COT-001', 'RM-WH', 'kg', 4800, 0, 5000, 2000, 595, 's1'],
            ['m2', 'Polyester Fabric', 'FAB-POL-001', 'RM-WH', 'kg', 6200, 800, 3000, 1200, 380, 's2'],
            ['m3', 'Rib Fabric', 'FAB-RIB-001', 'RM-WH', 'kg', 1850, 0, 1500, 600, 450, 's2'],
            ['m4', 'Denim Fabric', 'FAB-DEN-001', 'RM-WH', 'kg', 3100, 400, 2500, 1000, 700, 's6'],
            ['m5', 'Black Thread', 'THR-BLK-001', 'RM-WH', 'm', 80000, 10000, 40000, 15000, 0.35, 's5'],
            ['m6', 'White Thread', 'THR-WHT-001', 'RM-WH', 'm', 52000, 0, 40000, 15000, 0.35, 's5'],
            ['m7', 'Neck Label', 'LAB-NECK-001', 'RM-WH', 'pcs', 4500, 0, 5000, 1500, 3.5, 's3'],
            ['m8', 'Size Label', 'LAB-SIZE-001', 'RM-WH', 'pcs', 5500, 0, 3000, 1000, 2.5, 's3'],
            ['m9', 'Hang Tag', 'TAG-001', 'MF-WH', 'pcs', 8000, 0, 4000, 1500, 4, 's3'],
            ['m10', 'Poly Bag', 'BAG-001', 'RM-WH', 'pcs', 10000, 0, 5000, 2000, 5, 's4'],
            ['m11', 'Carton', 'CTN-001', 'MF-WH', 'pcs', 900, 0, 600, 250, 65, 's4'],
            ['m12', 'Hoodie Zipper', 'ZIP-HOD-001', 'RM-WH', 'pcs', 700, 0, 1500, 800, 28, 's3'],
            ['m13', 'Drawcord', 'ACC-DRW-001', 'RM-WH', 'm', 2200, 0, 3000, 1200, 6, 's3'],
            ['m14', 'Button (4-hole)', 'ACC-BTN-001', 'RM-WH', 'pcs', 12000, 0, 6000, 2000, 1.5, 's3'],
        ] as [$id, $name, $sku, $wh, $unit, $on, $res, $re, $cr, $cost, $sup]) {
            Material::create(['id' => $id, 'name' => $name, 'sku' => $sku, 'warehouse' => $wh, 'unit' => $unit,
                'on_hand' => $on, 'reserved' => $res, 'reorder' => $re, 'critical' => $cr, 'unit_cost' => $cost, 'supplier_id' => $sup]);
        }
    }

    private const COLOR_CODES = ['Green' => 'GRN', 'White' => 'WHT', 'Black' => 'BLK', 'Blue' => 'BLU', 'Navy' => 'NVY', 'Grey' => 'GRY',
        'Red' => 'RED', 'Khaki' => 'KHK', 'Olive' => 'OLV', 'Indigo' => 'IND', 'Maroon' => 'MRN', 'Beige' => 'BGE', 'Charcoal' => 'CHR'];

    private function abbr(string $v): string
    {
        if (isset(self::COLOR_CODES[$v])) return self::COLOR_CODES[$v];
        if (strlen($v) <= 3 || preg_match('/\d/', $v)) return strtoupper(str_replace(' ', '', $v));
        $a = strtoupper(substr(preg_replace('/[aeiou\s]/i', '', $v), 0, 3));
        return $a ?: strtoupper(substr($v, 0, 3));
    }

    private function products(): void
    {
        $sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        $export = ['p1' => 4.2, 'p2' => 5.8, 'p3' => 11.5, 'p4' => 8.4, 'p5' => 9.2, 'p6' => 7.6];
        // id, name, category, brand, sku, attrs, purchase, selling, stock, reorder, description, updated
        foreach ([
            ['p1', 'Premium Cotton T-Shirt', 'T-Shirts', 'Nexora Basics', 'NXR-TS', ['Size' => $sizes, 'Color' => ['Green', 'White', 'Black']], 420, 850, 4250, 2000, '180 GSM combed cotton crew-neck tee with reinforced collar.', '2026-10-07'],
            ['p2', 'Classic Polo Shirt', 'Polo Shirts', 'Nexora Basics', 'NXR-PL', ['Size' => ['S', 'M', 'L', 'XL'], 'Color' => ['Navy', 'White', 'Black']], 520, 1150, 2840, 1500, 'Pique cotton polo with two-button placket.', '2026-10-06'],
            ['p3', 'Premium Hoodie', 'Hoodies', 'Nexora Basics', 'NXR-HD', ['Size' => ['M', 'L', 'XL'], 'Color' => ['Grey', 'Black', 'Navy']], 880, 1950, 1120, 1500, 'Fleece-lined pullover hoodie with kangaroo pocket.', '2026-10-05'],
            ['p4', 'Denim Shirt', 'Shirts', 'Urbano Denim', 'URB-DS', ['Size' => ['S', 'M', 'L', 'XL'], 'Color' => ['Blue', 'Indigo']], 760, 1650, 3210, 1200, 'Washed denim casual shirt with snap buttons.', '2026-10-02'],
            ['p5', 'Casual Chino', 'Trousers', 'Urbano Denim', 'URB-CH', ['Size' => ['30', '32', '34', '36'], 'Color' => ['Khaki', 'Navy', 'Olive']], 690, 1490, 3900, 1500, 'Slim-fit stretch chino trousers.', '2026-09-29'],
            ['p6', 'Basic Sweatshirt', 'Sweatshirts', 'Nexora Basics', 'NXR-SW', ['Size' => ['S', 'M', 'L', 'XL'], 'Color' => ['Grey', 'Maroon', 'Black']], 620, 1350, 3100, 1500, 'Brushed-back crew-neck sweatshirt.', '2026-09-27'],
        ] as [$id, $name, $cat, $brand, $sku, $attrs, $purchase, $selling, $stock, $reorder, $desc, $updated]) {
            $combos = [[]];
            foreach ($attrs as $k => $vals) {
                $next = [];
                foreach ($combos as $c) foreach ($vals as $v) $next[] = $c + [$k => $v];
                $combos = $next;
            }
            $variants = [];
            foreach ($combos as $i => $c) {
                $variants[] = [
                    'id' => "$id-v$i", 'name' => implode(' / ', $c), 'combo' => $c,
                    'sku' => implode('-', array_merge([$sku], array_map(fn ($v) => $this->abbr($v), $c))),
                    'purchase' => $purchase, 'selling' => $selling, 'status' => 'Active',
                ];
            }
            Product::create(['id' => $id, 'name' => $name, 'sku' => $sku, 'category' => $cat, 'brand' => $brand, 'description' => $desc,
                'variants' => $variants, 'stock' => $stock, 'price' => $selling, 'export_price' => $export[$id], 'reorder' => $reorder, 'updated' => $updated]);
        }
    }

    private function bom(): void
    {
        $bom = [
            'p1' => [['m1', 1.2, 'kg'], ['m5', 15, 'm'], ['m7', 1, 'pcs'], ['m8', 1, 'pcs'], ['m10', 1, 'pcs'], ['m9', 1, 'pcs']],
            'p2' => [['m1', 0.95, 'kg'], ['m6', 18, 'm'], ['m14', 2, 'pcs'], ['m7', 1, 'pcs'], ['m10', 1, 'pcs'], ['m9', 1, 'pcs']],
            'p3' => [['m2', 0.8, 'kg'], ['m3', 0.15, 'kg'], ['m5', 30, 'm'], ['m12', 1, 'pcs'], ['m13', 1.2, 'm'], ['m10', 1, 'pcs']],
            'p4' => [['m4', 1.1, 'kg'], ['m6', 25, 'm'], ['m14', 8, 'pcs'], ['m8', 1, 'pcs'], ['m10', 1, 'pcs']],
            'p5' => [['m4', 0.9, 'kg'], ['m6', 28, 'm'], ['m14', 5, 'pcs'], ['m8', 1, 'pcs'], ['m10', 1, 'pcs']],
            'p6' => [['m2', 0.7, 'kg'], ['m3', 0.12, 'kg'], ['m5', 24, 'm'], ['m7', 1, 'pcs'], ['m10', 1, 'pcs']],
        ];
        foreach ($bom as $pid => $rows) {
            foreach ($rows as [$mid, $qty, $unit]) {
                BomItem::create(['product_id' => $pid, 'material_id' => $mid, 'qty' => $qty, 'unit' => $unit]);
            }
        }
    }

    private function movements(): void
    {
        $users = ['Sadia Rahman', 'Mehedi Hasan', 'Tanvir Hossain', 'Karim Hasan'];
        $rows = [
            ['2026-10-08', 'FAB-COT-001', 'Cotton Fabric', 'RM-WH', 'PRODUCTION_CONSUMPTION', -1250, 'kg', 'PP-2026-001'],
            ['2026-10-08', 'NXR-TS-M-BLK', 'Premium Cotton T-Shirt', 'FG-WH', 'PRODUCTION_OUTPUT', 600, 'pcs', 'PP-2026-004'],
            ['2026-10-07', 'THR-BLK-001', 'Black Thread', 'RM-WH', 'ISSUE', -10000, 'm', 'PP-2026-001'],
            ['2026-10-07', 'FAB-DEN-001', 'Denim Fabric', 'RM-WH', 'RECEIPT', 1200, 'kg', 'PO-2026-015'],
            ['2026-10-06', 'LAB-NECK-001', 'Neck Label', 'RM-WH', 'ADJUSTMENT', -120, 'pcs', 'ADJ-0042 (damaged)'],
            ['2026-10-06', 'FAB-POL-001', 'Polyester Fabric', 'RM-WH', 'RECEIPT', 2000, 'kg', 'PO-2026-014'],
            ['2026-10-05', 'CTN-001', 'Carton', 'MF-WH', 'TRANSFER', 300, 'pcs', 'TRF-0019 RM-WH → MF-WH'],
            ['2026-10-05', 'NXR-PL-L-NVY', 'Classic Polo Shirt', 'FG-WH', 'RETURN', 24, 'pcs', 'ORD-10198 return'],
            ['2026-10-04', 'ACC-BTN-001', 'Button (4-hole)', 'RM-WH', 'RECEIPT', 8000, 'pcs', 'PO-2026-013'],
            ['2026-10-03', 'FAB-COT-001', 'Cotton Fabric', 'RM-WH', 'ISSUE', -900, 'kg', 'PP-2026-002'],
            ['2026-10-02', 'URB-DS-M-BLU', 'Denim Shirt', 'FG-WH', 'PRODUCTION_OUTPUT', 1500, 'pcs', 'PP-2026-004'],
            ['2026-10-01', 'BAG-001', 'Poly Bag', 'RM-WH', 'RECEIPT', 10000, 'pcs', 'PO-2026-012'],
        ];
        foreach ($rows as $i => [$date, $sku, $item, $wh, $type, $qty, $unit, $ref]) {
            StockMovement::create(['id' => "mv$i", 'date' => $date, 'sku' => $sku, 'item' => $item, 'warehouse' => $wh, 'type' => $type,
                'qty' => $qty, 'unit' => $unit, 'ref' => $ref, 'user' => $users[$i % 4]]);
        }
    }

    private function requisitions(): void
    {
        foreach ([
            ['PR-2026-011', 'm12', 1500, 'Reorder – Premium Hoodie line', 's3', '2026-10-18', 'High', '2026-10-06'],
            ['PR-2026-012', 'm13', 2000, 'Production Plan PP-2026-003', 's3', '2026-10-16', 'Normal', '2026-10-07'],
            ['PR-2026-013', 'm3', 800, 'Safety stock top-up', 's2', '2026-10-20', 'Low', '2026-10-07'],
        ] as [$id, $m, $qty, $reason, $sup, $exp, $prio, $created]) {
            PurchaseRequisition::create(['id' => $id, 'material_id' => $m, 'qty' => $qty, 'reason' => $reason, 'supplier_id' => $sup,
                'expected' => $exp, 'priority' => $prio, 'created' => $created]);
        }
    }

    private function purchaseOrders(): void
    {
        $i = fn ($m, $q, $p, $r) => ['material_id' => $m, 'qty' => $q, 'price' => $p, 'received' => $r];
        foreach ([
            ['PO-2026-018', 's2', [$i('m2', 2000, 480, 0), $i('m3', 1000, 600, 0)], '2026-10-22', 'Fabric for Q4 hoodie and sweatshirt runs', 'Draft', '2026-10-07'],
            ['PO-2026-017', 's5', [$i('m5', 60000, 0.35, 0), $i('m6', 40000, 0.35, 0)], '2026-10-14', '', 'Ordered', '2026-10-04'],
            ['PO-2026-016', 's3', [$i('m7', 10000, 3.5, 4000), $i('m8', 10000, 2.5, 4000)], '2026-10-12', '', 'Partially Received', '2026-10-01'],
            ['PO-2026-015', 's6', [$i('m4', 1200, 640, 1200)], '2026-10-07', '', 'Received', '2026-09-28'],
            ['PO-2026-014', 's2', [$i('m2', 2000, 380, 2000)], '2026-10-06', '', 'Closed', '2026-09-25'],
            ['PO-2026-013', 's3', [$i('m14', 8000, 1.5, 8000)], '2026-10-04', '', 'Closed', '2026-09-22'],
            ['PO-2026-012', 's4', [$i('m10', 10000, 5, 10000)], '2026-10-01', '', 'Closed', '2026-09-18'],
        ] as [$id, $sup, $items, $exp, $notes, $status, $created]) {
            PurchaseOrder::create(['id' => $id, 'supplier_id' => $sup, 'items' => $items, 'expected' => $exp, 'notes' => $notes, 'status' => $status, 'created' => $created]);
        }
    }

    private function plans(): void
    {
        // id, product, target, cut, sewn, finished, stage, status, start, end, supervisor, team, extras
        $rows = [
            ['PP-2026-001', 'p1', 5000, 4200, 3850, 3600, 'Sewing', 'In Progress', '2026-10-01', '2026-10-15', 'Rahim Ahmed', 'Line A', ['priority' => 'High', 'issued' => 4500, 'waste_kg' => 120, 'notes' => 'Autumn collection – Nexora Basics']],
            ['PP-2026-002', 'p2', 3000, 3000, 2100, 1900, 'Finishing', 'In Progress', '2026-10-03', '2026-10-18', 'Karim Hasan', 'Line B', ['mat_issued' => true]],
            ['PP-2026-003', 'p3', 2500, 1900, 1050, 700, 'Cutting', 'In Progress', '2026-10-05', '2026-10-25', 'Tanvir Hossain', 'Line C', ['priority' => 'High', 'mat_issued' => true]],
            ['PP-2026-004', 'p4', 1500, 1500, 1500, 1500, 'Completed', 'Completed', '2026-09-18', '2026-10-02', 'Mehedi Hasan', 'Line D', ['mat_issued' => true, 'qc_status' => 'Moved to Finished Goods', 'qc_inspected' => 1500, 'qc_passed' => 1472, 'qc_rejected' => 28]],
            ['PP-2026-005', 'p5', 2000, 1200, 800, 400, 'Sewing', 'In Progress', '2026-10-04', '2026-10-22', 'Sadia Rahman', 'Line E', ['mat_issued' => true]],
            ['PP-2026-006', 'p6', 1800, 1800, 1500, 900, 'Finishing', 'In Progress', '2026-10-02', '2026-10-17', 'Karim Hasan', 'Line B', ['mat_issued' => true, 'qc_status' => 'Pending']],
            ['PP-2026-007', 'p4', 1200, 0, 0, 0, 'Material Check', 'Ready', '2026-10-12', '2026-10-28', 'Mehedi Hasan', 'Unassigned', []],
            ['PP-2026-008', 'p3', 1500, 0, 0, 0, 'Planned', 'Planned', '2026-10-20', '2026-11-08', 'Tanvir Hossain', 'Unassigned', []],
            ['PP-2026-009', 'p2', 2200, 0, 0, 0, 'Planned', 'Planned', '2026-10-24', '2026-11-12', 'Karim Hasan', 'Unassigned', []],
        ];
        foreach ($rows as [$id, $pid, $target, $cut, $sewn, $fin, $stage, $status, $start, $end, $sup, $team, $x]) {
            ProductionPlan::create($x + [
                'id' => $id, 'product_id' => $pid, 'target' => $target, 'issued' => min($target, (int) round($cut * 1.07)),
                'cut' => $cut, 'sewn' => $sewn, 'finished' => $fin, 'waste_kg' => (int) round($cut * 0.0286),
                'sew_reject' => (int) round($sewn * 0.01), 'stage' => $stage, 'status' => $status, 'start' => $start, 'end' => $end,
                'supervisor' => $sup, 'team' => $team, 'cutting_started' => $cut > 0, 'sewing_started' => $sewn > 0,
                'qc_inspector' => 'Nusrat Jahan',
            ]);
        }
    }

    private function employees(): void
    {
        $depts = [
            'Management' => 4, 'HR' => 5, 'Production' => 10, 'Cutting' => 14, 'Sewing' => 40, 'Finishing' => 18,
            'Quality Control' => 10, 'Warehouse' => 8, 'Procurement' => 5, 'Merchandising' => 7, 'Accounts' => 5,
        ];
        $jobs = [
            'Management' => [['Managing Director', 120000, 'Admin'], ['Factory Manager', 85000, 'Manager'], ['Operations Manager', 70000, 'Manager'], ['General Manager', 95000, 'Manager']],
            'HR' => [['HR Manager', 55000, 'HR Officer'], ['HR Executive', 28000, 'HR Officer'], ['Welfare Officer', 24000, 'HR Officer']],
            'Production' => [['Production Manager', 60000, 'Manager'], ['Line Supervisor', 32000, 'Supervisor'], ['Production Planner', 38000, 'Supervisor']],
            'Cutting' => [['Cutting Master', 34000, 'Supervisor'], ['Cutting Operator', 17500, 'Production Worker'], ['Fabric Spreader', 15000, 'Production Worker']],
            'Sewing' => [['Sewing Supervisor', 30000, 'Supervisor'], ['Line Leader', 22000, 'Supervisor'], ['Sewing Operator', 18000, 'Production Worker'], ['Helper', 13500, 'Production Worker']],
            'Finishing' => [['Finishing Supervisor', 28000, 'Supervisor'], ['Iron Operator', 16000, 'Production Worker'], ['Packer', 14000, 'Production Worker']],
            'Quality Control' => [['QC Manager', 48000, 'QC Inspector'], ['QC Inspector', 22000, 'QC Inspector']],
            'Warehouse' => [['Store Manager', 42000, 'Store Keeper'], ['Store Keeper', 22000, 'Store Keeper'], ['Loader', 13000, 'Store Keeper']],
            'Procurement' => [['Procurement Manager', 52000, 'Manager'], ['Purchase Officer', 30000, 'Accountant']],
            'Merchandising' => [['Head of Merchandising', 65000, 'Manager'], ['Senior Merchandiser', 42000, 'Merchandiser'], ['Merchandiser', 30000, 'Merchandiser'], ['Assistant Merchandiser', 22000, 'Merchandiser']],
            'Accounts' => [['Accounts Manager', 58000, 'Accountant'], ['Accountant', 30000, 'Accountant']],
        ];
        $male = explode('.', 'Rahim.Karim.Tanvir.Mehedi.Abdul.Rafiq.Jamal.Faruk.Shahidul.Imran.Sohel.Habib.Masud.Kamal.Nasir.Alamgir.Shamim.Rubel.Jahid.Arif.Sabbir.Anwar.Liton.Monir.Parvez.Ripon.Salam.Taslim');
        $female = ['Nusrat', 'Sadia', 'Farhana', 'Shirin', 'Rokeya', 'Morjina', 'Sumaiya', 'Laboni', 'Ruma', 'Shapla', 'Taslima', 'Rina', 'Moushumi', 'Jesmin', 'Salma', 'Nasrin', 'Popy', 'Sharmin', 'Rehana', 'Khadija', 'Halima', 'Rabeya'];
        $lastM = ['Ahmed', 'Hasan', 'Hossain', 'Islam', 'Khan', 'Mia', 'Uddin', 'Ali', 'Sarker', 'Rahman', 'Sheikh'];
        $lastF = ['Jahan', 'Rahman', 'Akter', 'Begum', 'Khatun', 'Sultana', 'Parvin', 'Yasmin'];
        $named = [['Rahim Ahmed', 'Sewing', 'Sewing Operator'], ['Karim Hasan', 'Production', 'Line Supervisor'], ['Nusrat Jahan', 'Quality Control', 'QC Inspector'],
            ['Tanvir Hossain', 'Production', 'Production Manager'], ['Mehedi Hasan', 'Cutting', 'Cutting Master'], ['Sadia Rahman', 'Warehouse', 'Store Keeper']];

        $used = [];
        $n = 0;
        $add = function (string $name, string $dept, string $designation) use (&$used, &$n, $jobs) {
            $job = collect($jobs[$dept])->first(fn ($j) => $j[0] === $designation) ?? end($jobs[$dept]);
            $n++;
            $joined = sprintf('%d-%02d-%02d', 2018 + (int) floor($this->rnd() * 8), 1 + (int) floor($this->rnd() * 12), 1 + (int) floor($this->rnd() * 28));
            $r = $this->rnd();
            $id = 'EMP-'.str_pad((string) $n, 3, '0', STR_PAD_LEFT);
            Employee::create([
                'id' => $id, 'name' => $name, 'dept' => $dept, 'designation' => $job[0], 'role' => $job[2], 'joined' => $joined,
                'type' => $r < .82 ? 'Permanent' : ($r < .94 ? 'Contract' : 'Probation'), 'status' => 'Active',
                'basic' => round($job[1] * (.95 + $this->rnd() * .15) / 100) * 100,
                'phone' => '+880 1'.$this->pick([7, 8, 9, 6, 5]).'XX-XXX'.str_pad((string) $n, 3, '0', STR_PAD_LEFT),
                'email' => strtolower(str_replace(' ', '.', $name)).'@winnerapparels.com',
                'leave' => ['casual' => 10, 'sick' => 14, 'annual' => 20],
                'perf' => ['output' => (int) round(120 + $this->rnd() * 180), 'rejectRate' => round(.5 + $this->rnd() * 2.5, 1), 'efficiency' => (int) round(78 + $this->rnd() * 20)],
            ]);
            $used[$name] = true;
        };
        $left = $depts;
        foreach ($named as [$name, $dept, $des]) {
            $add($name, $dept, $des);
            $left[$dept]--;
        }
        foreach ($left as $dept => $count) {
            $list = $jobs[$dept];
            for ($i = 0; $i < $count; $i++) {
                $hasHead = Employee::where('dept', $dept)->where('designation', $list[0][0])->exists();
                $des = (count($list) === 1 || ($i === 0 && ! $hasHead)) ? $list[0] : $list[min(count($list) - 1, 1 + (int) floor($this->rnd() * (count($list) - 1) * 1.6))];
                do {
                    $name = $this->rnd() < .42 ? $this->pick($female).' '.$this->pick($lastF) : $this->pick($male).' '.$this->pick($lastM);
                } while (isset($used[$name]));
                $add($name, $dept, $des[0]);
            }
        }

        // attendance for 5 working days
        $emps = Employee::pluck('id')->all();
        foreach (['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'] as $date) {
            foreach ($emps as $empId) {
                $r = $this->rnd();
                $status = $r < .86 ? 'Present' : ($r < .93 ? 'Late' : ($r < .97 ? 'Absent' : 'Leave'));
                $h = $status === 'Late' ? 9 : 8;
                $m = (int) floor($this->rnd() * 50);
                $o = (int) floor($this->rnd() * 40);
                $off = in_array($status, ['Absent', 'Leave']);
                $hours = $off ? 0 : round((1020 + $o - $h * 60 - $m) / 60, 1);
                Attendance::create(['date' => $date, 'emp_id' => $empId, 'status' => $status, 'hours' => $hours,
                    'in' => $off ? '—' : sprintf('%02d:%02d', $h, $m), 'out' => $off ? '—' : sprintf('17:%02d', $o)]);
            }
        }
    }

    private function leaves(): void
    {
        foreach ([
            ['LV-2041', 'EMP-003', 'Casual', '2026-10-10', '2026-10-11', 2, 'Pending', 'Family function in Rajshahi'],
            ['LV-2040', 'EMP-002', 'Sick', '2026-10-08', '2026-10-09', 2, 'Approved', 'Fever and rest advised by doctor'],
            ['LV-2039', 'EMP-010', 'Annual', '2026-10-19', '2026-10-23', 5, 'Pending', 'Annual vacation'],
            ['LV-2038', 'EMP-018', 'Casual', '2026-10-14', '2026-10-14', 1, 'Pending', 'Personal work'],
            ['LV-2037', 'EMP-025', 'Sick', '2026-10-05', '2026-10-06', 2, 'Approved', 'Medical check-up'],
            ['LV-2036', 'EMP-033', 'Casual', '2026-10-02', '2026-10-02', 1, 'Rejected', 'Production deadline – peak week'],
            ['LV-2035', 'EMP-047', 'Annual', '2026-11-02', '2026-11-06', 5, 'Approved', 'Hometown visit'],
            ['LV-2034', 'EMP-060', 'Sick', '2026-10-07', '2026-10-07', 1, 'Approved', 'Seasonal flu'],
        ] as [$id, $emp, $type, $from, $to, $days, $status, $reason]) {
            LeaveRequest::create(['id' => $id, 'emp_id' => $emp, 'type' => $type, 'from' => $from, 'to' => $to, 'days' => $days, 'status' => $status, 'reason' => $reason]);
        }
    }

    private function payroll(): void
    {
        foreach ([['September 2026', 124, 3590000, 179500, 3410500], ['August 2026', 121, 3482000, 171200, 3310800], ['July 2026', 120, 3455000, 168000, 3287000]] as [$m, $e, $g, $d, $n]) {
            PayrollRun::create(['month' => $m, 'employees' => $e, 'gross' => $g, 'deductions' => $d, 'net' => $n, 'status' => 'Paid']);
        }
    }

    private function countries(): void
    {
        foreach ([
            ['US', 'United States', 'North America', 'USD', 'New York / Savannah'], ['DE', 'Germany', 'Europe', 'EUR', 'Hamburg'],
            ['GB', 'United Kingdom', 'Europe', 'GBP', 'Felixstowe'], ['FR', 'France', 'Europe', 'EUR', 'Le Havre'],
            ['SE', 'Sweden', 'Europe', 'SEK', 'Gothenburg'], ['ES', 'Spain', 'Europe', 'EUR', 'Valencia'],
            ['IT', 'Italy', 'Europe', 'EUR', 'Genoa'], ['NL', 'Netherlands', 'Europe', 'EUR', 'Rotterdam'],
            ['CA', 'Canada', 'North America', 'CAD', 'Vancouver'], ['JP', 'Japan', 'Asia Pacific', 'JPY', 'Yokohama'],
            ['AU', 'Australia', 'Asia Pacific', 'AUD', 'Melbourne'], ['AE', 'United Arab Emirates', 'Middle East', 'AED', 'Jebel Ali'],
        ] as [$code, $name, $region, $cur, $port]) {
            Country::create(['code' => $code, 'name' => $name, 'region' => $region, 'currency' => $cur, 'port' => $port]);
        }
    }

    private function buyersAndOrders(): void
    {
        $merch = Employee::where('dept', 'Merchandising')->pluck('id')->values()->all();
        $buyers = [
            ['Northwind Apparel Co.', 'Retail Chain', 'US', 'Daniel Brooks', 'daniel.brooks@northwind-apparel.com', 'LC at sight'],
            ['Nordlicht Fashion GmbH', 'Brand', 'DE', 'Katrin Vogel', 'k.vogel@nordlicht-fashion.de', 'TT 60 days'],
            ['Thames & Co. Retail', 'Retail Chain', 'GB', 'Oliver Grant', 'oliver.grant@thamesco.co.uk', 'LC 90 days'],
            ['Maison Aurelle', 'Brand', 'FR', 'Camille Laurent', 'c.laurent@maison-aurelle.fr', 'TT 30 days'],
            ['Fjord Basics AB', 'Brand', 'SE', 'Elin Larsson', 'elin@fjordbasics.se', 'TT 60 days'],
            ['Costa Moda S.A.', 'Wholesaler', 'ES', 'Lucia Romero', 'lromero@costamoda.es', 'LC at sight'],
            ['Maple Leaf Outfitters', 'Retail Chain', 'CA', 'Ethan Clarke', 'e.clarke@mapleleafoutfitters.ca', 'TT 30 days'],
            ['Sakura Casual KK', 'Brand', 'JP', 'Hiroshi Tanaka', 'h.tanaka@sakuracasual.jp', 'LC at sight'],
        ];
        $byId = [];
        foreach ($buyers as $i => [$name, $type, $country, $contact, $email, $term]) {
            $id = 'B-'.str_pad((string) ($i + 1), 3, '0', STR_PAD_LEFT);
            $byId[$id] = Buyer::create(['id' => $id, 'name' => $name, 'type' => $type, 'country' => $country, 'contact' => $contact,
                'email' => $email, 'merchandiser' => $merch[$i % max(1, count($merch))] ?? null, 'term' => $term]);
        }

        $products = Product::all()->keyBy('id');
        $line = function (string $pid, string $variant, int $qty) use ($products) {
            $p = $products[$pid];
            $v = collect($p->variants)->firstWhere('name', $variant) ?? $p->variants[0];
            return ['productId' => $pid, 'sku' => $v['sku'], 'variant' => $v['name'], 'qty' => $qty, 'price' => $p->export_price];
        };
        // id, buyer PO, buyer, date, ship date, lines, step (-1 = cancelled)
        foreach ([
            ['WA-2026-0231', 'NW-PO-88412', 'B-001', '2026-10-08', '2026-11-20', [$line('p1', 'M / Black', 1200), $line('p1', 'L / Black', 1200), $line('p1', 'XL / White', 800)], 1],
            ['WA-2026-0230', 'NL-4471-A', 'B-002', '2026-10-07', '2026-11-12', [$line('p3', 'L / Grey', 450), $line('p3', 'M / Navy', 450)], 0],
            ['WA-2026-0229', 'TC-PO-2210', 'B-003', '2026-10-06', '2026-11-05', [$line('p2', 'M / Navy', 600), $line('p2', 'L / White', 600)], 3],
            ['WA-2026-0228', 'MA-AW26-017', 'B-004', '2026-10-04', '2026-10-30', [$line('p6', 'M / Grey', 500), $line('p6', 'L / Maroon', 300)], 4],
            ['WA-2026-0227', 'FB-26-0933', 'B-005', '2026-10-02', '2026-10-24', [$line('p1', 'S / Green', 700), $line('p1', 'M / Green', 700)], 5],
            ['WA-2026-0226', 'CM-77120', 'B-006', '2026-09-28', '2026-10-12', [$line('p4', 'M / Blue', 400), $line('p5', '32 / Khaki', 400)], 6],
            ['WA-2026-0225', 'ML-PO-3305', 'B-007', '2026-09-24', '2026-10-06', [$line('p5', '34 / Navy', 350), $line('p4', 'L / Indigo', 300)], 7],
            ['WA-2026-0224', 'SC-1180', 'B-008', '2026-09-20', '2026-10-02', [$line('p1', 'L / White', 900), $line('p2', 'S / Black', 300)], 7],
            ['WA-2026-0223', 'NW-PO-88305', 'B-001', '2026-09-15', '2026-09-30', [$line('p6', 'S / Black', 600)], 7],
            ['WA-2026-0222', 'NL-4398-B', 'B-002', '2026-09-10', '2026-09-26', [$line('p2', 'XL / Navy', 500), $line('p3', 'XL / Black', 200)], 7],
            ['WA-2026-0221', 'TC-PO-2188', 'B-003', '2026-10-01', '2026-11-18', [$line('p5', '36 / Olive', 800)], 2],
            ['WA-2026-0220', 'MA-AW26-009', 'B-004', '2026-09-29', '2026-11-02', [$line('p4', 'S / Blue', 650)], -1],
        ] as [$id, $po, $bid, $date, $ship, $lines, $step]) {
            $b = $byId[$bid];
            Order::create(['id' => $id, 'buyer_po' => $po, 'buyer' => $bid, 'date' => $date, 'ship_date' => $ship, 'country' => $b->country,
                'merchandiser' => $b->merchandiser, 'term' => $b->term, 'lines' => $lines, 'step' => max($step, 0), 'cancelled' => $step === -1]);
        }
    }

    private function activities(): void
    {
        foreach (array_reverse([
            ['po', 'Purchase order PO-2026-015 received from Rupsha Denim Mills', 'Sadia Rahman'],
            ['prod', 'Production started for PP-2026-006 (Basic Sweatshirt)', 'Tanvir Hossain'],
            ['hr', 'Employee leave approved – Karim Hasan (Sick, 2 days)', 'HR Manager'],
            ['fg', '1,472 Denim Shirts added to Finished Goods', 'Nusrat Jahan'],
            ['po', 'Shipment of order WA-2026-0226 left Chattogram port for Valencia', 'Commercial'],
            ['stock', 'Stock adjustment ADJ-0042: Neck Label −120 pcs (damaged)', 'Sadia Rahman'],
            ['sup', 'New supplier added: Padma Trims & Labels', 'Procurement'],
        ]) as [$icon, $text, $by]) {
            Activity::create(compact('icon', 'text', 'by'));
        }
    }
}
