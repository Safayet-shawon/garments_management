import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Bell, Boxes, ChevronDown, ChevronsLeft, ChevronsRight, Factory, LayoutDashboard, Menu, Plus, Search, Settings, ShoppingCart, Shirt, Users, X, CheckCircle2, AlertCircle, Info, Globe, Sun, Moon } from 'lucide-react'
import { useStore, useUI, useActions, matStatus, planRequirements, planReady } from './store'
import { cx, LoadingState } from './ui'
import { ModalHost } from './modals'
import { Logo, LogoMark } from './Logo'

type NavItem = { label: string; to: string; end?: boolean }
const NAV: { label: string; icon: ReactNode; base: string; items: NavItem[] }[] = [
  { label: 'Catalog', icon: <Shirt size={17} />, base: '/products|/catalog', items: [{ label: 'All Styles', to: '/products' }, { label: 'Categories', to: '/catalog/categories' }, { label: 'Brands', to: '/catalog/brands' }, { label: 'Attributes', to: '/catalog/attributes' }] },
  { label: 'Inventory', icon: <Boxes size={17} />, base: '/inventory', items: [{ label: 'Overview', to: '/inventory', end: true }, { label: 'Raw Materials', to: '/inventory/raw-materials' }, { label: 'Finished Goods', to: '/inventory/finished-goods' }, { label: 'Warehouses', to: '/inventory/warehouses' }, { label: 'Stock Movements', to: '/inventory/movements' }, { label: 'Reservations', to: '/inventory/reservations' }, { label: 'Low Stock', to: '/inventory/low-stock' }] },
  { label: 'Manufacturing', icon: <Factory size={17} />, base: '/manufacturing', items: [{ label: 'Production Dashboard', to: '/manufacturing', end: true }, { label: 'Production Plans', to: '/manufacturing/plans' }, { label: 'Material Requirements', to: '/manufacturing/requirements' }, { label: 'Cutting', to: '/manufacturing/cutting' }, { label: 'Sewing', to: '/manufacturing/sewing' }, { label: 'Finishing', to: '/manufacturing/finishing' }, { label: 'Quality Control', to: '/manufacturing/qc' }, { label: 'Production Reports', to: '/manufacturing/reports' }] },
  { label: 'Procurement', icon: <ShoppingCart size={17} />, base: '/procurement', items: [{ label: 'Overview', to: '/procurement', end: true }, { label: 'Suppliers', to: '/procurement/suppliers' }, { label: 'Purchase Requirements', to: '/procurement/requirements' }, { label: 'Purchase Orders', to: '/procurement/orders' }, { label: 'Receiving', to: '/procurement/receiving' }] },
  { label: 'HR', icon: <Users size={17} />, base: '/hr', items: [{ label: 'HR Dashboard', to: '/hr', end: true }, { label: 'Employees', to: '/hr/employees' }, { label: 'Departments', to: '/hr/departments' }, { label: 'Designations', to: '/hr/designations' }, { label: 'Attendance', to: '/hr/attendance' }, { label: 'Leave', to: '/hr/leave' }, { label: 'Salary', to: '/hr/salary' }, { label: 'Payroll', to: '/hr/payroll' }] },
  { label: 'Merchandising', icon: <Globe size={17} />, base: '/merchandising', items: [{ label: 'Overview', to: '/merchandising', end: true }, { label: 'Buyers', to: '/merchandising/buyers' }, { label: 'Buyer Orders', to: '/merchandising/orders' }, { label: 'Shipments', to: '/merchandising/shipments' }, { label: 'Countries', to: '/merchandising/countries' }] },
  { label: 'Reports', icon: <BarChart3 size={17} />, base: '/reports', items: [{ label: 'Export', to: '/reports/sales' }, { label: 'Production', to: '/reports/production' }, { label: 'Inventory', to: '/reports/inventory' }, { label: 'Procurement', to: '/reports/procurement' }, { label: 'HR', to: '/reports/hr' }] },
  { label: 'Settings', icon: <Settings size={17} />, base: '/settings', items: [{ label: 'Users', to: '/settings/users' }, { label: 'Roles & Permissions', to: '/settings/roles' }, { label: 'System Settings', to: '/settings/system' }] },
]

