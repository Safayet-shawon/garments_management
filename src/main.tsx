import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { StoreProvider } from './store'
import Layout from './Layout'
import Dashboard from './pages/Dashboard'
import { ProductDetail, ProductNew, Products, SimpleCatalog } from './pages/Catalog'
import { FinishedGoods, InventoryOverview, LowStock, Movements, RawMaterials, Reservations, Warehouses } from './pages/Inventory'
import { Cutting, Finishing, ManufacturingDashboard, MaterialRequirements, PlanDetail, PlanNew, Plans, QualityControl, Sewing } from './pages/Manufacturing'
import { ProcurementOverview, PurchaseOrders, Receiving, Requirements, Suppliers } from './pages/Procurement'
import { AttendancePage, Departments, Designations, EmployeeProfile, Employees, HRDashboard, LeavePage, PayrollPage, SalaryPage } from './pages/HR'
import { Buyers, Countries, MerchDashboard, BuyerOrders, Shipments } from './pages/Merchandising'
import Reports from './pages/Reports'
import { RolesPage, SystemSettings, UsersPage } from './pages/Settings'

const Router: any = import.meta.env.VITE_MEMORY ? MemoryRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <Router {...(import.meta.env.VITE_MEMORY ? { initialEntries: ['/dashboard'] } : {})}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductNew />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="catalog/categories" element={<SimpleCatalog kind="categories" />} />
            <Route path="catalog/brands" element={<SimpleCatalog kind="brands" />} />
            <Route path="catalog/attributes" element={<SimpleCatalog kind="attributes" />} />
            <Route path="inventory" element={<InventoryOverview />} />
            <Route path="inventory/raw-materials" element={<RawMaterials />} />
            <Route path="inventory/finished-goods" element={<FinishedGoods />} />
            <Route path="inventory/warehouses" element={<Warehouses />} />
            <Route path="inventory/movements" element={<Movements />} />
            <Route path="inventory/reservations" element={<Reservations />} />
            <Route path="inventory/low-stock" element={<LowStock />} />
            <Route path="manufacturing" element={<ManufacturingDashboard />} />
            <Route path="manufacturing/plans" element={<Plans />} />
            <Route path="manufacturing/plans/new" element={<PlanNew />} />
            <Route path="manufacturing/plans/:id" element={<PlanDetail />} />
            <Route path="manufacturing/requirements" element={<MaterialRequirements />} />
            <Route path="manufacturing/cutting" element={<Cutting />} />
            <Route path="manufacturing/sewing" element={<Sewing />} />
            <Route path="manufacturing/finishing" element={<Finishing />} />
            <Route path="manufacturing/qc" element={<QualityControl />} />
            <Route path="manufacturing/reports" element={<Navigate to="/reports/production" replace />} />
            <Route path="procurement" element={<ProcurementOverview />} />
            <Route path="procurement/suppliers" element={<Suppliers />} />
            <Route path="procurement/requirements" element={<Requirements />} />
            <Route path="procurement/orders" element={<PurchaseOrders />} />
            <Route path="procurement/receiving" element={<Receiving />} />
            <Route path="hr" element={<HRDashboard />} />
            <Route path="hr/employees" element={<Employees />} />
            <Route path="hr/employees/:id" element={<EmployeeProfile />} />
            <Route path="hr/departments" element={<Departments />} />
            <Route path="hr/designations" element={<Designations />} />
            <Route path="hr/attendance" element={<AttendancePage />} />
            <Route path="hr/leave" element={<LeavePage />} />
            <Route path="hr/salary" element={<SalaryPage />} />
            <Route path="hr/payroll" element={<PayrollPage />} />
            <Route path="merchandising" element={<MerchDashboard />} />
            <Route path="merchandising/buyers" element={<Buyers />} />
            <Route path="merchandising/orders" element={<BuyerOrders />} />
            <Route path="merchandising/shipments" element={<Shipments />} />
            <Route path="merchandising/countries" element={<Countries />} />
            <Route path="reports/:kind" element={<Reports />} />
            <Route path="reports" element={<Navigate to="/reports/sales" replace />} />
            <Route path="settings/users" element={<UsersPage />} />
            <Route path="settings/roles" element={<RolesPage />} />
            <Route path="settings/system" element={<SystemSettings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </StoreProvider>
  </React.StrictMode>,
)
