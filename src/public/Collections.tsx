import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PAGES, typeInfo, type GarmentType } from '../../shared/site'
import { useDebounced } from '../hooks'
import { useSeo } from '../seo'
import { ProductCard, ProductSkeleton } from './ProductCard'
import { useCatalog } from './useCatalog'

export default function Collections() {
  const page = PAGES['/collections']
  useSeo({ title: page.title, description: page.description, path: '/collections', keywords: page.keywords })
  const { data, error, retry } = useCatalog()
  const [q, setQ] = useState('')
  const [type, setType] = useState<GarmentType | 'all'>('all')
  const dq = useDebounced(q, 200)
  const list = useMemo(() => (data?.products ?? []).filter((p) => (type === 'all' || p.type === type) && (!dq || `${p.name} ${p.category} ${p.colors.join(' ')}`.toLowerCase().includes(dq.toLowerCase()))), [data, type, dq])
  const types = useMemo(() => [...new Set((data?.products ?? []).map((p) => p.type))] as GarmentType[], [data])

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-32 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><Link to="/" className="hover:text-brand-600">Home</Link> / <span className="text-slate-800">Collections</span></nav>
      <h1 className="mt-3 font-display text-4xl font-bold text-slate-900 sm:text-5xl">{page.h1}</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">Every style below is made to order with your fabric weight, wash, labels and packaging. Prices depend on quantity and specification, so ask for a quote.</p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-9" placeholder="Search styles or colours" aria-label="Search styles" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          <button className={`chip ${type === 'all' ? 'chip-on' : ''}`} onClick={() => setType('all')}>All</button>
          {types.map((t) => <button key={t} className={`chip ${type === t ? 'chip-on' : ''}`} onClick={() => setType(t)}>{typeInfo[t].label}</button>)}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {data ? list.map((p, i) => <ProductCard key={p.slug} p={p} priority={i < 4} />) : error ? null : Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
      </div>
      {data && !list.length && <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">No styles match "{dq}". <button className="font-medium text-brand-600 underline" onClick={() => { setQ(''); setType('all') }}>Clear filters</button></div>}
      {error && <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center"><p className="text-slate-600">We could not load the collections.</p><button className="btn-primary mt-4" onClick={retry}>Try again</button></div>}
    </div>
  )
}