function Sidebar({ collapsed, setCollapsed, mobileOpen, closeMobile }: { collapsed: boolean; setCollapsed: (b: boolean) => void; mobileOpen: boolean; closeMobile: () => void }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const isActiveGroup = (base: string) => base.split('|').some((b) => pathname.startsWith(b))
  const isOpen = (g: (typeof NAV)[number]) => open[g.label] ?? isActiveGroup(g.base)
  const showLabels = !collapsed || mobileOpen
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={closeMobile} />}
      <aside className={cx('fixed inset-y-0 left-0 z-40 flex flex-col bg-gradient-to-b from-ink-900 to-brand-900 text-slate-300 transition-all duration-200 lg:static', mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0', !mobileOpen && (collapsed ? 'lg:w-[68px]' : 'lg:w-64'))}>
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-4"><Logo compact={!showLabels} light size={showLabels ? 38 : 34} /></div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <NavLink to="/dashboard" onClick={closeMobile} className={({ isActive }) => cx('mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium', isActive ? 'bg-white/10 text-white shadow-[inset_3px_0_0_#d4a21f]' : 'hover:bg-white/5 hover:text-white')}>
            <LayoutDashboard size={17} />{showLabels && 'Dashboard'}
          </NavLink>
          {NAV.map((g) => (
            <div key={g.label} className="mb-0.5">
              <button onClick={() => (collapsed && !mobileOpen ? (setCollapsed(false), setOpen({ ...open, [g.label]: true })) : setOpen({ ...open, [g.label]: !isOpen(g) }))} title={g.label}
                className={cx('flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/5 hover:text-white', isActiveGroup(g.base) && 'text-white')}>
                {g.icon}{showLabels && <><span className="flex-1 text-left">{g.label}</span><ChevronDown size={14} className={cx('transition-transform', isOpen(g) && 'rotate-180')} /></>}
              </button>
              {showLabels && isOpen(g) && (
                <div className="ml-[26px] mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                  {g.items.map((it) => (
                    <NavLink key={it.to + it.label} to={it.to} end={it.end} onClick={closeMobile} className={({ isActive }) => cx('block rounded px-2.5 py-1.5 text-[13px]', isActive ? 'bg-white/10 font-medium text-gold-400' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>{it.label}</NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <button onClick={() => setCollapsed(!collapsed)} className="hidden items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-slate-400 hover:text-white lg:flex">
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} />Collapse sidebar</>}
        </button>
      </aside>
    </>
  )
}

function useOutside(cb: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) cb() }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) })
  return ref
}

function GlobalSearch() {
  const { s } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false))
  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t.length < 2) return []
    const r: { type: string; label: string; sub: string; to: string }[] = []
    s.products.forEach((p) => {
      if (p.name.toLowerCase().includes(t)) r.push({ type: 'Product', label: p.name, sub: `${p.sku} · ${p.variants.length} variants`, to: `/products/${p.id}` })
      p.variants.filter((v) => v.sku.toLowerCase().includes(t)).slice(0, 3).forEach((v) => r.push({ type: 'SKU', label: v.sku, sub: `${p.name} – ${v.name}`, to: `/products/${p.id}` }))
    })
    s.materials.filter((m) => (m.name + m.sku).toLowerCase().includes(t)).forEach((m) => r.push({ type: 'Material', label: m.name, sub: m.sku, to: '/inventory/raw-materials' }))
    s.employees.filter((e) => (e.name + e.id).toLowerCase().includes(t)).slice(0, 4).forEach((e) => r.push({ type: 'Employee', label: e.name, sub: `${e.id} · ${e.designation}`, to: `/hr/employees/${e.id}` }))
    s.suppliers.filter((x) => x.name.toLowerCase().includes(t)).forEach((x) => r.push({ type: 'Supplier', label: x.name, sub: x.type, to: '/procurement/suppliers' }))
    s.plans.filter((p) => p.id.toLowerCase().includes(t)).forEach((p) => r.push({ type: 'Production Plan', label: p.id, sub: s.products.find((x) => x.id === p.productId)?.name || '', to: `/manufacturing/plans/${p.id}` }))
    s.pos.filter((p) => p.id.toLowerCase().includes(t)).forEach((p) => r.push({ type: 'Purchase Order', label: p.id, sub: s.suppliers.find((x) => x.id === p.supplierId)?.name || '', to: `/procurement/orders?open=${p.id}` }))
    s.orders.filter((o) => (o.id + o.buyerPO).toLowerCase().includes(t)).forEach((o) => r.push({ type: 'Buyer Order', label: o.id, sub: `${o.buyerPO} · ${s.buyers.find((c) => c.id === o.buyer)?.name || ''}`, to: `/merchandising/orders?open=${o.id}` }))
    s.buyers.filter((b) => b.name.toLowerCase().includes(t)).forEach((b) => r.push({ type: 'Buyer', label: b.name, sub: b.country, to: '/merchandising/buyers' }))
    return r.slice(0, 9)
  }, [q, s])
  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true) }} placeholder="Search products, SKUs, employees, orders…" className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200" />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {results.length ? results.map((r, i) => (
            <button key={i} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50" onClick={() => { nav(r.to); setOpen(false); setQ('') }}>
              <div className="min-w-0"><div className="truncate text-sm font-medium text-slate-800">{r.label}</div><div className="truncate text-xs text-slate-500">{r.sub}</div></div>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">{r.type}</span>
            </button>
          )) : <div className="px-3 py-6 text-center text-sm text-slate-500">No results for “{q}”</div>}
        </div>
      )}
    </div>
  )
}

