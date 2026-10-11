import { Link } from 'react-router-dom'
import { useSeo } from '../seo'

export default function NotFound() {
  useSeo({ title: 'Page not found | Winner Apparels', description: 'This page could not be found.', index: false })
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-bold text-gold-500">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-slate-900">This page could not be found</h1>
      <p className="mt-3 text-slate-600">The link may be old or mistyped.</p>
      <div className="mt-8 flex gap-3"><Link to="/" className="btn-primary">Go to home page</Link><Link to="/collections" className="btn-secondary">Browse collections</Link></div>
    </div>
  )
}
