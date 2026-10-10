<?php

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HrController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\ManufacturingController;
use App\Http\Controllers\Api\MerchandisingController;
use App\Http\Controllers\Api\ProcurementController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingsController;
use Illuminate\Support\Facades\Route;

Route::get('health', fn () => ['status' => 'ok', 'app' => 'Winner Apparels API']);
Route::get('dashboard', [DashboardController::class, 'index']);
Route::get('activities', [SettingsController::class, 'activities']);
Route::get('reports/{kind}', [ReportController::class, 'show']);

// Catalog
Route::get('catalog/categories', [CatalogController::class, 'categories']);
Route::get('catalog/brands', [CatalogController::class, 'brands']);
Route::get('catalog/attributes', [CatalogController::class, 'attributes']);
Route::get('products', [CatalogController::class, 'index']);
Route::post('products', [CatalogController::class, 'store']);
Route::get('products/{id}', [CatalogController::class, 'show']);
Route::put('products/{id}', [CatalogController::class, 'update']);
Route::delete('products/{id}', [CatalogController::class, 'destroy']);
Route::post('products/{id}/duplicate', [CatalogController::class, 'duplicate']);
Route::get('products/{id}/bom', [CatalogController::class, 'bom']);
Route::put('products/{id}/bom', [CatalogController::class, 'saveBom']);

// Inventory
Route::get('inventory/materials', [InventoryController::class, 'materials']);
Route::get('inventory/low-stock', [InventoryController::class, 'lowStock']);
Route::get('inventory/finished-goods', [InventoryController::class, 'finishedGoods']);
Route::get('inventory/reservations', [InventoryController::class, 'reservations']);
Route::get('inventory/movements', [InventoryController::class, 'movements']);
Route::get('inventory/warehouses', [InventoryController::class, 'warehouses']);
Route::post('inventory/warehouses', [InventoryController::class, 'storeWarehouse']);
Route::post('inventory/receive', [InventoryController::class, 'receive']);
Route::post('inventory/adjust', [InventoryController::class, 'adjust']);

// Procurement
Route::get('procurement/suppliers', [ProcurementController::class, 'suppliers']);
Route::post('procurement/suppliers', [ProcurementController::class, 'storeSupplier']);
Route::put('procurement/suppliers/{id}', [ProcurementController::class, 'updateSupplier']);
Route::get('procurement/requirements', [ProcurementController::class, 'requisitions']);
Route::post('procurement/requirements', [ProcurementController::class, 'storeRequisition']);
Route::get('procurement/orders', [ProcurementController::class, 'orders']);
Route::post('procurement/orders', [ProcurementController::class, 'storeOrder']);
Route::put('procurement/orders/{id}/status', [ProcurementController::class, 'setStatus']);

// Manufacturing
Route::get('manufacturing/plans', [ManufacturingController::class, 'index']);
Route::post('manufacturing/plans', [ManufacturingController::class, 'store']);
Route::get('manufacturing/plans/{id}', [ManufacturingController::class, 'show']);
Route::post('manufacturing/plans/{id}/{action}', [ManufacturingController::class, 'action']);
Route::get('manufacturing/requirements', [ManufacturingController::class, 'requirements']);
Route::get('manufacturing/report', [ManufacturingController::class, 'report']);

// HR
Route::get('hr/employees', [HrController::class, 'employees']);
Route::post('hr/employees', [HrController::class, 'storeEmployee']);
Route::get('hr/employees/{id}', [HrController::class, 'employee']);
Route::put('hr/employees/{id}', [HrController::class, 'updateEmployee']);
Route::get('hr/departments', [HrController::class, 'departments']);
Route::get('hr/designations', [HrController::class, 'designations']);
Route::get('hr/attendance', [HrController::class, 'attendance']);
Route::get('hr/leaves', [HrController::class, 'leaves']);
Route::post('hr/leaves', [HrController::class, 'storeLeave']);
Route::put('hr/leaves/{id}/decision', [HrController::class, 'decideLeave']);
Route::get('hr/salary', [HrController::class, 'salaryStructure']);
Route::get('hr/payroll', [HrController::class, 'payroll']);
Route::post('hr/payroll/advance', [HrController::class, 'advancePayroll']);

// Merchandising
Route::get('merchandising/orders', [MerchandisingController::class, 'orders']);
Route::post('merchandising/orders', [MerchandisingController::class, 'storeOrder']);
Route::get('merchandising/orders/{id}', [MerchandisingController::class, 'order']);
Route::post('merchandising/orders/{id}/advance', [MerchandisingController::class, 'advance']);
Route::post('merchandising/orders/{id}/cancel', [MerchandisingController::class, 'cancel']);
Route::get('merchandising/buyers', [MerchandisingController::class, 'buyers']);
Route::post('merchandising/buyers', [MerchandisingController::class, 'storeBuyer']);
Route::get('merchandising/countries', [MerchandisingController::class, 'countries']);
Route::post('merchandising/countries', [MerchandisingController::class, 'storeCountry']);
Route::get('merchandising/shipments', [MerchandisingController::class, 'shipments']);

// Settings
Route::get('settings/users', [SettingsController::class, 'users']);
Route::post('settings/users', [SettingsController::class, 'storeUser']);
Route::put('settings/users/{id}', [SettingsController::class, 'updateUser']);
Route::get('settings/roles', [SettingsController::class, 'roles']);
Route::get('settings/system', [SettingsController::class, 'system']);
Route::put('settings/system', [SettingsController::class, 'updateSystem']);
Route::post('settings/reset', [SettingsController::class, 'reset']);
