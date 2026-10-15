import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
import { useAuth } from '../auth'
import { HAS_ERP } from '../mode'

const PublicLayout = /* @__PURE__ */ lazy(() => import('../public/PublicLayout'))
const Home = /* @__PURE__ */ lazy(() => import('../public/Home'))
const Collections = /* @__PURE__ */ lazy(() => import('../public/Collections'))
const CollectionDetail = /* @__PURE__ */ lazy(() => import('../public/CollectionDetail'))
const About = /* @__PURE__ */ lazy(() => import('../public/About'))
const Contact = /* @__PURE__ */ lazy(() => import('../public/Contact'))

function HomeGate() {
  const auth = useAuth()
  if (HAS_ERP && auth.status === 'offline') return <Navigate to="/dashboard" replace /> // demo build without a backend
  return <Home />
}

/** The public marketing website. Left out of the ERP-only build. */
export function siteRoutes() {
  return (
    <Route element={<PublicLayout />}>
      <Route index element={<HomeGate />} />
      <Route path="collections" element={<Collections />} />
      <Route path="collections/:slug" element={<CollectionDetail />} />
      <Route path="about" element={<About />} />
      <Route path="contact" element={<Contact />} />
    </Route>
  )
}
