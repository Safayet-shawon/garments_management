import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Mail, MapPin, Menu, Phone, X } from 'lucide-react'
import { SITE } from '../../shared/site'
import { Logo } from '../Logo'
import { ThemeToggle } from '../ThemeToggle'
import { api, type PublicProduct } from '../api'

const LINKS = [['/', 'Home'], ['/collections', 'Collections'], ['/about', 'About'], ['/contact', 'Contact']] as const

export default function PublicLayout() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [products, setProducts] = useState<PublicProduct[]>([])
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => { const h = () => setScrolled(window.scrollY > 8); h(); window.addEventListener('scroll', h, { passive: true }); return () => window.removeEventListener('scroll', h) }, [])
  useEffect(() => { let on = true; api.catalog((d) => on && setProducts(d.products)).then((d) => on && setProducts(d.products)).catch(() => undefined); return () => { on = false } }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-slate-800">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg">Skip to content</a>
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || open ? 'glass-bar' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Winner Apparels home" className="shrink-0"><Logo size={36} light={!scrolled && !open && pathname === '/'} /></Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-gold-500/15 text-gold-600 dark:text-gold-400' : (!scrolled && pathname === '/' ? 'text-white/85 hover:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white')}`}>{label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:block" />
            <Link to="/login" className="btn-secondary hidden sm:inline-flex">Client login</Link>
            <Link to="/contact" className="btn-primary hidden sm:inline-flex">Request a quote</Link>
            <button className="rounded-md p-2 md:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X size={22} /> : <Menu size={22} className={!scrolled && pathname === '/' ? 'text-white' : ''} />}</button>
          </div>
        </div>
        {open && (
          <nav aria-label="Mobile" className="glass-bar border-t border-white/10 px-4 pb-4 md:hidden">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className="block rounded-md px-3 py-3 text-base font-medium text-slate-800 dark:text-slate-100">{label}</NavLink>)}
            <div className="mt-2 flex items-center gap-2"><Link to="/contact" className="btn-primary flex-1">Request a quote</Link><Link to="/login" className="btn-secondary">Login</Link><ThemeToggle /></div>
          </nav>
        )}
      </header>

      <main id="main"><Outlet /></main>

      <footer className="mt-24 bg-gradient-to-b from-ink-900 to-brand-900 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light size={40} />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">{SITE.legalName} cuts, sews, finishes and inspects export garments in Gazipur, Bangladesh, for brands and retailers across Europe, North America and Asia Pacific.</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-400">Collections</h2>
            <ul className="mt-4 space-y-2 text-sm">{products.slice(0, 6).map((p) => <li key={p.slug}><Link className="text-slate-400 transition hover:text-white" to={`/collections/${p.slug}`}>{p.name}</Link></li>)}{!products.length && <li><Link className="text-slate-400 hover:text-white" to="/collections">All collections</Link></li>}</ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-400">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-gold-500" />{SITE.address.street}, {SITE.address.city} {SITE.address.postalCode}, Bangladesh</li>
              <li className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0 text-gold-500" /><a className="hover:text-white" href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-gold-500" /><a className="hover:text-white" href={`tel:${SITE.phone.replace(/\s|-/g, '')}`}>{SITE.phone}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:px-6"><span>© {new Date().getFullYear()} {SITE.legalName} All rights reserved.</span><span className="flex gap-4"><Link className="hover:text-white" to="/about">About</Link><Link className="hover:text-white" to="/contact">Contact</Link><Link className="hover:text-white" to="/login">Staff login</Link></span></div></div>
      </footer>
    </div>
  )
}
