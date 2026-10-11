import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { PAGES, SITE } from '../../shared/site'
import { ApiError, api } from '../api'
import { useSeo } from '../seo'
import { Spinner } from '../Logo'
import { useCatalog } from './useCatalog'

type Errors = Record<string, string>

export default function Contact() {
  const page = PAGES['/contact']
  useSeo({ title: page.title, description: page.description, path: '/contact', keywords: page.keywords })
  const [sp] = useSearchParams()
  const { data } = useCatalog()
  const preset = data?.products.find((p) => p.slug === sp.get('style'))?.name ?? ''
  const [f, setF] = useState({ name: '', email: '', company: '', country: '', interest: '', quantity: '', message: '', website: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [fail, setFail] = useState('')
  const interest = f.interest || preset
  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: '' })) }

  const validate = (): Errors => {
    const e: Errors = {}
    if (f.name.trim().length < 2) e.name = 'Enter your name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address'
    if (f.message.trim().length < 10) e.message = 'Tell us a little more (at least 10 characters)'
    if (f.quantity && !/^\d{1,8}$/.test(f.quantity)) e.quantity = 'Use digits only'
    return e
  }
  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e); setFail('')
    if (Object.values(e).some(Boolean)) return
    setBusy(true)
    try {
      await api.inquire({ name: f.name, email: f.email, company: f.company, country: f.country, interest, quantity: f.quantity ? Number(f.quantity) : null, message: f.message, website: f.website })
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && Array.isArray(err.details)) { const m: Errors = {}; for (const d of err.details as { field: string; message: string }[]) m[d.field] = d.message; setErrors(m); setFail('Please check the highlighted fields.') }
      else setFail(err instanceof ApiError && err.status === 429 ? err.message : 'We could not send your request. Please try again or email us directly.')
    } finally { setBusy(false) }
  }
  const field = 'input'
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-600" role="alert">{errors[k]}</p>

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-32 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><Link to="/" className="hover:text-brand-600">Home</Link> / <span className="text-slate-800">Contact</span></nav>
      <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold text-slate-900 sm:text-5xl">{page.h1}</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">Share the style, quantity and destination. We reply within one business day with costing and a sample plan.</p>

      <div className="mt-12 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {done ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center" role="status">
              <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
              <h2 className="mt-4 font-display text-2xl font-bold text-slate-900">Thank you, we have your request</h2>
              <p className="mx-auto mt-2 max-w-md text-slate-600">A merchandiser will reply to {f.email} within one business day.</p>
              <Link to="/collections" className="btn-primary mt-6">Browse collections</Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8" aria-describedby={fail ? 'form-error' : undefined}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Your name *</label><input id="name" autoComplete="name" className={field} value={f.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} />{err('name')}</div>
                <div><label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Work email *</label><input id="email" type="email" autoComplete="email" className={field} value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} />{err('email')}</div>
                <div><label htmlFor="company" className="mb-1 block text-sm font-medium text-slate-700">Company</label><input id="company" autoComplete="organization" className={field} value={f.company} onChange={(e) => set('company', e.target.value)} />{err('company')}</div>
                <div><label htmlFor="country" className="mb-1 block text-sm font-medium text-slate-700">Destination country</label>
                  <select id="country" className={field} value={f.country} onChange={(e) => set('country', e.target.value)}><option value="">Select a country</option>{data?.countries.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}<option value="Other">Other</option></select></div>
                <div><label htmlFor="interest" className="mb-1 block text-sm font-medium text-slate-700">Style of interest</label>
                  <select id="interest" className={field} value={interest} onChange={(e) => set('interest', e.target.value)}><option value="">Not sure yet</option>{data?.products.map((p) => <option key={p.slug} value={p.name}>{p.name}</option>)}</select></div>
                <div><label htmlFor="quantity" className="mb-1 block text-sm font-medium text-slate-700">Estimated quantity (pcs)</label><input id="quantity" inputMode="numeric" className={field} value={f.quantity} onChange={(e) => set('quantity', e.target.value)} aria-invalid={!!errors.quantity} />{err('quantity')}</div>
              </div>
              <div className="mt-5"><label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">Tell us about your order *</label><textarea id="message" rows={5} className={field} value={f.message} onChange={(e) => set('message', e.target.value)} aria-invalid={!!errors.message} placeholder="Fabric, colours, sizes, labels, target delivery date..." />{err('message')}</div>
              <div className="absolute -left-[9999px]" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input id="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></div>
              {fail && <p id="form-error" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{fail}</p>}
              <button type="submit" className="btn-primary btn-lg mt-6" disabled={busy}>{busy ? <><Spinner size={18} />Sending...</> : 'Send request'}</button>
              <p className="mt-3 text-xs text-slate-500">We only use your details to reply to this request.</p>
            </form>
          )}
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Visit or write to us</h2>
            <ul className="mt-4 space-y-4 text-sm text-slate-600">
              <li className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-gold-600" /><span>{SITE.legalName}<br />{SITE.address.street}<br />{SITE.address.city} {SITE.address.postalCode}, Bangladesh</span></li>
              <li className="flex gap-3"><Mail size={18} className="mt-0.5 shrink-0 text-gold-600" /><a className="hover:text-brand-600" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li className="flex gap-3"><Phone size={18} className="mt-0.5 shrink-0 text-gold-600" /><a className="hover:text-brand-600" href={`tel:${SITE.phone.replace(/\s|-/g, '')}`}>{SITE.phone}</a></li>
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-600 p-6 text-white"><h2 className="font-semibold">What happens next</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-200"><li>We review your request the same day.</li><li>A merchandiser sends costing and a sample plan.</li><li>You approve the sample and we book materials.</li></ol></div>
        </aside>
      </div>
    </div>
  )
}
