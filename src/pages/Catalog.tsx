import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useStore, reservedFor, productOf } from '../store'
import { brandCode, catCode, fobOf, genVariants, type BomLine, type Product, type Variant } from '../data'
import { Card, DataTable, EmptyState, FileUploadTile, FormField, Money, usd, PageHeader, Select, StatusBadge, Stepper, Tabs, cx, fmt, fmtDate, useConfirm, colorHex, SampleShirt } from '../ui'

export function Products() {
  const { s, a } = useStore()
  const nav = useNavigate()
  const { ask, el } = useConfirm()
  return (
    <>
      <PageHeader title="Styles" subtitle="Garment styles with variants, SKUs, FOB prices and live finished stock" actions={<><button className="btn-secondary" onClick={() => a.toast('Export started – products.csv (demo)', 'info')}>Export</button><Link to="/products/new" className="btn-primary"><Plus size={15} />Create Style</Link></>} />
      <DataTable
        rows={s.products} rowKey={(p) => p.id} onRowClick={(p) => nav(`/products/${p.id}`)} pageSize={8} searchPlaceholder="Search name, SKU, brand…"
        filters={[{ label: 'Category', options: [...new Set(s.products.map((p) => p.category))], get: (p) => p.category }, { label: 'Label', options: [...new Set(s.products.map((p) => p.brand))], get: (p) => p.brand }, { label: 'Status', options: ['Active', 'Draft', 'Archived'], get: (p) => p.status }]}
        columns={[
          { key: 'name', header: 'Product', sort: (p) => p.name, search: (p) => `${p.name} ${p.sku} ${p.variants.map((v) => v.sku).join(' ')}`, render: (p) => <div className="flex items-center gap-3"><div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200"><SampleShirt color={p.variants[0]?.combo.Color || 'Grey'} /></div><span className="font-medium text-slate-900">{p.name}</span></div> },
          { key: 'sku', header: 'SKU', sort: (p) => p.sku, render: (p) => <span className="font-mono text-xs text-slate-600">{p.sku}</span> },
          { key: 'category', header: 'Category', sort: (p) => p.category, search: (p) => p.category },
          { key: 'brand', header: 'Buyer Label', sort: (p) => p.brand, search: (p) => p.brand },
          { key: 'variants', header: 'Variants', sort: (p) => p.variants.length, render: (p) => p.variants.length },
          { key: 'status', header: 'Status', sort: (p) => p.status, render: (p) => <StatusBadge status={p.status} /> },
          { key: 'stock', header: 'Stock', sort: (p) => p.stock, align: 'right', render: (p) => <span className="tabular-nums">{fmt(p.stock)} pcs</span> },
          { key: 'price', header: 'FOB Price', sort: (p) => fobOf(p), align: 'right', render: (p) => <span className="tabular-nums">{usd(fobOf(p), 2)}</span> },
          { key: 'updated', header: 'Updated', sort: (p) => p.updated, render: (p) => fmtDate(p.updated) },
        ]}
        actions={(p) => [
          { label: 'View', onClick: () => nav(`/products/${p.id}`) }, { label: 'Edit', onClick: () => nav(`/products/${p.id}`) },
          { label: 'Duplicate', onClick: () => a.duplicateProduct(p.id) },
          { label: p.status === 'Archived' ? 'Restore' : 'Archive', onClick: () => a.patchProduct(p.id, { status: p.status === 'Archived' ? 'Active' : 'Archived' }, p.status === 'Archived' ? 'Product restored' : 'Product archived') },
          { label: 'Delete', danger: true, onClick: () => ask({ title: 'Delete Style?', message: <>This action cannot be undone. <b>{p.name}</b> and its {p.variants.length} variants will be removed.</>, confirmLabel: 'Delete Style', danger: true, onConfirm: () => a.deleteProduct(p.id) }) },
        ]}
        empty={<EmptyState title="No products found" text="Create your first product to start building your catalog." action={<Link to="/products/new" className="btn-primary">Create Style</Link>} />}
      />
      {el}
    </>
  )
}

const ATTR_CATALOG: Record<string, string[]> = {
  Size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'], Color: ['Green', 'White', 'Black', 'Blue', 'Navy', 'Grey', 'Red', 'Khaki'],
  Fabric: ['Cotton', 'Premium Cotton', 'Polyester', 'Denim', 'Fleece'], RAM: ['8GB', '16GB', '32GB'], Storage: ['128GB', '256GB', '512GB', '1TB'],
}
const SLOTS = ['Front', 'Back', 'Side', 'Detail']
const STEPS = ['Basic Information', 'Attributes', 'Variants', 'Images', 'Review']

export function ProductNew() {
  const { s, a } = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [basic, setBasic] = useState({ name: 'Essential Crew Neck Tee', category: 'T-Shirts', brand: 'Nexora Basics', description: 'Lightweight 160 GSM crew-neck tee for everyday wear.', type: 'Finished Garment', status: 'Active' })
  const [attrs, setAttrs] = useState<Record<string, string[]>>({ Size: ['S', 'M', 'L', 'XL', 'XXL'], Color: ['Green', 'White', 'Black'] })
  const [defPrice, setDefPrice] = useState({ purchase: '420', selling: '850' })
  const initials = basic.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase()
  const basePrefix = `${brandCode(basic.brand)}-${catCode(basic.category)}`
  const prefixDefault = s.products.some((p) => p.sku === basePrefix) ? `${basePrefix}-${initials}` : basePrefix
  const [prefix, setPrefix] = useState('')
  const pfx = prefix || prefixDefault
  const [variants, setVariants] = useState<Variant[]>([])
  const [assoc, setAssoc] = useState('Color')
  const [imgs, setImgs] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)

  const attrKey = JSON.stringify(attrs)
  useEffect(() => {
    setVariants((prev) => {
      const old = new Map(prev.map((v) => [v.name, v]))
      return genVariants(pfx, attrs, +defPrice.purchase || 0, +defPrice.selling || 0).map((v) => { const o = old.get(v.name); return o ? { ...v, purchase: o.purchase, selling: o.selling, status: o.status } : v })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrKey, pfx])

  const toggle = (k: string, v: string) => setAttrs((p) => { const cur = p[k] || []; return { ...p, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } })
  const selectedAttrs = Object.keys(attrs).filter((k) => attrs[k].length)
  const groups = assoc !== 'None' && attrs[assoc]?.length ? attrs[assoc] : []
  const imageCount = Object.values(imgs).length
  const canNext = step === 0 ? basic.name.trim() && basic.category && basic.brand : step === 1 ? variants.length > 0 : true
  const fillSamples = () => { const n: Record<string, string> = {}; groups.forEach((g) => SLOTS.forEach((sl) => (n[`${g}|${sl}`] = `sample:${g}`))); SLOTS.forEach((sl) => (n[`General|${sl}`] = 'sample:Grey')); setImgs(n) }

  const save = () => {
    const first = variants[0]
    const p: Product = {
      id: `p${Date.now()}`, name: basic.name, sku: pfx, category: basic.category, brand: basic.brand, description: basic.description, type: basic.type, status: basic.status as Product['status'],
      variants, stock: 0, price: first?.selling || 0, updated: '2026-10-08', images: imageCount, imageBy: assoc, reorder: 1000,
    }
    a.addProduct(p); nav('/products')
  }
  const bulk = () => { setVariants(variants.map((v) => ({ ...v, purchase: +defPrice.purchase || 0, selling: +defPrice.selling || 0 }))); a.toast('Prices applied to all variants', 'info') }
  const updV = (id: string, patch: Partial<Variant>) => setVariants(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)))

  return (
    <>
      <PageHeader title="Create Style" subtitle="Define the product, choose attributes and let the system generate every variant" back="/products" />
      <div className="card mb-4 p-4"><Stepper steps={STEPS} current={step} /></div>

      {step === 0 && (
        <Card title="Step 1 — Basic Information">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Style Name" required className="md:col-span-2"><input className={cx('input', tried && !basic.name && 'border-red-400')} value={basic.name} onChange={(e) => setBasic({ ...basic, name: e.target.value })} /></FormField>
            <FormField label="Category" required><Select value={basic.category} onChange={(v) => setBasic({ ...basic, category: v })} options={['T-Shirts', 'Polo Shirts', 'Hoodies', 'Shirts', 'Trousers', 'Sweatshirts', 'Jackets']} /></FormField>
            <FormField label="Buyer Label / Brand" required><Select value={basic.brand} onChange={(v) => setBasic({ ...basic, brand: v })} options={['Nexora Basics', 'Urbano Denim', 'Northwind Originals', 'Nordlicht Studio']} /></FormField>
            <FormField label="Product Type"><Select value={basic.type} onChange={(v) => setBasic({ ...basic, type: v })} options={['Finished Garment', 'Accessory', 'Fabric Roll']} /></FormField>
            <FormField label="Status"><Select value={basic.status} onChange={(v) => setBasic({ ...basic, status: v })} options={['Active', 'Draft']} /></FormField>
            <FormField label="Description" className="md:col-span-2"><textarea rows={3} className="input" value={basic.description} onChange={(e) => setBasic({ ...basic, description: e.target.value })} /></FormField>
          </div>
        </Card>
      )}

      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Step 2 — Product Attributes" className="lg:col-span-2">
            <p className="mb-4 text-sm text-slate-500">Pick the attributes that make your product vary. Every combination becomes a variant with its own SKU.</p>
            <div className="space-y-5">
              {Object.entries(ATTR_CATALOG).map(([k, vals]) => (
                <div key={k}>
                  <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-slate-800">{k}</span><span className="text-xs text-slate-400">{(attrs[k] || []).length} selected</span></div>
                  <div className="flex flex-wrap gap-2">
                    {vals.map((v) => { const on = (attrs[k] || []).includes(v); return (
                      <button key={v} onClick={() => toggle(k, v)} className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition', on ? 'border-brand-600 bg-brand-50 font-medium text-brand-700' : 'border-slate-300 text-slate-600 hover:border-slate-400')}>
                        {k === 'Color' && <i className="h-3 w-3 rounded-full border border-black/10" style={{ background: colorHex(v) }} />}{on && <Check size={13} />}{v}
                      </button>) })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card title="Selected values">
              {selectedAttrs.length ? selectedAttrs.map((k) => <div key={k} className="mb-3 last:mb-0"><div className="text-xs font-medium uppercase text-slate-500">{k}</div><div className="mt-1 text-sm text-slate-800">{attrs[k].join(', ')}</div></div>) : <p className="text-sm text-slate-500">No attributes selected yet.</p>}
            </Card>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-800"><Sparkles size={18} /><span className="text-lg font-semibold">{variants.length} variants generated</span></div>
              <div className="mt-1 text-sm text-emerald-700">{selectedAttrs.map((k) => attrs[k].length).join(' × ') || '0'}{selectedAttrs.length > 1 && ` = ${variants.length}`}</div>
            </div>
            <div className="text-xs text-slate-400">Tip: select RAM ×2, Storage ×3 and Color ×3 to see 18 variants.</div>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card title={`Step 3 — Variants (${variants.length})`} pad={false} action={<span className="text-xs text-slate-500">Edit SKU, prices and status inline</span>}>
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
            <FormField label="SKU prefix"><input className="input w-40 font-mono" value={pfx} onChange={(e) => setPrefix(e.target.value.toUpperCase())} /></FormField>
            <FormField label="Default purchase (৳)"><input type="number" className="input w-32" value={defPrice.purchase} onChange={(e) => setDefPrice({ ...defPrice, purchase: e.target.value })} /></FormField>
            <FormField label="Default selling (৳)"><input type="number" className="input w-32" value={defPrice.selling} onChange={(e) => setDefPrice({ ...defPrice, selling: e.target.value })} /></FormField>
            <button className="btn-secondary" onClick={bulk}>Apply to all variants</button>
          </div>
          <div className="max-h-[460px] overflow-auto"><table className="w-full">
            <thead className="sticky top-0"><tr><th className="th">Variant</th><th className="th">Attribute Combination</th><th className="th">SKU</th><th className="th">Purchase Price</th><th className="th">Selling Price</th><th className="th">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{variants.map((v) => (
              <tr key={v.id}><td className="td font-medium text-slate-900">{v.name}</td>
                <td className="td"><div className="flex gap-1">{Object.entries(v.combo).map(([k, val]) => <span key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{k}: {val}</span>)}</div></td>
                <td className="td"><input className="input w-44 py-1 font-mono text-xs" value={v.sku} onChange={(e) => updV(v.id, { sku: e.target.value.toUpperCase() })} /></td>
                <td className="td"><input type="number" className="input w-24 py-1" value={v.purchase} onChange={(e) => updV(v.id, { purchase: +e.target.value })} /></td>
                <td className="td"><input type="number" className="input w-24 py-1" value={v.selling} onChange={(e) => updV(v.id, { selling: +e.target.value })} /></td>
                <td className="td"><button onClick={() => updV(v.id, { status: v.status === 'Active' ? 'Inactive' : 'Active' })}><StatusBadge status={v.status} /></button></td></tr>))}</tbody></table></div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Step 4 — Product Images" action={<button className="btn-secondary btn-sm" onClick={fillSamples}><Sparkles size={13} />Fill with sample images</button>}>
          <div className="mb-5 max-w-xs"><FormField label="Associate images with an attribute?"><Select value={assoc} onChange={setAssoc} options={['None', ...selectedAttrs.filter((k) => ['Color', 'Size', 'Fabric'].includes(k))]} /></FormField></div>
          {groups.map((g) => (
            <div key={g} className="mb-6">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">{assoc === 'Color' && <i className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: colorHex(g) }} />}{g}<span className="text-xs font-normal text-slate-400">{SLOTS.filter((sl) => imgs[`${g}|${sl}`]).length}/4 uploaded</span></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-3xl">{SLOTS.map((sl) => <FileUploadTile key={sl} label={sl} color={g} preview={imgs[`${g}|${sl}`]} onPick={(u) => setImgs({ ...imgs, [`${g}|${sl}`]: u })} onClear={() => { const n = { ...imgs }; delete n[`${g}|${sl}`]; setImgs(n) }} />)}</div>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-5">
            <div className="mb-2 text-sm font-semibold text-slate-800">General Product Images <span className="text-xs font-normal text-slate-400">— not tied to any attribute</span></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-3xl">{SLOTS.map((sl) => <FileUploadTile key={sl} label={sl} preview={imgs[`General|${sl}`]} onPick={(u) => setImgs({ ...imgs, [`General|${sl}`]: u })} onClear={() => { const n = { ...imgs }; delete n[`General|${sl}`]; setImgs(n) }} />)}</div>
          </div>
        </Card>
      )}

      {step === 4 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Step 5 — Review & Save" className="lg:col-span-2">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[['Product', basic.name], ['Category', basic.category], ['Brand', basic.brand], ['Status', basic.status], ['SKU prefix', pfx], ['Variants', `${variants.length} generated`], ['Images', `${imageCount} uploaded${assoc !== 'None' ? ` (by ${assoc})` : ''}`], ['Price range', variants.length ? `৳${fmt(Math.min(...variants.map((v) => v.selling)))} – ৳${fmt(Math.max(...variants.map((v) => v.selling)))}` : '—']].map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
            </dl>
            <div className="mt-5 text-xs font-medium uppercase text-slate-500">Product → Attributes → Variants → SKU</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{variants.slice(0, 12).map((v) => <span key={v.id} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{v.sku}</span>)}{variants.length > 12 && <span className="px-1 text-xs text-slate-400">+{variants.length - 12} more</span>}</div>
          </Card>
          <Card title="What happens next"><ol className="space-y-2 text-sm text-slate-600"><li>1. Product appears in the catalog with {variants.length} SKUs.</li><li>2. Configure its Bill of Materials on the product page.</li><li>3. Create a Production Plan to start manufacturing.</li></ol></Card>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button className="btn-secondary" onClick={() => (step === 0 ? nav('/products') : setStep(step - 1))}><ChevronLeft size={15} />{step === 0 ? 'Cancel' : 'Back'}</button>
        {step < 4 ? <button className="btn-primary" disabled={!canNext} onClick={() => (canNext ? setStep(step + 1) : setTried(true))}>Continue<ChevronRight size={15} /></button> : <button className="btn-primary" onClick={save}><Check size={15} />Save Style</button>}
      </div>
    </>
  )
}

export function ProductDetail() {
  const { id } = useParams()
  const { s, a } = useStore()
  const p = productOf(s, id!)
  const [tab, setTab] = useState('Variants')
  const [lines, setLines] = useState<BomLine[] | null>(null)
  const [demoQty, setDemoQty] = useState('5000')
  if (!p) return <EmptyState title="Product not found" action={<Link to="/products" className="btn-primary">Back to Products</Link>} />
  const reserved = reservedFor(s.orders, p.id)
  const bom = lines ?? s.bom[p.id] ?? []
  const dirty = lines !== null
  const cost = bom.reduce((t, l) => t + l.qty * (s.materials.find((m) => m.id === l.materialId)?.unitCost || 0), 0)
  const setLine = (i: number, patch: Partial<BomLine>) => setLines(bom.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const colors = [...new Set(p.variants.map((v) => v.combo.Color).filter(Boolean))]
  return (
    <>
      <PageHeader title={p.name} subtitle={`${p.category} · ${p.brand} · ${p.sku}`} back="/products" actions={<><StatusBadge status={p.status} /><Link to="/manufacturing/plans/new" className="btn-primary">Create Styleion Plan</Link></>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['On hand', `${fmt(p.stock)} pcs`], ['Reserved', `${fmt(reserved)} pcs`], ['Available', `${fmt(p.stock - reserved)} pcs`], ['Variants', p.variants.length]].map(([l, v]) => <div key={l as string} className="card p-3"><div className="text-xs uppercase text-slate-500">{l}</div><div className="text-xl font-semibold tabular-nums">{v}</div></div>)}
      </div>
      <Tabs tabs={['Variants', 'Bill of Materials', 'Images']} active={tab} onChange={setTab} />
      {tab === 'Variants' && <DataTable rows={p.variants} rowKey={(v) => v.id} pageSize={10} searchPlaceholder="Search variant or SKU…" columns={[
        { key: 'name', header: 'Variant', sort: (v) => v.name, render: (v) => <span className="font-medium text-slate-900">{v.name}</span> },
        { key: 'sku', header: 'SKU', sort: (v) => v.sku, render: (v) => <span className="font-mono text-xs">{v.sku}</span> },
        { key: 'purchase', header: 'Purchase', sort: (v) => v.purchase, align: 'right', render: (v) => <Money v={v.purchase} /> },
        { key: 'selling', header: 'Selling', sort: (v) => v.selling, align: 'right', render: (v) => <Money v={v.selling} /> },
        { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v.status} /> },
      ]} />}
      {tab === 'Bill of Materials' && (
        <Card title={`Bill of Materials — per unit`} action={<div className="flex gap-2">{!bom.length && s.bom.p1 && <button className="btn-secondary btn-sm" onClick={() => setLines(structuredClone(s.bom.p1))}>Start from T-Shirt template</button>}<button className="btn-secondary btn-sm" onClick={() => setLines([...bom, { materialId: s.materials[0].id, qty: 1, unit: s.materials[0].unit }])}><Plus size={13} />Add material</button><button className="btn-primary btn-sm" disabled={!dirty} onClick={() => { a.setBom(p.id, bom); setLines(null) }}>Save BOM</button></div>}>
          {bom.length ? <>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Material</th><th className="th">Qty per unit</th><th className="th">Unit</th><th className="th text-right">Est. cost / unit</th><th className="th w-10" /></tr></thead>
              <tbody className="divide-y divide-slate-100">{bom.map((l, i) => { const m = s.materials.find((x) => x.id === l.materialId)!; return (
                <tr key={i}><td className="td"><Select className="w-52" value={l.materialId} onChange={(v) => setLine(i, { materialId: v, unit: s.materials.find((x) => x.id === v)!.unit })} options={s.materials.map((x) => ({ value: x.id, label: x.name }))} /></td>
                  <td className="td"><input type="number" step="0.01" className="input w-28" value={l.qty} onChange={(e) => setLine(i, { qty: +e.target.value })} /></td>
                  <td className="td"><Select className="w-24" value={l.unit} onChange={(v) => setLine(i, { unit: v })} options={[...new Set(['kg', 'm', 'pcs', 'g', 'roll', m.unit])]} /></td>
                  <td className="td text-right tabular-nums">৳ {fmt(l.qty * m.unitCost, 2)}</td>
                  <td className="td"><button className="text-slate-400 hover:text-red-600" onClick={() => setLines(bom.filter((_, j) => j !== i))}><Trash2 size={15} /></button></td></tr>) })}</tbody></table></div>
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
              <div className="text-sm text-slate-600">Estimated material cost per unit: <b className="text-slate-900">৳ {fmt(cost, 2)}</b><div className="text-xs text-slate-400">Selling price ৳{fmt(p.price)} → material margin {p.price ? Math.round((1 - cost / p.price) * 100) : 0}%</div></div>
              <div className="flex items-end gap-2"><FormField label="Preview requirement for quantity"><input type="number" className="input w-32" value={demoQty} onChange={(e) => setDemoQty(e.target.value)} /></FormField>
                <div className="pb-2 text-xs text-slate-500">{bom.slice(0, 2).map((l) => `${fmt(l.qty * (+demoQty || 0))} ${l.unit} ${s.materials.find((m) => m.id === l.materialId)?.name}`).join(' · ')}…</div></div>
            </div>
          </> : <EmptyState title="No bill of materials yet" text="Define which materials go into one unit of this product so production plans can calculate requirements." action={<button className="btn-primary" onClick={() => setLines([{ materialId: s.materials[0].id, qty: 1, unit: s.materials[0].unit }])}>Add first material</button>} />}
        </Card>
      )}
      {tab === 'Images' && (
        <Card title={`Product Images — grouped by ${p.imageBy}`}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{(colors.length ? colors : ['Grey']).flatMap((c) => ['Front', 'Back', 'Side', 'Detail'].map((sl) => <div key={c + sl}><div className="aspect-[4/5] overflow-hidden rounded-lg border border-slate-200"><SampleShirt color={c} /></div><div className="mt-1 text-xs text-slate-600">{c} · {sl}</div></div>)).slice(0, 12)}</div>
        </Card>
      )}
    </>
  )
}

export function SimpleCatalog({ kind }: { kind: 'categories' | 'brands' | 'attributes' }) {
  const { s } = useStore()
  if (kind === 'attributes') {
    const rows = Object.entries(ATTR_CATALOG).map(([k, v]) => ({ name: k, values: v, used: s.products.filter((p) => p.variants.some((x) => k in x.combo)).length }))
    return <><PageHeader title="Attributes" subtitle="Reusable options that generate product variants" /><DataTable rows={rows} rowKey={(r) => r.name} columns={[{ key: 'name', header: 'Attribute', sort: (r) => r.name, render: (r) => <b>{r.name}</b> }, { key: 'values', header: 'Values', search: (r) => r.values.join(' '), render: (r) => <div className="flex flex-wrap gap-1">{r.values.map((v) => <span key={v} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{v}</span>)}</div> }, { key: 'used', header: 'Used by products', sort: (r) => r.used }]} /></>
  }
  const field = kind === 'categories' ? 'category' : 'brand'
  const names = [...new Set(s.products.map((p) => p[field]))]
  const rows = names.map((n) => { const ps = s.products.filter((p) => p[field] === n); return { name: n, count: ps.length, stock: ps.reduce((t, p) => t + p.stock, 0), variants: ps.reduce((t, p) => t + p.variants.length, 0) } })
  return <><PageHeader title={kind === 'categories' ? 'Categories' : 'Brands'} subtitle={`${rows.length} ${kind} in your catalog`} /><DataTable rows={rows} rowKey={(r) => r.name} columns={[{ key: 'name', header: kind === 'categories' ? 'Category' : 'Brand', sort: (r) => r.name, render: (r) => <b>{r.name}</b> }, { key: 'count', header: 'Products', sort: (r) => r.count }, { key: 'variants', header: 'Variants', sort: (r) => r.variants }, { key: 'stock', header: 'Stock (pcs)', sort: (r) => r.stock, render: (r) => fmt(r.stock) }]} /></>
}