function Notifications() {
  const { s, a } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false))
  const items = useMemo(() => {
    const n: { id: string; level: 'red' | 'amber' | 'green'; text: string; to: string }[] = []
    s.materials.filter((m) => matStatus(m) !== 'Healthy').slice(0, 3).forEach((m) => n.push({ id: `low-${m.id}-${matStatus(m)}`, level: matStatus(m) === 'Critical' ? 'red' : 'amber', text: `${m.name} is below reorder level.`, to: '/inventory/low-stock' }))
    s.plans.filter((p) => p.status !== 'Completed' && p.status !== 'Cancelled' && !planReady(s, p) && planRequirements(s, p.productId, p.target).length).slice(0, 2).forEach((p) => n.push({ id: `short-${p.id}`, level: 'amber', text: `Production ${p.id} has a material shortage.`, to: `/manufacturing/plans/${p.id}` }))
    s.pos.filter((p) => p.status === 'Draft').forEach((p) => n.push({ id: `po-${p.id}`, level: 'amber', text: `Purchase Order ${p.id} is awaiting approval.`, to: `/procurement/orders?open=${p.id}` }))
    s.plans.filter((p) => p.qcStatus === 'Passed').forEach((p) => n.push({ id: `qc-${p.id}`, level: 'green', text: `${p.qcPassed.toLocaleString()} finished units passed QC (${p.id}).`, to: '/manufacturing/qc' }))
    s.leaves.filter((l) => l.status === 'Pending').slice(0, 1).forEach((l) => n.push({ id: `lv-${l.id}`, level: 'amber', text: 'Employee leave request requires approval.', to: '/hr/leave' }))
    return n
  }, [s])
  const unread = items.filter((i) => !s.readNotifs.includes(i.id)).length
  const dot = { red: 'bg-red-500', amber: 'bg-amber-500', green: 'bg-emerald-500' }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications"><Bell size={18} />{unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unread}</span>}</button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-[340px] max-w-[92vw] rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5"><span className="text-sm font-semibold">Notifications</span><button className="text-xs text-brand-600 hover:underline" onClick={() => items.forEach((i) => a.markNotifRead(i.id))}>Mark all read</button></div>
          <div className="max-h-96 overflow-y-auto">
            {items.length ? items.map((i) => (
              <button key={i.id} onClick={() => { a.markNotifRead(i.id); setOpen(false); nav(i.to) }} className={cx('flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50', s.readNotifs.includes(i.id) && 'opacity-60')}>
                <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', dot[i.level])} /><span className="text-sm text-slate-700">{i.text}</span>
              </button>
            )) : <div className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateMenu() {
  const { a } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useOutside(() => setOpen(false))
  const items: [string, () => void][] = [
    ['Style / Product', () => nav('/products/new')], ['Buyer Order', () => a.openModal('order')], ['Buyer', () => a.openModal('buyer')], ['Country', () => a.openModal('country')], ['Production Plan', () => nav('/manufacturing/plans/new')], ['Purchase Requirement', () => a.openModal('requirement')],
    ['Purchase Order', () => a.openModal('po')], ['Employee', () => a.openModal('employee')], ['Warehouse', () => a.openModal('warehouse')],
    ['Receive Material', () => a.openModal('receive')], ['Stock Adjustment', () => a.openModal('adjust')],
  ]
  return (
    <div ref={ref} className="relative">
      <button className="btn-primary" onClick={() => setOpen(!open)}><Plus size={16} /><span className="hidden sm:inline">Create</span></button>
      {open && <div className="absolute right-0 top-full z-40 mt-1 w-56 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
        {items.map(([l, fn]) => <button key={l} className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setOpen(false); fn() }}>{l}</button>)}
      </div>}
    </div>
  )
}

