import { Suspense, lazy } from 'react'
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { LogoMark } from './Logo'
import { HAS_ERP, HAS_SITE } from './mode'
import { erpRoutes } from './routes/erp'
import { siteRoutes } from './routes/site'

const NotFound = lazy(() => import('./public/NotFound'))

function Fallback() {
  return <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading"><LogoMark size={48} className="wa-float" /></div>
}

const MEMORY = import.meta.env.VITE_MEMORY === 'true'

export default function App() {
  const Router: any = MEMORY ? MemoryRouter : BrowserRouter
  return (
    <AuthProvider>
      <Router {...(MEMORY ? { initialEntries: ['/dashboard'] } : {})}>
        <Suspense fallback={<Fallback />}>
          <Routes>
            {HAS_SITE && siteRoutes()}
            {HAS_ERP && erpRoutes()}
            {!HAS_SITE && <Route index element={<Navigate to="/dashboard" replace />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}
