import { Suspense, lazy, type ComponentType } from 'react'
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { StoreProvider } from './store'
import { LogoMark } from './Logo'

/** lazy() for modules with named exports: each page becomes its own chunk, loaded when first visited. */
const page = <T extends object>(load: () => Promise<T>, name: keyof T) => lazy(() => load().then((m) => ({ default: m[name] as unknown as ComponentType<any> })))

// public website
const PublicLayout = lazy(() => import('./public/PublicLayout'))
const Home = lazy(() => import('./public/Home'))
const Collections = lazy(() => import('./public/Collections'))
const CollectionDetail = lazy(() => import('./public/CollectionDetail'))
const About = lazy(() => import('./public/About'))
const Contact = lazy(() => import('./public/Contact'))
const Login = lazy(() => import('./public/Login'))
const NotFound = lazy(() => import('./public/NotFound'))

// business management (ERP)
const Layout = lazy(() => import('./Layout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Reports = lazy(() => import('./pages/Reports'))
const PlanningLab = lazy(() => import('./pages/PlanningLab'))
const Inquiries = lazy(() => import('./pages/Inquiries'))
const catalog = () => import('./pages/Catalog')
const inventory = () => import('./pages/Inventory')
const manufacturing = () => import('./pages/Manufacturing')
const procurement = () => import('./pages/Procurement')
const hr = () => import('./pages/HR')
const merch = () => import('./pages/Merchandising')
const settings = () => import('./pages/Settings')
const Products = page(catalog, 'Products'), ProductNew = page(catalog, 'ProductNew'), ProductDetail = page(catalog, 'ProductDetail'), SimpleCatalog = page(catalog, 'SimpleCatalog')
const InventoryOverview = page(inventory, 'InventoryOverview'), RawMaterials = page(inventory, 'RawMaterials'), FinishedGoods = page(inventory, 'FinishedGoods'), Warehouses = page(inventory, 'Warehouses'), Movements = page(inventory, 'Movements'), Reservations = page(inventory, 'Reservations'), LowStock = page(inventory, 'LowStock')
const ManufacturingDashboard = page(manufacturing, 'ManufacturingDashboard'), Plans = page(manufacturing, 'Plans'), PlanNew = page(manufacturing, 'PlanNew'), PlanDetail = page(manufacturing, 'PlanDetail'), MaterialRequirements = page(manufacturing, 'MaterialRequirements'), Cutting = page(manufacturing, 'Cutting'), Sewing = page(manufacturing, 'Sewing'), Finishing = page(manufacturing, 'Finishing'), QualityControl = page(manufacturing, 'QualityControl')
const ProcurementOverview = page(procurement, 'ProcurementOverview'), Suppliers = page(procurement, 'Suppliers'), Requirements = page(procurement, 'Requirements'), PurchaseOrders = page(procurement, 'PurchaseOrders'), Receiving = page(procurement, 'Receiving')
const HRDashboard = page(hr, 'HRDashboard'), Employees = page(hr, 'Employees'), EmployeeProfile = page(hr, 'EmployeeProfile'), Departments = page(hr, 'Departments'), Designations = page(hr, 'Designations'), AttendancePage = page(hr, 'AttendancePage'), LeavePage = page(hr, 'LeavePage'), SalaryPage = page(hr, 'SalaryPage'), PayrollPage = page(hr, 'PayrollPage')
const MerchDashboard = page(merch, 'MerchDashboard'), Buyers = page(merch, 'Buyers'), BuyerOrders = page(merch, 'BuyerOrders'), Shipments = page(merch, 'Shipments'), Countries = page(merch, 'Countries')
const UsersPage = page(settings, 'UsersPage'), RolesPage = page(settings, 'RolesPage'), SystemSettings = page(settings, 'SystemSettings')

function Fallback() {
  return <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading"><LogoMark size={48} className="wa-float" /></div>
}

/** The business app needs a signed-in user; without any API (static hosting) it opens the built-in demo data. */
function ErpShell() {
  const auth = useAuth()
  const loc = useLocation()
  if (auth.status === 'checking') return <div className="flex h-screen items-center justify-center"><Fallback /></div>
  if (auth.status === 'anon') return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  return <StoreProvider><Layout /></StoreProvider>
}

function HomeGate() {
  const auth = useAuth()
  if (auth.status === 'offline') return <Navigate to="/dashboard" replace /> // demo build without a backend
  return <Home />
}

const MEMORY = import.meta.env.VITE_MEMORY === 'true'

export default function App() {
  const Router: any = MEMORY ? MemoryRouter : BrowserRouter
  return (
    <AuthProvider>
      <Router {...(MEMORY ? { initialEntries: ['/dashboard'] } : {})}>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomeGate />} />
              <Route path="collections" element={<Collections />} />
              <Route path="collections/:slug" element={<CollectionDetail />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
            </Route>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}
