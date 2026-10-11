import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Clock, Package, Ruler } from 'lucide-react'
import { imageFor, productMeta, type GarmentType } from '../../shared/site'
import { GarmentImg } from '../components/Img'
import { useSeo } from '../seo'
import { colorHex } from '../ui'
import { ProductCard } from './ProductCard'
import { useCatalog } from './useCatalog'

export default function CollectionDetail() {
  const { slug } = useParams()
  const { data, error, retry } = useCatalog()
  const p = data?.products.find((x) => x.slug === slug)
  const meta = p ? productMeta(p) : { title: 'Collections | Winner Apparels', description: 'Garment collections by Winner Apparels.' }
  useSeo({ title: meta.title, description: meta.description, path: `/collections/${slug}`, index: !!p, image: p?.image })
  const [color, setColor] = useState<string | null>(null)
  const active = color ?? p?.colors[0]
  const related = useMemo(() => {
    const others = (data?.products ?? []).filter((x) => x.slug !== slug)
    return p ? [...others.filter((x) => x.type === p.type), ...others.filter((x) => x.type !== p.type)].slice(0, 3) : []
  }, [data, slug, p])

  if (!data && !error) return <div className="mx-auto max-w-7xl px-4 pb-8 pt-32 sm:px-6"><div className="grid gap-10 md:grid-cols-2"><div className="shimmer aspect-[5/6] rounded-2xl" /><div className="space-y-4"><div className="shimmer h-10 w-2/3 rounded" /><div className="shimmer h-5 w-full rounded" /><div className="shimmer h-5 w-5/6 rounded" /></div></div></div>
  if (error) return <div className="mx-auto max-w-xl px-4 pb-8 pt-40 text-center"><h1 className="font-display text-3xl font-bold">We could not load this style</h1><button className="btn-primary mt-6" onClick={retry}>Try again</button></div>
  if (!p) return <div className="mx-auto max-w-xl px-4 pb-8 pt-40 text-center"><h1 className="font-display text-3xl font-bold">Style not found</h1><p className="mt-3 text-slate-600">It may have been retired.</p><Link to="/collections" className="btn-primary mt-6">Browse collections</Link></div>

  const facts: [typeof Package, string, string][] = [[Package, 'MOQ', `${p.moq} pcs`], [Clock, 'Lead time', `${p.leadTimeDays} days`], [Ruler, 'Sizes', `${p.sizes[0] ?? '-'} to ${p.sizes[p.sizes.length - 1] ?? '-'}`]]
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-32 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><Link to="/" className="hover:text-brand-600">Home</Link> / <Link to="/collections" className="hover:text-brand-600">Collections</Link> / <span className="text-slate-800">{p.name}</span></nav>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
          <GarmentImg src={imageFor(p.type as GarmentType, active, 640)} alt={`${p.name} in ${active}`} width={640} height={768} className="aspect-[5/6] w-full object-cover" priority sizes="(max-width: 768px) 100vw, 560px" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.3em] text-gold-600">{p.category}</div>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">{p.name}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{p.description}</p>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Colours</h2>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choose colour">
            {p.colors.map((c) => <button key={c} onClick={() => setColor(c)} aria-pressed={active === c} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${active === c ? 'border-gold-500 bg-gold-50 font-medium text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}><i className="h-4 w-4 rounded-full border border-black/10" style={{ background: colorHex(c) }} />{c}</button>)}
          </div>
          <dl className="mt-8 grid grid-cols-3 gap-3">
            {facts.map(([Icon, k, v]) => <div key={k} className="rounded-xl border border-slate-200 bg-white p-4"><Icon size={18} className="text-gold-600" /><dt className="mt-2 text-xs text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>)}
          </dl>
          <Link to={`/contact?style=${p.slug}`} className="btn-primary btn-lg mt-8">Request a quote for this style <ArrowRight size={18} /></Link>
          <p className="mt-3 text-xs text-slate-500">{p.variants} colour and size combinations available. Private label, custom trims and packaging supported.</p>
        </div>
      </div>
      {related.length > 0 && <section className="mt-20"><h2 className="font-display text-2xl font-bold text-slate-900">You may also like</h2><div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">{related.map((r) => <ProductCard key={r.slug} p={r} />)}</div></section>}
    </div>
  )
}
