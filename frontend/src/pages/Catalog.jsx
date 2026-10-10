import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DataTable, FormModal, Loading, PageHead, Pill } from '../components/ui.jsx';
import { api } from '../api.js';
import { useAction, useFetch, useToast } from '../hooks.js';
import { bdt, num } from '../format.js';

export function Products() {
  const st = useFetch('/products');
  const nav = useNavigate();
  return (
    <>
      <PageHead title="Products" sub="Finished garment catalog">
        <Link className="btn primary" to="/products/new">+ New product</Link>
      </PageHead>
      <Loading state={st} />
      {st.data && (
        <DataTable
          rows={st.data}
          search={['name', 'sku']}
          filters={[{ key: 'category', label: 'All categories' }, { key: 'status', label: 'All statuses' }]}
          onRowClick={(p) => nav(`/products/${p.id}`)}
          columns={[
            { label: 'Product', render: (p) => <><b>{p.name}</b><div className="muted mono">{p.sku}</div></> },
            { key: 'category', label: 'Category' },
            { key: 'brand', label: 'Brand' },
            { label: 'Variants', render: (p) => p.variants?.length ?? 0 },
            { label: 'Stock', align: 'right', render: (p) => num(p.stock) },
            { label: 'Price', align: 'right', render: (p) => bdt(p.price) },
            { label: 'Status', render: (p) => <Pill>{p.status}</Pill> },
          ]}
        />
      )}
    </>
  );
}