function Toasts() {
  const { toasts, dismissToast } = useUI()
  const ic = { success: <CheckCircle2 size={18} className="text-emerald-500" />, error: <AlertCircle size={18} className="text-red-500" />, info: <Info size={18} className="text-blue-500" /> }
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="slidein pointer-events-auto flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          {ic[t.kind]}<div className="flex-1 text-sm text-slate-800">{t.msg}</div><button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
        </div>
      ))}
    </div>
  )
}

function Gate() {
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 260); return () => clearTimeout(t) }, [])
  return loading ? <><div className="fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden"><div className="wa-loadbar h-full w-1/3 bg-gradient-to-r from-gold-400 to-gold-600" /></div><LoadingState /></> : <div className="page"><Outlet /></div>
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => { try { const v = localStorage.getItem('wa-theme'); if (v) return v === 'dark' } catch { /* ignore */ } return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false })
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); try { localStorage.setItem('wa-theme', dark ? 'dark' : 'light') } catch { /* ignore */ } }, [dark])
  return (
    <button onClick={() => setDark(!dark)} className="relative h-8 w-14 shrink-0 rounded-full border border-slate-200 bg-slate-100 transition-colors" title={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme">
      <span className={cx('absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full shadow transition-all duration-300', dark ? 'left-[30px] bg-gold-500 text-brand-900' : 'left-0.5 bg-white text-gold-600')}>{dark ? <Moon size={14} /> : <Sun size={14} />}</span>
    </button>
  )
}

function Splash() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in')
  useEffect(() => { const a = setTimeout(() => setPhase('out'), 1700); const b = setTimeout(() => setPhase('gone'), 2200); return () => { clearTimeout(a); clearTimeout(b) } }, [])
  if (phase === 'gone') return null
  return (
    <div className={cx('fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-ink-900 via-brand-900 to-[#16275f] transition-opacity duration-500', phase === 'out' && 'pointer-events-none opacity-0')}>
      <LogoMark size={104} draw className="drop-shadow-[0_8px_30px_rgba(212,162,31,.35)]" />
      <div className="mt-5 font-display text-3xl font-bold tracking-[.2em] text-white" style={{ animation: 'fadeup .8s .5s both' }}>WINNER</div>
      <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[.6em] text-gold-400" style={{ animation: 'fadeup .8s .7s both' }}>Apparels</div>
      <div className="mt-8 h-[3px] w-44 overflow-hidden rounded-full bg-white/10"><div className="wa-loadbar h-full w-1/3 rounded-full bg-gradient-to-r from-gold-400 to-gold-600" /></div>
      <div className="mt-3 text-xs text-slate-400" style={{ animation: 'fadein 1s 1s both' }}>Preparing your workspace…</div>
    </div>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setMobile(false); window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobile} closeMobile={() => setMobile(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobile(true)}><Menu size={20} /></button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 md:inline-flex" title="All data shown is sample data"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Demo Environment</span>
            <div className="hidden border-l border-slate-200 pl-3 text-right leading-tight 22xl:block"><div className="text-xs font-semibold text-slate-800">Winner Apparels Ltd.</div><div className="text-[11px] text-slate-500">Gazipur Factory</div></div>
            <ThemeToggle />
            <CreateMenu />
            <Notifications />
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-xs font-semibold text-brand-900">SS</div>
              <div className="hidden leading-tight sm:block"><div className="text-xs font-semibold text-slate-800">Safayet Shawon</div><div className="text-[11px] text-slate-500">Administrator</div></div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto"><div className="mx-auto max-w-[1500px] p-4 lg:p-6"><Gate key={pathname} /></div></main>
      </div>
      <ModalHost />
      <Toasts />
      <Splash />
    </div>
  )
}
