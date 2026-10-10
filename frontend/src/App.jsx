import { useCallback, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ToastContext } from './hooks.js';
import Dashboard from './pages/Dashboard.jsx';
import { Attributes, Brands, Categories, ProductDetail, ProductForm, Products } from './pages/Catalog.jsx';
import { FinishedGoods, InventoryHub, LowStock, Movements, RawMaterials, Reservations, Warehouses } from './pages/Inventory.jsx';
import { ManufacturingHub, MfgReports, PlanDetail, PlanForm, Plans, Requirements, StagePage } from './pages/Manufacturing.jsx';
import { ProcurementHub, PurchaseOrders, PurchaseRequirements, Receiving, Suppliers } from './pages/Procurement.jsx';
import { Attendance, Departments, Designations, EmployeeDetail, Employees, HrHub, Leave, Payroll, Salary } from './pages/Hr.jsx';
import { Buyers, Countries, MerchHub, Orders, Shipments } from './pages/Merchandising.jsx';
import Reports from './pages/Reports.jsx';
import { Roles, SystemSettings, Users } from './pages/Settings.jsx';

export default function App() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, kind = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="catalog/categories" element={<Categories />} />
          <Route path="catalog/brands" element={<Brands />} />
          <Route path="catalog/attributes" element={<Attributes />} />

          <Route path="inventory" element={<InventoryHub />} />
          <Route path="inventory/raw-materials" element={<RawMaterials />} />
          <Route path="inventory/finished-goods" element={<FinishedGoods />} />
          <Route path="inventory/warehouses" element={<Warehouses />} />
          <Route path="inventory/movements" element={<Movements />} />
          <Route path="inventory/low-stock" element={<LowStock />} />
          <Route path="inventory/reservations" element={<Reservations />} />

          <Route path="manufacturing" element={<ManufacturingHub />} />
          <Route path="manufacturing/plans" element={<Plans />} />
          <Route path="manufacturing/plans/new" element={<PlanForm />} />
          <Route path="manufacturing/plans/:id" element={<PlanDetail />} />
          <Route path="manufacturing/requirements" element={<Requirements />} />
          <Route path="manufacturing/cutting" element={<StagePage stage="cutting" />} />
          <Route path="manufacturing/sewing" element={<StagePage stage="sewing" />} />
          <Route path="manufacturing/finishing" element={<StagePage stage="finishing" />} />
          <Route path="manufacturing/qc" element={<StagePage stage="qc" />} />
          <Route path="manufacturing/reports" element={<MfgReports />} />

          <Route path="procurement" element={<ProcurementHub />} />
          <Route path="procurement/suppliers" element={<Suppliers />} />
          <Route path="procurement/requirements" element={<PurchaseRequirements />} />
          <Route path="procurement/orders" element={<PurchaseOrders />} />
          <Route path="procurement/receiving" element={<Receiving />} />

          <Route path="hr" element={<HrHub />} />
          <Route path="hr/employees" element={<Employees />} />
          <Route path="hr/employees/:id" element={<EmployeeDetail />} />
          <Route path="hr/departments" element={<Departments />} />
          <Route path="hr/designations" element={<Designations />} />
          <Route path="hr/attendance" element={<Attendance />} />
          <Route path="hr/leave" element={<Leave />} />
          <Route path="hr/salary" element={<Salary />} />
          <Route path="hr/payroll" element={<Payroll />} />

          <Route path="merchandising" element={<MerchHub />} />
          <Route path="merchandising/orders" element={<Orders />} />
          <Route path="merchandising/buyers" element={<Buyers />} />
          <Route path="merchandising/shipments" element={<Shipments />} />
          <Route path="merchandising/countries" element={<Countries />} />

          <Route path="reports" element={<Navigate to="/reports/sales" replace />} />
          <Route path="reports/:kind" element={<Reports />} />

          <Route path="settings/users" element={<Users />} />
          <Route path="settings/roles" element={<Roles />} />
          <Route path="settings/system" element={<SystemSettings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}
      </div>
    </ToastContext.Provider>
  );
}