export function ProductForm() {
  const nav = useNavigate();
  const toast = useToast();
  const cats = useFetch('/catalog/categories');
  const brands = useFetch('/catalog/brands');
  const [sizes, setSizes] = useState('S, M, L, XL');
  const [colors, setColors] = useState('Black, White');
  const [f, setF] = useState({ name: '', sku: '', category: '', brand: '', description: '', price: '', export_price: '', reorder: 1000, status: 'Active' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const combos = list(sizes).flatMap((Size) => list(colors).map((Color) => ({ Size, Color })));
    const variants = combos.map((c, i) => ({
      id: `new-v${i}`, name: `${c.Size} / ${c.Color}`, combo: c, sku: `${f.sku}-${c.Size}-${c.Color.slice(0, 3).toUpperCase()}`,
      purchase: 0, selling: Number(f.price), status: 'Active',
    }));
    try {
      const p = await api.post('/products', { ...f, price: Number(f.price), export_price: Number(f.export_price || 0), reorder: Number(f.reorder), variants });
      toast(`Product "${p.name}" saved to catalog`);
      nav(`/products/${p.id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const L = (label, el) => <label className="f">{label}{el}</label>;
  return (
    <>
      <PageHead title="New product" />
      <form className="card" onSubmit={submit} style={{ maxWidth: 720 }}>
        <div className="grid g2">
          {L('Name', <input required value={f.name} onChange={set('name')} />)}
          {L('SKU', <input required value={f.sku} onChange={set('sku')} />)}
          {L('Category', <input required list="cats" value={f.category} onChange={set('category')} />)}
          {L('Brand', <input required list="brands" value={f.brand} onChange={set('brand')} />)}
          {L('Selling price (৳)', <input required type="number" min="0" value={f.price} onChange={set('price')} />)}
          {L('Export price (USD)', <input type="number" step="any" min="0" value={f.export_price} onChange={set('export_price')} />)}
          {L('Sizes (comma separated)', <input value={sizes} onChange={(e) => setSizes(e.target.value)} />)}
          {L('Colors (comma separated)', <input value={colors} onChange={(e) => setColors(e.target.value)} />)}
          {L('Reorder level', <input type="number" min="0" value={f.reorder} onChange={set('reorder')} />)}
          {L('Status', <select value={f.status} onChange={set('status')}><option>Active</option><option>Draft</option><option>Inactive</option></select>)}
        </div>
        {L('Description', <textarea rows={3} value={f.description} onChange={set('description')} />)}
        <datalist id="cats">{(cats.data || []).map((c) => <option key={c.name} value={c.name} />)}</datalist>
        <datalist id="brands">{(brands.data || []).map((c) => <option key={c.name} value={c.name} />)}</datalist>
        <button className="btn primary">Save product</button>
      </form>
    </>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const st = useFetch(`/products/${id}`);
  const mats = useFetch('/inventory/materials');
  const run = useAction(st.reload);
  const [bomOpen, setBomOpen] = useState(false);
  if (st.loading || st.error) return <Loading state={st} />;
  const p = st.data;
  return (
    <>
      <PageHead title={p.name} sub={`${p.sku} · ${p.category} · ${p.brand}`}>
        <button className="btn" onClick={async () => { const c = await run(() => api.post(`/products/${id}/duplicate`), 'Product duplicated as draft'); if (c) nav(`/products/${c.id}`); }}>Duplicate</button>
        <button className="btn" onClick={() => run(() => api.put(`/products/${id}`, { status: p.status === 'Active' ? 'Inactive' : 'Active' }), 'Status updated')}>
          {p.status === 'Active' ? 'Deactivate' : 'Activate'}
        </button>
        <button className="btn danger" onClick={async () => { if (confirm('Delete this product?')) { await api.del(`/products/${id}`); nav('/products'); } }}>Delete</button>
      </PageHead>
      <div className="grid g2">
        <div className="card">
          <h2>Details</h2>
          <dl className="kv">
            <dt>Status</dt><dd><Pill>{p.status}</Pill></dd>
            <dt>Selling price</dt><dd>{bdt(p.price)}</dd>
            <dt>Export price</dt><dd>${p.export_price}</dd>
            <dt>Stock</dt><dd>{num(p.stock)} pcs ({num(p.reserved)} reserved)</dd>
            <dt>Reorder level</dt><dd>{num(p.reorder)}</dd>
            <dt>Description</dt><dd>{p.description}</dd>
          </dl>
        </div>
        <div className="card flush">
          <div className="toolbar"><b>Bill of materials (per unit)</b><div style={{ flex: 1 }} /><button className="btn sm" onClick={() => setBomOpen(true)}>+ Add material</button></div>
          <DataTable
            rows={p.bom.map((b) => ({ ...b, id: b.material_id }))}
            columns={[
              { key: 'material', label: 'Material' },
              { label: 'Qty', align: 'right', render: (b) => `${b.qty} ${b.unit}` },
              { label: '', render: (b) => <button className="btn sm" onClick={() => run(() => api.put(`/products/${id}/bom`, { lines: p.bom.filter((x) => x.material_id !== b.material_id).map(({ material_id, qty, unit }) => ({ material_id, qty, unit })) }), 'Bill of materials saved')}>Remove</button> },
            ]}
          />
        </div>
      </div>
      <div className="card flush">
        <div className="toolbar"><b>Variants ({p.variants?.length || 0})</b></div>
        <DataTable rows={p.variants || []} columns={[{ key: 'name', label: 'Variant' }, { key: 'sku', label: 'SKU' }, { label: 'Selling', align: 'right', render: (v) => bdt(v.selling) }, { label: 'Status', render: (v) => <Pill>{v.status}</Pill> }]} />
      </div>
      {bomOpen && (
        <FormModal
          title="Add material to BOM"
          fields={[
            { name: 'material_id', label: 'Material', type: 'select', required: true, options: (mats.data || []).map((m) => [m.id, `${m.name} (${m.unit})`]) },
            { name: 'qty', label: 'Quantity per unit', type: 'number', required: true },
          ]}
          onClose={() => setBomOpen(false)}
          onSubmit={async (v) => {
            const m = mats.data.find((x) => x.id === v.material_id);
            const lines = [...p.bom.filter((b) => b.material_id !== v.material_id).map(({ material_id, qty, unit }) => ({ material_id, qty, unit })), { material_id: v.material_id, qty: v.qty, unit: m.unit }];
            return (await run(() => api.put(`/products/${id}/bom`, { lines }), 'Bill of materials saved')) !== null;
          }}
        />
      )}
    </>
  );
}

function Simple({ title, path, columns }) {
  const st = useFetch(path);
  return (
    <>
      <PageHead title={title} />
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['name']} columns={columns} />}
    </>
  );
}
export const Categories = () => <Simple title="Categories" path="/catalog/categories" columns={[{ key: 'name', label: 'Category' }, { key: 'products', label: 'Products' }, { label: 'Stock', align: 'right', render: (r) => num(r.stock) }]} />;
export const Brands = () => <Simple title="Brands" path="/catalog/brands" columns={[{ key: 'name', label: 'Brand' }, { key: 'products', label: 'Products' }, { label: 'Stock', align: 'right', render: (r) => num(r.stock) }]} />;
export const Attributes = () => <Simple title="Attributes" path="/catalog/attributes" columns={[{ key: 'name', label: 'Attribute' }, { label: 'Values', render: (r) => r.values.join(', ') }]} />;
