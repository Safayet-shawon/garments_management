import { cloneElement, isValidElement, memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDebounced } from './hooks'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Inbox, MoreHorizontal, RotateCw, Search, Upload, X, ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Spinner } from './Logo'

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ')
export const usd = (n: number, d = 0) => `$ ${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
export const money = (n: number, d = 0) => `৳ ${fmt(n, d)}`
export const fmtDate = (iso: string) => { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: y === 2026 ? undefined : 'numeric' }) }

export function useCountUp(target: number, on = true, ms = 900) {
  const [val, setVal] = useState(on ? 0 : target)
  const from = useRef(on ? 0 : target)
  useEffect(() => {
    if (!on) { setVal(target); return }
    const start = performance.now(), a = from.current
    let raf = 0
    const tick = (t: number) => { const p = Math.min(1, (t - start) / ms); const e = 1 - Math.pow(1 - p, 3); const v = a + (target - a) * e; setVal(v); from.current = v; if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, on, ms])
  return val
}
export const Money = ({ v, d = 0, className, animate, cur }: { v: number; d?: number; className?: string; animate?: boolean; cur?: 'USD' }) => { const x = useCountUp(v, !!animate); const val = animate ? (d ? x : Math.round(x)) : v; return <span className={cx('tabular-nums', className)}>{cur === 'USD' ? usd(val, d) : money(val, d)}</span> }
export const Usd = (p: { v: number; d?: number; className?: string; animate?: boolean }) => <Money {...p} cur="USD" />
const CountText = ({ text }: { text: string }) => { const m = text.match(/^([\d,]+)(.*)$/); const n = m ? parseInt(m[1].replace(/,/g, ''), 10) : 0; const x = useCountUp(n, !!m); return m ? <>{fmt(Math.round(x))}{m[2]}</> : <>{text}</> }
export const Qty = ({ v, unit, d = 0 }: { v: number; unit?: string; d?: number }) => <span className="tabular-nums">{fmt(v, d)}{unit && <span className="ml-1 text-slate-400 text-xs">{unit}</span>}</span>

const tone: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20', blue: 'bg-blue-50 text-blue-700 ring-blue-600/20', gray: 'bg-slate-100 text-slate-600 ring-slate-500/20', gold: 'bg-gold-50 text-gold-600 ring-gold-500/30',
}
const statusTone: Record<string, string> = {
  Active: 'green', Approved: 'green', Completed: 'green', Healthy: 'green', Ready: 'green', Received: 'green', Paid: 'green', Present: 'green', Passed: 'green', Delivered: 'green', Closed: 'gray', Normal: 'gray',
  'Moved to Finished Goods': 'green', 'Payslips Generated': 'blue', 'Good': 'green',
  Low: 'amber', Pending: 'amber', Late: 'amber', Short: 'amber', 'Pending Purchase': 'amber', 'Pending Approval': 'amber', Planned: 'gray', Draft: 'gray', Processing: 'blue', High: 'amber', COD: 'amber', Probation: 'amber', Leave: 'blue', 'On Leave': 'blue',
  Critical: 'red', Rejected: 'red', Absent: 'red', Cancelled: 'red', Inactive: 'gray', Archived: 'gray', Urgent: 'red', Overdue: 'red',
  'In Progress': 'blue', Ordered: 'blue', 'Partially Received': 'amber', Shipped: 'blue', 'PO Created': 'blue', Calculated: 'blue', Reviewed: 'amber', Contract: 'blue', Permanent: 'gray', Info: 'blue',
  Sampling: 'amber', 'In Production': 'blue', 'Ready to Ship': 'gold', 'LC at sight': 'gray', Issued: 'gray', RECEIPT: 'green', ISSUE: 'amber', ADJUSTMENT: 'blue', TRANSFER: 'gray', RETURN: 'amber', PRODUCTION_CONSUMPTION: 'red', PRODUCTION_OUTPUT: 'green',
}
export const StatusBadge = memo(({ status, label, color }: { status: string; label?: string; color?: string }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', tone[color || statusTone[status] || 'gray'])}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{label ?? status.replace(/_/g, ' ')}
  </span>
))

export const PageHeader = ({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: ReactNode; back?: string }) => (
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div>
      {back && <Link to={back} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600"><ChevronLeft size={14} />Back</Link>}
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
)

export const StatCard = ({ label, value, sub, icon, accent = 'brand', to, onClick }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: 'brand' | 'green' | 'amber' | 'red' | 'blue'; to?: string; onClick?: () => void }) => {
  const acc = { brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', blue: 'bg-blue-50 text-blue-600' }[accent]
  const inner = (
    <div className={cx('card flex items-start justify-between gap-2 p-4', (to || onClick) && 'cursor-pointer', onClick && 'lift')} onClick={onClick}>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{typeof value === 'number' ? <CountText text={String(value)} /> : typeof value === 'string' ? <CountText text={value} /> : isValidElement(value) && typeof (value.props as any).v === 'number' ? cloneElement(value as any, { animate: true }) : value}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
      </div>
      {icon && <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', acc)}>{icon}</div>}
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export const ProgressBar = memo(({ value, color = 'brand', showLabel = true, h = 'h-2' }: { value: number; color?: string; showLabel?: boolean; h?: string }) => {
  const c = value >= 100 ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : color === 'red' ? 'bg-red-500' : 'bg-gradient-to-r from-gold-400 to-gold-500'
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t) }, [])
  return (
    <div className="flex items-center gap-2">
      <div className={cx('w-full min-w-[60px] overflow-hidden rounded-full bg-slate-100', h)}><div className={cx('h-full rounded-full transition-all duration-1000 ease-out', c)} style={{ width: mounted ? `${Math.min(100, Math.max(0, value))}%` : '0%' }} /></div>
      {showLabel && <span className="w-9 text-right text-xs tabular-nums text-slate-500">{Math.round(value)}%</span>}
    </div>
  )
})

export const Card = ({ title, action, children, className, pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) => (
  <section className={cx('card', className)}>
    {title && <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">{title}</h2>{action}</header>}
    <div className={pad ? 'p-4' : ''}>{children}</div>
  </section>
)

export const Tabs = ({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) => (
  <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
    {tabs.map((t) => (
      <button key={t} onClick={() => onChange(t)} className={cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors', active === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>{t}</button>
    ))}
  </div>
)

export const Modal = ({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) => {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal-pop flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl', wide ? 'max-w-3xl' : 'max-w-xl')}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5"><h3 className="text-base font-semibold text-slate-900">{title}</h3><button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button></header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:rounded-b-xl">{footer}</footer>}
      </div>
    </div>
  )
}

export const Drawer = ({ title, subtitle, onClose, children, footer, width = 'max-w-xl' }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string }) => {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={cx('slidein flex h-full w-full flex-col bg-white shadow-2xl', width)}>
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><h3 className="text-base font-semibold text-slate-900">{title}</h3>{subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}</div><button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button></header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</footer>}
      </aside>
    </div>
  )
}

export const ConfirmDialog = ({ title, message, confirmLabel, danger, onConfirm, onClose }: { title: string; message: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) => (
  <Modal title={title} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button></>}>
    <div className="flex gap-3"><div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600')}>{danger ? <AlertTriangle size={18} /> : <Check size={18} />}</div><div className="pt-1.5 text-sm text-slate-600">{message}</div></div>
  </Modal>
)

export const useConfirm = () => {
  const [c, setC] = useState<null | { title: string; message: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void }>(null)
  const el = c ? <ConfirmDialog {...c} onClose={() => setC(null)} /> : null
  return { ask: setC, el }
}

export const FormField = ({ label, children, hint, required, className }: { label: string; children: ReactNode; hint?: string; required?: boolean; className?: string }) => (
  <label className={cx('block', className)}>
    <span className="mb-1 block text-xs font-medium text-slate-600">{label}{required && <span className="text-red-500"> *</span>}</span>
    {children}{hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
  </label>
)
export const Select = ({ value, onChange, options, placeholder, className }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; placeholder?: string; className?: string }) => (
  <select className={cx('input', className)} value={value} onChange={(e) => onChange(e.target.value)}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
)
export const DatePicker = ({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) => <input type="date" className={cx('input', className)} value={value} onChange={(e) => onChange(e.target.value)} />
export const SearchInput = ({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
  <div className={cx('relative', className)}><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-8" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>
)
export const FilterDropdown = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <select className="input w-auto min-w-[130px]" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
    <option value="">{label}: All</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
)

export const EmptyState = ({ title, text, action }: { title: string; text?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={22} /></div>
    <div className="text-sm font-semibold text-slate-800">{title}</div>
    {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)
export const ErrorState = ({ title, text, onRetry }: { title: string; text?: string; onRetry: () => void }) => (
  <div className="card flex flex-col items-center px-4 py-16 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500"><AlertTriangle size={22} /></div>
    <div className="text-base font-semibold text-slate-900">{title}</div>
    <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
    <button className="btn-primary mt-4" onClick={onRetry}><RotateCw size={14} />Try Again</button>
  </div>
)
const Sk = ({ className }: { className?: string }) => <div className={cx('shimmer rounded', className)} />
export const LoadingState = ({ kind = 'page' }: { kind?: 'page' | 'table' }) => (
  <div>
    <div className="mb-4 flex items-center gap-3 text-sm text-slate-500"><Spinner size={22} />Loading Winner Apparels data…</div>
    <Sk className="mb-5 h-7 w-56" />
    {kind === 'page' && <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-24" />)}</div>}
    <div className="card p-4"><Sk className="mb-4 h-9 w-72" />{Array.from({ length: 7 }).map((_, i) => <Sk key={i} className="mb-2 h-9" />)}</div>
  </div>
)

export const Timeline = ({ steps, current }: { steps: string[]; current: number }) => (
  <ol className="relative">
    {steps.map((s, i) => (
      <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
        {i < steps.length - 1 && <span className={cx('absolute left-[11px] top-6 h-full w-0.5', i < current ? 'bg-emerald-400' : 'bg-slate-200')} />}
        <span className={cx('z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs', i < current ? 'border-emerald-500 bg-emerald-500 text-white' : i === current ? 'border-brand-600 bg-white text-brand-600' : 'border-slate-300 bg-white text-slate-300')}>
          {i < current ? <Check size={13} /> : <span className="h-2 w-2 rounded-full bg-current" />}
        </span>
        <div className={cx('pt-0.5 text-sm', i <= current ? 'font-medium text-slate-900' : 'text-slate-400')}>{s}{i === current && <span className="ml-2 text-xs font-normal text-brand-600">Current</span>}</div>
      </li>
    ))}
  </ol>
)

// Horizontal stepper (for PO status, payroll workflow)
export const Stepper = ({ steps, current }: { steps: string[]; current: number }) => (
  <div className="flex w-full items-center overflow-x-auto pb-1">
    {steps.map((s, i) => (
      <div key={s} className="flex flex-1 items-center last:flex-none">
        <div className="flex flex-col items-center gap-1">
          <span className={cx('flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors', i < current ? 'border-emerald-500 bg-emerald-500 text-white' : i === current ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-400')}>{i < current ? <Check size={14} /> : i + 1}</span>
          <span className={cx('whitespace-nowrap text-[11px] font-medium', i <= current ? 'text-slate-800' : 'text-slate-400')}>{s}</span>
        </div>
        {i < steps.length - 1 && <div className={cx('mx-2 mb-4 h-0.5 min-w-[18px] flex-1', i < current ? 'bg-emerald-400' : 'bg-slate-200')} />}
      </div>
    ))}
  </div>
)

export const ActivityFeed = ({ items }: { items: { id: string; icon: string; text: string; by: string; time: string }[] }) => (
  <ul className="divide-y divide-slate-100">
    {items.map((a) => (
      <li key={a.id} className="flex gap-3 py-2.5">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
        <div className="min-w-0"><div className="text-sm text-slate-700">{a.text}</div><div className="text-xs text-slate-400">{a.by} · {a.time}</div></div>
      </li>
    ))}
  </ul>
)

export const FileUploadTile = ({ label, preview, color, onPick, onClear }: { label: string; preview?: string; color?: string; onPick: (url: string) => void; onClear: () => void }) => {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="group">
      <div onClick={() => !preview && ref.current?.click()} className={cx('relative flex aspect-[4/5] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed text-center transition', preview ? 'border-transparent' : 'border-slate-300 bg-slate-50 hover:border-brand-500 hover:bg-brand-50')}>
        {preview ? (
          <>
            {preview.startsWith('sample:') ? <SampleShirt type={preview.slice(7)} /> : <img src={preview} alt={label} className="h-full w-full object-cover" />}
            <button onClick={(e) => { e.stopPropagation(); onClear() }} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-slate-600 opacity-0 shadow group-hover:opacity-100"><X size={13} /></button>
            <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white"><Check size={10} />Uploaded</span>
          </>
        ) : (
          <div className="px-2 text-xs text-slate-500"><Upload size={18} className="mx-auto mb-1 text-slate-400" />Click to upload<br /><span className="text-[10px] text-slate-400">PNG, JPG</span></div>
        )}
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(URL.createObjectURL(f)) }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-600"><span>{label}</span>{!preview && <button className="text-[11px] font-normal text-brand-600 hover:underline" onClick={() => onPick(`sample:${color || 'tee'}`)}>Use sample</button>}</div>
    </div>
  )
}
const swatch: Record<string, string> = { Green: '#3f8f5f', White: '#f1f5f9', Black: '#1f2937', Blue: '#3b6fc9', Navy: '#1e3a6e', Grey: '#94a3b8', Red: '#c0392b', Khaki: '#c3b091', Olive: '#6b7a3a', Indigo: '#3f3f8f', Maroon: '#7b2d3b', Beige: '#d9c7a3', Charcoal: '#4b5563' }
export const colorHex = (c: string) => swatch[c] || '#94a3b8'
export const SampleShirt = ({ type = 'tee', alt = 'Product photo' }: { type?: string; alt?: string; color?: string }) => (
  <img src={`/img/products/${type}-320.webp`} alt={alt} width={320} height={400} loading="lazy" decoding="async" className="h-full w-full object-cover" />
)
export const ImagePlaceholder = () => <div className="flex h-full items-center justify-center bg-slate-100 text-slate-300"><ImageIcon /></div>

// ------------ Row actions menu ------------
export type RowAction<T> = { label: string; onClick: (r: T) => void; danger?: boolean }
export function RowMenu<T>({ row, actions }: { row: T; actions: RowAction<T>[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setOpen(!open)} aria-label="Row actions"><MoreHorizontal size={16} /></button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {actions.map((a) => <button key={a.label} className={cx('block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50', a.danger ? 'text-red-600' : 'text-slate-700')} onClick={() => { setOpen(false); a.onClick(row) }}>{a.label}</button>)}
        </div>
      )}
    </div>
  )
}

// ------------ DataTable ------------
export type Column<T> = { key: string; header: string; render?: (r: T) => ReactNode; sort?: (r: T) => string | number; search?: (r: T) => string; className?: string; align?: 'right' }
export type Filter<T> = { label: string; options: string[]; get: (r: T) => string }

export function DataTable<T>({ rows, columns, filters = [], rowKey, onRowClick, actions, pageSize = 10, searchPlaceholder, empty, toolbar, defaultSort }: {
  rows: T[]; columns: Column<T>[]; filters?: Filter<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; actions?: RowAction<T>[] | ((r: T) => RowAction<T>[])
  pageSize?: number; searchPlaceholder?: string; empty?: ReactNode; toolbar?: ReactNode; defaultSort?: { key: string; dir: 1 | -1 }
}) {
  const [q, setQ] = useState('')
  const [fv, setFv] = useState<string[]>(filters.map(() => ''))
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(defaultSort || null)
  const [page, setPage] = useState(0)
  const colsRef = useRef(columns); colsRef.current = columns
  const filtersRef = useRef(filters); filtersRef.current = filters
  const dq = useDebounced(q, 200) // typing never re-filters the whole table on every keystroke
  const data = useMemo(() => {
    let d = rows
    const cols = colsRef.current
    if (dq) { const t = dq.toLowerCase(); d = d.filter((r) => cols.some((c) => (c.search ? c.search(r) : c.sort ? String(c.sort(r)) : '').toLowerCase().includes(t))) }
    filtersRef.current.forEach((f, i) => { if (fv[i]) d = d.filter((r) => f.get(r) === fv[i]) })
    if (sort) { const c = cols.find((x) => x.key === sort.key); if (c?.sort) { const key = c.sort; d = [...d].sort((x, y) => { const m = key(x), n = key(y); return (m > n ? 1 : m < n ? -1 : 0) * sort.dir }) } }
    return d
  }, [rows, dq, fv, sort])
  const pages = Math.max(1, Math.ceil(data.length / pageSize))
  const cur = Math.min(page, pages - 1)
  const view = data.slice(cur * pageSize, cur * pageSize + pageSize)

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder={searchPlaceholder} className="w-full sm:w-64" />
        {filters.map((f, i) => <FilterDropdown key={f.label} label={f.label} options={f.options} value={fv[i]} onChange={(v) => { setFv(fv.map((x, j) => (j === i ? v : x))); setPage(0) }} />)}
        <div className="ml-auto flex items-center gap-2">{toolbar}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="border-b border-slate-200">
            {columns.map((c) => (
              <th key={c.key} className={cx('th', c.align === 'right' && 'text-right', c.sort && 'cursor-pointer select-none hover:text-slate-800')} onClick={() => c.sort && setSort(sort?.key === c.key ? { key: c.key, dir: (sort.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 })}>
                <span className="inline-flex items-center gap-1">{c.header}{c.sort && (sort?.key === c.key ? (sort.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="opacity-40" />)}</span>
              </th>
            ))}
            {actions && <th className="th w-10" />}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {view.map((r) => (
                <tr key={rowKey(r)} className={cx('hover:bg-slate-50/80', onRowClick && 'cursor-pointer')} onClick={() => onRowClick?.(r)}>
                  {columns.map((c) => <td key={c.key} className={cx('td', c.align === 'right' && 'text-right', c.className)}>{c.render ? c.render(r) : String((r as any)[c.key] ?? '')}</td>)}
                  {actions && <td className="td w-10"><RowMenu row={r} actions={typeof actions === 'function' ? actions(r) : actions} /></td>}
                </tr>
              ))}
          </tbody>
        </table>
        {!view.length && (empty || <EmptyState title="No records found" text="Try adjusting your search or filters." />)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
        <span>{data.length ? `${cur * pageSize + 1}–${Math.min(data.length, cur * pageSize + pageSize)} of ${data.length}` : '0 results'}</span>
        <div className="flex items-center gap-1">
          <button className="btn-ghost btn-sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronLeft size={14} /></button>
          <span className="px-1">Page {cur + 1} / {pages}</span>
          <button className="btn-ghost btn-sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}><ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  )
}

export const Pagination = null
