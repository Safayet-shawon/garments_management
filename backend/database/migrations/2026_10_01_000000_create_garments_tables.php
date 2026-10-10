<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('password');
            $t->string('role')->default('Admin');
            $t->string('status')->default('Active');
            $t->rememberToken();
            $t->timestamps();
        });

        Schema::create('products', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('name');
            $t->string('sku')->unique();
            $t->string('category');
            $t->string('brand');
            $t->text('description')->nullable();
            $t->string('type')->default('Finished Garment');
            $t->string('status')->default('Active');
            $t->json('variants')->nullable();
            $t->integer('stock')->default(0);
            $t->decimal('price', 12, 2)->default(0);
            $t->decimal('export_price', 12, 2)->default(0); // buyer price per unit (USD)
            $t->integer('reorder')->default(0);
            $t->date('updated')->nullable();
            $t->timestamps();
        });

        Schema::create('suppliers', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('name');
            $t->string('type');
            $t->string('contact')->nullable();
            $t->string('phone')->nullable();
            $t->string('location')->nullable();
            $t->decimal('rating', 3, 1)->default(0);
            $t->string('status')->default('Active');
            $t->timestamps();
        });

        Schema::create('warehouses', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('code')->unique();
            $t->string('name');
            $t->string('location')->nullable();
            $t->string('type');
            $t->string('status')->default('Active');
            $t->timestamps();
        });

        Schema::create('materials', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('name');
            $t->string('sku')->unique();
            $t->string('warehouse');
            $t->string('unit');
            $t->decimal('on_hand', 14, 2)->default(0);
            $t->decimal('reserved', 14, 2)->default(0);
            $t->decimal('reorder', 14, 2)->default(0);
            $t->decimal('critical', 14, 2)->default(0);
            $t->decimal('unit_cost', 12, 2)->default(0);
            $t->string('supplier_id')->nullable();
            $t->timestamps();
        });

        Schema::create('bom_items', function (Blueprint $t) {
            $t->id();
            $t->string('product_id')->index();
            $t->string('material_id');
            $t->decimal('qty', 12, 3);
            $t->string('unit');
            $t->timestamps();
        });

        Schema::create('stock_movements', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->date('date');
            $t->string('sku');
            $t->string('item');
            $t->string('warehouse');
            $t->string('type');
            $t->decimal('qty', 14, 2);
            $t->string('unit');
            $t->string('ref')->nullable();
            $t->string('user')->nullable();
            $t->timestamps();
        });

        Schema::create('purchase_requisitions', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('material_id');
            $t->decimal('qty', 14, 2);
            $t->string('reason')->nullable();
            $t->string('supplier_id')->nullable();
            $t->date('expected')->nullable();
            $t->string('priority')->default('Normal');
            $t->text('notes')->nullable();
            $t->string('status')->default('Pending Purchase');
            $t->string('po_id')->nullable();
            $t->date('created')->nullable();
            $t->timestamps();
        });

        Schema::create('purchase_orders', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('supplier_id');
            $t->json('items');
            $t->date('expected')->nullable();
            $t->string('warehouse')->default('RM-WH');
            $t->text('notes')->nullable();
            $t->string('status')->default('Draft');
            $t->date('created')->nullable();
            $t->timestamps();
        });

        Schema::create('production_plans', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('product_id');
            $t->string('variant')->default('All variants');
            $t->integer('target');
            $t->integer('issued')->default(0);
            $t->integer('cut')->default(0);
            $t->integer('sewn')->default(0);
            $t->integer('finished')->default(0);
            $t->integer('waste_kg')->default(0);
            $t->integer('sew_reject')->default(0);
            $t->string('stage')->default('Planned');
            $t->string('status')->default('Planned');
            $t->date('start')->nullable();
            $t->date('end')->nullable();
            $t->string('supervisor')->nullable();
            $t->string('priority')->default('Normal');
            $t->text('notes')->nullable();
            $t->string('warehouse')->default('MF-WH');
            $t->string('team')->default('Unassigned');
            $t->boolean('cutting_started')->default(false);
            $t->boolean('sewing_started')->default(false);
            $t->boolean('mat_issued')->default(false);
            $t->string('qc_status')->default('Not Ready');
            $t->integer('qc_inspected')->default(0);
            $t->integer('qc_passed')->default(0);
            $t->integer('qc_rejected')->default(0);
            $t->string('qc_inspector')->nullable();
            $t->json('qc_reasons')->nullable();
            $t->timestamps();
        });

        Schema::create('employees', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('name');
            $t->string('dept');
            $t->string('designation');
            $t->string('role');
            $t->date('joined');
            $t->string('type')->default('Permanent');
            $t->string('status')->default('Active');
            $t->decimal('basic', 12, 2);
            $t->string('phone')->nullable();
            $t->string('email')->nullable();
            $t->json('leave')->nullable();
            $t->json('perf')->nullable();
            $t->timestamps();
        });

        Schema::create('attendances', function (Blueprint $t) {
            $t->id();
            $t->date('date')->index();
            $t->string('emp_id')->index();
            $t->string('in')->default('—');
            $t->string('out')->default('—');
            $t->string('status');
            $t->decimal('hours', 4, 1)->default(0);
            $t->timestamps();
        });

        Schema::create('leave_requests', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('emp_id');
            $t->string('type');
            $t->date('from');
            $t->date('to');
            $t->integer('days');
            $t->string('status')->default('Pending');
            $t->string('reason')->nullable();
            $t->timestamps();
        });

        Schema::create('payroll_runs', function (Blueprint $t) {
            $t->id();
            $t->string('month');
            $t->integer('employees');
            $t->decimal('gross', 14, 2);
            $t->decimal('deductions', 14, 2);
            $t->decimal('net', 14, 2);
            $t->string('status');
            $t->timestamps();
        });

        Schema::create('buyers', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('name');
            $t->string('type');
            $t->string('country');
            $t->string('contact')->nullable();
            $t->string('email')->nullable();
            $t->string('merchandiser')->nullable();
            $t->string('term')->nullable();
            $t->string('status')->default('Active');
            $t->timestamps();
        });

        Schema::create('countries', function (Blueprint $t) {
            $t->string('code')->primary();
            $t->string('name');
            $t->string('region');
            $t->string('currency');
            $t->string('port');
            $t->timestamps();
        });

        Schema::create('orders', function (Blueprint $t) {
            $t->string('id')->primary();
            $t->string('buyer_po');
            $t->string('buyer');
            $t->date('date');
            $t->date('ship_date');
            $t->string('country');
            $t->string('merchandiser')->nullable();
            $t->string('term')->nullable();
            $t->json('lines');
            $t->integer('step')->default(0);
            $t->boolean('cancelled')->default(false);
            $t->timestamps();
        });

        Schema::create('activities', function (Blueprint $t) {
            $t->id();
            $t->string('icon')->default('stock');
            $t->string('text');
            $t->string('by')->nullable();
            $t->timestamps();
        });

        Schema::create('settings', function (Blueprint $t) {
            $t->string('key')->primary();
            $t->json('value')->nullable();
        });
    }

    public function down(): void
    {
        foreach (['settings','activities','orders','countries','buyers','payroll_runs','leave_requests','attendances','employees','production_plans','purchase_orders','purchase_requisitions','stock_movements','bom_items','materials','warehouses','suppliers','products','users'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
