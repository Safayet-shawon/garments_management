import { lazy, type ComponentType } from 'react'
import { Navigate, Route, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { StoreProvider } from '../store'
import { LogoMark } from '../Logo'

/** lazy() for modules with named exports: each page becomes its own chunk, loaded when first visited. */
const page = <T extends object>(load: () => Promise<T>, name: keyof T) => /* @__PURE__ */ lazy(() => load().then((m) => ({ default: m[name] as unknown as ComponentType<any> })))

const Login = /* @__PURE__ */ lazy(() => import('../public/Login'))
// business management (ERP)
const ErpLayout = /* @__PURE__ */ lazy(() => import('../Layout'))
const Dashboard = /* @__PURE__ */ lazy(() => import('../pages/Dashboard'))
const Reports = /* @__PURE__ */ lazy(() => import('../pages/Reports'))
const PlanningLab = /* @__PURE__ */ lazy(() => import('../pages/PlanningLab'))
const Inquiries = /* @__PURE__ */ lazy(() => import('../pages/Inquiries'))
const catalog = () => import('../pages/Catalog')
const inventory = () => import('../pages/Inventory')
const manufacturing = () => import('../pages/Manufacturing')
const procurement = () => import('../pages/Procurement')
const hr = () => import('../pages/HR')
const merch = () => import('../pages/Merchandising')
const settings = () => import('../pages/Settings')
const Products = /* @__PURE__ */ page(catalog, 'Products'), ProductNew = /* @__PURE__ */ page(catalog, 'ProductNew'), ProductDetail = /* @__PURE__ */ page(catalog, 'ProductDetail'), SimpleCatalog = /* @__PURE__ */ page(catalog, 'SimpleCatalog')
const InventoryOverview = /* @__PURE__ */ page(inventory, 'InventoryOverview'), RawMaterials = /* @__PURE__ */ page(inventory, 'RawMaterials'), FinishedGoods = /* @__PURE__ */ page(inventory, 'FinishedGoods'), Warehouses = /* @__PURE__ */ page(inventory, 'Warehouses'), Movements = /* @__PURE__ */ page(inventory, 'Movements'), Reservations = /* @__PURE__ */ page(inventory, 'Reservations'), LowStock = /* @__PURE__ */ page(inventory, 'LowStock')
const ManufacturingDashboard = /* @__PURE__ */ page(manufacturing, 'ManufacturingDashboard'), Plans = /* @__PURE__ */ page(manufacturing, 'Plans'), PlanNew = /* @__PURE__ */ page(manufacturing, 'PlanNew'), PlanDetail = /* @__PURE__ */ page(manufacturing, 'PlanDetail'), MaterialRequirements = /* @__PURE__ */ page(manufacturing, 'MaterialRequirements'), Cutting = /* @__PURE__ */ page(manufacturing, 'Cutting'), Sewing = /* @__PURE__ */ page(manufacturing, 'Sewing'), Finishing = /* @__PURE__ */ page(manufacturing, 'Finishing'), QualityControl = /* @__PURE__ */ page(manufacturing, 'QualityControl')
const ProcurementOverview = /* @__PURE__ */ page(procurement, 'ProcurementOverview'), Suppliers = /* @__PURE__ */ page(procurement, 'Suppliers'), Requirements = /* @__PURE__ */ page(procurement, 'Requirements'), PurchaseOrders = /* @__PURE__ */ page(procurement, 'PurchaseOrders'), Receiving = /* @__PURE__ */ page(procurement, 'Receiving')
const HRDashboard = /* @__PURE__ */ page(hr, 'HRDashboard'), Employees = /* @__PURE__ */ page(hr, 'Employees'), EmployeeProfile = /* @__PURE__ */ page(hr, 'EmployeeProfile'), Departments = /* @__PURE__ */ page(hr, 'Departments'), Designations = /* @__PURE__ */ page(hr, 'Designations'), AttendancePage = /* @__PURE__ */ page(hr, 'AttendancePage'), LeavePage = /* @__PURE__ */ page(hr, 'LeavePage'), SalaryPage = /* @__PURE__ */ page(hr, 'SalaryPage'), PayrollPage = /* @__PURE__ */ page(hr, 'PayrollPage')
const MerchDashboard = /* @__PURE__ */ page(merch, 'MerchDashboard'), Buyers = /* @__PURE__ */ page(merch, 'Buyers'), BuyerOrders = /* @__PURE__ */ page(merch, 'BuyerOrders'), Shipments = /* @__PURE__ */ page(merch, 'Shipments'), Countries = /* @__PURE__ */ page(merch, 'Countries')
const UsersPage = /* @__PURE__ */ page(settings, 'UsersPage'), RolesPage = /* @__PURE__ */ page(settings, 'RolesPage'), SystemSettings = /* @__PURE__ */ page(settings, 'SystemSettings')


const Spin = () => <div className="flex h-screen items-center justify-center" role="status" aria-label="Loading"><LogoMark size={48} className="wa-float" /></div>

/** The business app needs a signed-in user; without any API (static hosting) it opens the built-in demo data. */
function ErpShell() {
  const auth = useAuth()
  const loc = useLocation()
  if (auth.status === 'checking') return <Spin />
  if (auth.status === 'anon') return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  return <StoreProvider><ErpLayout /></StoreProvider>
}

/** Sign-in plus every business page. Left out of the website-only build. */
export function erpRoutes() {
  return (
    <>
      <Route path="login" element={<Login />} />
      <Route element={<ErpShell />}>
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
          <Route path="manufacturing/planning-lab" element={<PlanningLab />} />
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
          <Route path="merchandising/inquiries" element={<Inquiries />} />
          <Route path="reports/:kind" element={<Reports />} />
          <Route path="reports" element={<Navigate to="/reports/sales" replace />} />
          <Route path="settings/users" element={<UsersPage />} />
          <Route path="settings/roles" element={<RolesPage />} />
          <Route path="settings/system" element={<SystemSettings />} />
              </Route>
    </>
  )
}
