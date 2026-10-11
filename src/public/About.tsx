import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { PAGES, PROCESS, SITE } from '../../shared/site'
import { useSeo } from '../seo'
import { Reveal, SectionHead } from './Reveal'

const CAPABILITIES = [
  'In-house pattern making and sampling',
  'Planned cutting with marker efficiency tracking',
  'Five sewing lines balanced by style and operator skill',
  'Finishing hall: trimming, pressing, labelling, folding, packing',
  'Inline and final inspection against AQL 2.5',
  'Fabric, thread, label and packaging booking per order',
]

export default function About() {
  const page = PAGES['/about']
  useSeo({ title: page.title, description: page.description, path: '/about', keywords: page.keywords })
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-32 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><Link to="/" className="hover:text-brand-600">Home</Link> / <span className="text-slate-800">About</span></nav>
      <div className="mt-4 grid items-center gap-12 md:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">{page.h1}</h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">{SITE.legalName} started in {SITE.founded} with one sewing line in Gazipur. Today {SITE.stats[0].value} people work across cutting, sewing, finishing and quality control, producing T-shirts, polos, hoodies, denim shirts and chinos for buyers in Europe, North America and Asia Pacific.</p>
          <p className="mt-4 leading-relaxed text-slate-600">We run the factory on a single plan. Orders, materials, lines and shipments live in one system, so a merchandiser can tell you what is cut, sewn and packed at any hour.</p>
          <Link to="/contact" className="btn-primary btn-lg mt-8">Talk to a merchandiser <ArrowRight size={18} /></Link>
        </div>
        <picture>
          <img src="/img/about-960.webp" srcSet="/img/about-480.webp 480w, /img/about-960.webp 960w" sizes="(max-width: 768px) 100vw, 560px" width={960} height={640} alt="A quality inspector checking folded cotton t-shirts beside rolls of fabric" loading="eager" decoding="async" className="w-full rounded-3xl border border-slate-200 shadow-card" />
        </picture>
      </div>

      <section className="mt-24">
        <Reveal><SectionHead eyebrow="Capabilities" title="Everything under one roof" center={false} /></Reveal>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">{CAPABILITIES.map((c) => <li key={c} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-sm"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-gold-600" />{c}</li>)}</ul>
      </section>

      <section className="mt-24">
        <Reveal><SectionHead eyebrow="Our process" title="A tracked path for every order" center={false} /></Reveal>
        <ol className="mt-8 grid gap-4 md:grid-cols-2">{PROCESS.map((s, i) => <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="font-display text-3xl font-bold text-gold-500">0{i + 1}</span><h3 className="mt-2 text-lg font-semibold text-slate-900">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p></li>)}</ol>
      </section>

      <section className="mt-24 rounded-3xl bg-gradient-to-br from-brand-900 to-brand-600 p-10 text-white">
        <h2 className="font-display text-3xl font-bold">Numbers we track every week</h2>
        <dl className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">{SITE.stats.map((s) => <div key={s.label}><dd className="font-display text-4xl font-bold text-gold-400">{s.value}</dd><dt className="mt-1 text-sm text-slate-300">{s.label}</dt></div>)}</dl>
      </section>
    </div>
  )
}
