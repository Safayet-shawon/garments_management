import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Clock, Layers, Scissors, ShieldCheck, Ship, Users } from 'lucide-react'
import { FAQ, PAGES, PROCESS, SITE } from '../../shared/site'
import { HeroImg } from '../components/Img'
import { useSeo } from '../seo'
import { ProductCard, ProductSkeleton } from './ProductCard'
import { Reveal, SectionHead } from './Reveal'
import { useCatalog } from './useCatalog'

const FEATURES = [
  { icon: ShieldCheck, title: 'Inline quality control', text: 'Checks at cutting, sewing and finishing, then a final AQL 2.5 inspection with a defect report for every batch.' },
  { icon: Users, title: 'A merchandiser for every buyer', text: 'One named contact owns your samples, approvals and shipment dates from first email to port.' },
  { icon: Layers, title: 'Materials booked before cutting', text: 'Fabric, thread, labels and packaging are matched to each order, so production does not stop for a missing trim.' },
  { icon: Scissors, title: 'Planned lines, not guesswork', text: 'Orders are matched to the sewing line that finishes them soonest, using capacity and style experience.' },
  { icon: Ship, title: 'Export paperwork handled', text: 'Packing lists, commercial invoices and LC or TT documents prepared with the shipment.' },
  { icon: Clock, title: 'Honest lead times', text: '35 to 60 days from approved sample, with weekly progress reports against the plan.' },
]

export default function Home() {
  const page = PAGES['/']
  useSeo({ title: page.title, description: page.description, path: '/', keywords: page.keywords })
  const { data, error, retry } = useCatalog()

  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <HeroImg />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-900/75 to-brand-900/25" />
        <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-center px-4 pb-24 pt-32 sm:px-6">
          <div className="max-w-2xl">
            <div className="hero-in text-xs font-semibold uppercase tracking-[.35em] text-gold-400" style={{ animationDelay: '.05s' }}>Gazipur · Bangladesh · Since {SITE.founded}</div>
            <h1 className="hero-in mt-5 font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl" style={{ animationDelay: '.15s' }}>Export-quality garments, <span className="gold-text">made in Bangladesh</span></h1>
            <p className="hero-in mt-6 max-w-xl text-lg leading-relaxed text-slate-200" style={{ animationDelay: '.3s' }}>We cut, sew, finish and inspect T-shirts, polos, hoodies, denim shirts and chinos for brands and retailers in 12 countries. One merchandiser, one plan, one on-time shipment.</p>
            <div className="hero-in mt-9 flex flex-wrap gap-3" style={{ animationDelay: '.45s' }}>
              <Link to="/contact" className="btn-primary btn-lg">Request a quote <ArrowRight size={18} /></Link>
              <Link to="/collections" className="btn-light btn-lg">Explore collections</Link>
            </div>
          </div>
          <dl className="hero-in mt-14 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4" style={{ animationDelay: '.6s' }}>
            {SITE.stats.map((s) => <div key={s.label}><dd className="font-display text-3xl font-bold text-white">{s.value}</dd><dt className="mt-1 text-xs text-slate-300">{s.label}</dt></div>)}
          </dl>
        </div>
        <svg className="absolute inset-x-0 bottom-0 h-8 w-full" viewBox="0 0 1440 32" preserveAspectRatio="none" aria-hidden="true"><path d="M0 16 C 240 0 480 32 720 16 S 1200 0 1440 16" fill="none" stroke="#e6bd4a" strokeWidth="2" strokeDasharray="10 9" className="stitch-run" /></svg>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <Reveal><SectionHead eyebrow="Collections" title="Styles we make every day" text="Core garments with colours and sizes ready for your label. Tell us your tech pack and we match the fabric, wash and trims." /></Reveal>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {data ? data.products.slice(0, 6).map((p, i) => <Reveal key={p.slug} delay={i * 60}><ProductCard p={p} priority={i < 2} /></Reveal>) : error ? null : Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
        {error && <div className="mt-10 rounded-xl border border-slate-200 bg-white p-8 text-center"><p className="text-slate-600">We could not load the collections right now.</p><button className="btn-primary mt-4" onClick={retry}>Try again</button></div>}
        <div className="mt-10 text-center"><Link to="/collections" className="btn-secondary">View all collections <ArrowRight size={16} /></Link></div>
      </section>

      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <Reveal><SectionHead eyebrow="How we work" title="From tech pack to port in four steps" text="Every order follows the same tracked path, so you always know where your garments are." /></Reveal>
        <ol className="relative mt-14 grid gap-8 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden border-t-2 border-dashed border-gold-500/60 md:block" aria-hidden="true" />
          {PROCESS.map((s, i) => (
            <li key={s.title} className="relative list-none text-center md:text-left">
              <Reveal delay={i * 90}>
                <span className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-display text-lg font-bold text-white shadow-lg ring-4 ring-[var(--bg)] md:mx-0">{i + 1}</span>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <Reveal><SectionHead eyebrow="Why brands choose us" title="Built for reliable repeat orders" /></Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:border-gold-400 hover:shadow-lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold-600"><f.icon size={22} /></span>
                <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {data && data.countries.length > 0 && (
        <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
          <Reveal><SectionHead eyebrow="Markets" title="Shipping to buyers worldwide" text="Regular FOB shipments from Chattogram and Dhaka to these destinations." /></Reveal>
          <ul className="mt-10 flex flex-wrap justify-center gap-3">{data.countries.map((c) => <li key={c.code} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"><span className="mr-2 font-mono text-xs text-gold-600">{c.code}</span>{c.name}</li>)}</ul>
        </section>
      )}

      <section className="mx-auto mt-28 max-w-3xl px-4 sm:px-6">
        <Reveal><SectionHead eyebrow="FAQ" title="Questions buyers ask first" /></Reveal>
        <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">{f.q}<ChevronDown size={18} className="shrink-0 text-gold-600 transition group-open:rotate-180" /></summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 px-6 py-14 text-center text-white sm:px-12">
            <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl" aria-hidden="true" />
            <h2 className="relative font-display text-3xl font-bold sm:text-4xl">Ready to start your next order?</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-200">Send the style, quantity and destination. A merchandiser replies within one business day with costing and a sample plan.</p>
            <Link to="/contact" className="btn-primary btn-lg relative mt-8">Request a quote <ArrowRight size={18} /></Link>
          </div>
        </Reveal>
      </section>
    </>
  )
}
