import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Mail } from 'lucide-react'
import { api, type Inquiry } from '../api'
import { useStore, useUI } from '../store'
import { Drawer, EmptyState, ErrorState, PageHeader, SearchInput, Select, StatusBadge, fmtDate } from '../ui'
import { useDebounced } from '../hooks'

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost', 'converted']
const tone: Record<string, string> = { new: 'amber', contacted: 'blue', quoted: 'gold', won: 'green', lost: 'red', converted: 'green' }

export default function Inquiries() {
  const { s, a } = useStore()
  const live = useUI().sync.mode === 'live'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const dSearch = useDebounced(search, 300)
  const [data, setData] = useState<{ items: Inquiry[]; total: number; page: number; pages: number } | null>(null)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState<Inquiry | null>(null)
  const limit = 12

  const load = useCallback(() => {
    if (!live) return
    setError(false)
    api.inquiries({ page, limit, search: dSearch, status }).then(setData).catch(() => setError(true))
  }, [live, page, dSearch, status])
  useEffect(load, [load])
  useEffect(() => setPage(1), [dSearch, status])

  const setSt = async (i: Inquiry, st: string) => {
    try { await api.setInquiryStatus(i.id, st); a.toast(`Inquiry marked ${st}`); setOpen({ ...i, status: st }); load() } catch { a.toast('Could not update the inquiry', 'error') }
  }
  const convert = async (i: Inquiry) => {
    const country = s.countries.find((c) => c.name.toLowerCase() === i.country.toLowerCase())?.code ?? 'US'
    const merchandiser = s.employees.find((e) => e.dept === 'Merchandising')?.id ?? ''
    a.addBuyer({ name: i.company || i.name, type: 'Brand', country, contact: i.name, email: i.email, merchandiser, term: 'LC at sight' })
    await setSt(i, 'converted')
  }

  if (!live) return <><PageHeader title="Website Inquiries" subtitle="Requests from the public contact form" /><EmptyState title="Connect the API to see inquiries" text="Inquiries are stored in the database. Start the server (npm run dev) and sign in to view them here." /></>
  return (
    <>
      <PageHeader title="Website Inquiries" subtitle="Quote requests from the public website, newest first" />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, company, message…" className="w-full sm:w-72" />
          <Select className="w-auto min-w-[150px]" value={status} onChange={setStatus} placeholder="Status: All" options={STATUSES} />
          <span className="ml-auto text-xs text-slate-500">{data ? `${data.total} inquiries` : ''}</span>
        </div>
        {error ? <div className="p-6"><ErrorState title="Unable to load inquiries." text="Check the connection and try again." onRetry={load} /></div> : !data ? <div className="p-6 text-sm text-slate-500">Loading…</div> : !data.items.length ? <EmptyState title="No inquiries found" text="New requests from the contact form will appear here." /> : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr><th className="th">Received</th><th className="th">From</th><th className="th">Company</th><th className="th">Interest</th><th className="th text-right">Qty</th><th className="th">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{data.items.map((i) => (
              <tr key={i.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(i)}>
                <td className="td">{fmtDate(i.created_at.slice(0, 10))}</td><td className="td"><b className="text-slate-900">{i.name}</b><div className="text-xs text-slate-400">{i.email}</div></td>
                <td className="td">{i.company || '—'}<div className="text-xs text-slate-400">{i.country}</div></td><td className="td">{i.interest || '—'}</td><td className="td text-right tabular-nums">{i.quantity ?? '—'}</td>
                <td className="td"><StatusBadge status={i.status} color={tone[i.status]} label={i.status[0].toUpperCase() + i.status.slice(1)} /></td></tr>))}</tbody></table></div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
          <span>Page {data?.page ?? 1} of {data?.pages ?? 1}</span>
          <div className="flex gap-1"><button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button><button className="btn-ghost btn-sm" disabled={!data || page >= data.pages} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button></div>
        </div>
      </div>
      {open && (
        <Drawer title={open.name} subtitle={`${open.company || 'No company'} · ${open.country || 'Country not given'}`} onClose={() => setOpen(null)}
          footer={<><a className="btn-secondary" href={`mailto:${open.email}?subject=${encodeURIComponent('Your Winner Apparels quote request')}`}><Mail size={14} />Reply by email</a>{open.status !== 'converted' && <button className="btn-primary" onClick={() => convert(open)}>Convert to buyer</button>}</>}>
          <dl className="grid grid-cols-2 gap-4 text-sm">{[['Email', open.email], ['Style', open.interest || '—'], ['Quantity', open.quantity ? `${open.quantity.toLocaleString()} pcs` : '—'], ['Received', new Date(open.created_at).toLocaleString()]].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}</dl>
          <h4 className="mb-1 mt-6 text-xs font-semibold uppercase text-slate-500">Message</h4>
          <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">{open.message}</p>
          <h4 className="mb-2 mt-6 text-xs font-semibold uppercase text-slate-500">Status</h4>
          <div className="flex flex-wrap gap-2">{STATUSES.filter((s) => s !== 'converted').map((s) => <button key={s} className={`chip ${open.status === s ? 'chip-on' : ''}`} onClick={() => setSt(open, s)}>{s}</button>)}</div>
        </Drawer>
      )}
    </>
  )
}
