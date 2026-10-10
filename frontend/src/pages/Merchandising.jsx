import { useState } from 'react';
import { DataTable, FormModal, Loading, Modal, PageHead, Pill, Steps } from '../components/ui.jsx';
import { Hub } from './Hub.jsx';
import { api } from '../api.js';
import { useAction, useFetch } from '../hooks.js';
import { num, usd } from '../format.js';

const STEPS = ['Order Received', 'Sample Approved', 'Materials Booked', 'In Production', 'Goods Allocated', 'Packed', 'Shipped', 'Payment Received'];

export const MerchHub = () => (
  <Hub title="Merchandising" sub="Buyers, export orders and shipments" cards={[
    ['/merchandising/orders', 'Buyer Orders', 'Track each order from receipt to payment'], ['/merchandising/buyers', 'Buyers', 'Customer directory'],
    ['/merchandising/shipments', 'Shipments', 'Orders ready or on the way'], ['/merchandising/countries', 'Countries', 'Destinations and ports'],
  ]} />
);

export function Orders() {
  const st = useFetch('/merchandising/orders');
  const buyers = useFetch('/merchandising/buyers');
  const products = useFetch('/products');
  const run = useAction(st.reload);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [line, setLine] = useState({ productId: '', variant: '', qty: 500 });
  const [f, setF] = useState({ buyer: '', buyer_po: '', ship_date: '' });
  const prod = products.data?.find((p) => p.id === line.productId);
  const current = view && st.data?.find((o) => o.id === view.id);

  return (
    <>
      <PageHead title="Buyer Orders"><button className="btn primary" onClick={() => setOpen(true)}>+ New order</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['id', 'buyer_po', 'buyer']} filters={[{ key: 'status', label: 'All statuses' }, { key: 'country', label: 'All countries' }]} onRowClick={setView} columns={[
        { label: 'Order', render: (o) => <b>{o.id}</b> }, { key: 'buyer_po', label: 'Buyer PO' }, { key: 'buyer', label: 'Buyer' }, { key: 'country', label: 'Country' },
        { label: 'Qty', align: 'right', render: (o) => num(o.quantity) }, { label: 'Value', align: 'right', render: (o) => usd(o.value) }, { key: 'ship_date', label: 'Ship by' },
        { key: 'step_name', label: 'Stage' }, { label: 'Status', render: (o) => <Pill>{o.status}</Pill> },
      ]} />}
      {current && (
        <Modal title={`${current.id} · ${current.buyer_po}`} onClose={() => setView(null)}>
          <Steps steps={STEPS} current={current.cancelled ? -1 : current.step} />
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Variant</th><th className="right">Qty</th><th className="right">Price</th></tr></thead>
            <tbody>{current.lines.map((l, i) => <tr key={i}><td>{l.variant}<div className="muted mono">{l.sku}</div></td><td className="right">{num(l.qty)}</td><td className="right">${l.price}</td></tr>)}</tbody>
          </table>
          <p><b>Total {usd(current.value)}</b></p>
          <div className="actions">
            {!current.cancelled && current.step < 6 && <button className="btn" onClick={() => run(() => api.post(`/merchandising/orders/${current.id}/cancel`), 'Order cancelled')}>Cancel order</button>}
            {!current.cancelled && current.step < 7 && <button className="btn primary" onClick={() => run(() => api.post(`/merchandising/orders/${current.id}/advance`), 'Order status updated')}>Advance → {STEPS[current.step + 1]}</button>}
            <button className="btn" onClick={() => setView(null)}>Close</button>
          </div>
        </Modal>
      )}
      {open && (
        <Modal title="New buyer order" onClose={() => setOpen(false)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(() => api.post('/merchandising/orders', { ...f, lines: [{ ...line, qty: Number(line.qty) }] }), 'Buyer order created');
            if (r) setOpen(false);
          }}>
            <label className="f">Buyer<select required value={f.buyer} onChange={(e) => setF({ ...f, buyer: e.target.value })}><option value="">Select…</option>{(buyers.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label className="f">Buyer PO<input required value={f.buyer_po} onChange={(e) => setF({ ...f, buyer_po: e.target.value })} /></label>
            <label className="f">Ship by<input required type="date" value={f.ship_date} onChange={(e) => setF({ ...f, ship_date: e.target.value })} /></label>
            <label className="f">Product<select required value={line.productId} onChange={(e) => setLine({ ...line, productId: e.target.value, variant: '' })}><option value="">Select…</option>{(products.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="f">Variant<select required value={line.variant} onChange={(e) => setLine({ ...line, variant: e.target.value })}><option value="">Select…</option>{(prod?.variants || []).map((v) => <option key={v.id}>{v.name}</option>)}</select></label>
            <label className="f">Quantity<input required type="number" min="1" value={line.qty} onChange={(e) => setLine({ ...line, qty: e.target.value })} /></label>
            <div className="actions"><button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary">Create order</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Buyers() {
  const st = useFetch('/merchandising/buyers');
  const countries = useFetch('/merchandising/countries');
  const run = useAction(st.reload);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Buyers"><button className="btn primary" onClick={() => setOpen(true)}>+ Add buyer</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['name', 'contact', 'email']} filters={[{ key: 'country', label: 'All countries' }, { key: 'type', label: 'All types' }]} columns={[
        { key: 'id', label: 'ID' }, { label: 'Buyer', render: (b) => <b>{b.name}</b> }, { key: 'type', label: 'Type' }, { key: 'country', label: 'Country' }, { key: 'contact', label: 'Contact' },
        { key: 'term', label: 'Payment' }, { label: 'Orders', align: 'right', render: (b) => b.orders }, { label: 'Value', align: 'right', render: (b) => usd(b.value) },
      ]} />}
      {open && <FormModal title="Add buyer" onClose={() => setOpen(false)} fields={[
        { name: 'name', label: 'Company', required: true }, { name: 'type', label: 'Type', type: 'select', required: true, options: ['Brand', 'Retail Chain', 'Wholesaler'] },
        { name: 'country', label: 'Country', type: 'select', required: true, options: (countries.data || []).map((c) => [c.code, c.name]) }, { name: 'contact', label: 'Contact person' },
        { name: 'email', label: 'Email', type: 'email' }, { name: 'term', label: 'Payment term', placeholder: 'LC at sight / TT 30 days' }]}
        onSubmit={async (v) => (await run(() => api.post('/merchandising/buyers', v), `Buyer ${v.name} added`)) !== null} />}
    </>
  );
}

export function Shipments() {
  const st = useFetch('/merchandising/shipments');
  return (<><PageHead title="Shipments" sub="Orders from allocation onward" /><Loading state={st} />{st.data && <DataTable rows={st.data.map((s) => ({ ...s, id: s.order_id }))} empty="No shipments yet" columns={[
    { label: 'Order', render: (s) => <b>{s.order_id}</b> }, { key: 'buyer', label: 'Buyer' }, { key: 'country', label: 'Country' }, { key: 'port', label: 'Port' }, { key: 'ship_date', label: 'Ship by' },
    { label: 'Qty', align: 'right', render: (s) => num(s.quantity) }, { label: 'Value', align: 'right', render: (s) => usd(s.value) }, { key: 'step_name', label: 'Stage' }, { label: 'Status', render: (s) => <Pill>{s.status}</Pill> },
  ]} />}</>);
}

export function Countries() {
  const st = useFetch('/merchandising/countries');
  const run = useAction(st.reload);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Countries"><button className="btn primary" onClick={() => setOpen(true)}>+ Add country</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['name', 'code', 'port']} filters={[{ key: 'region', label: 'All regions' }]} columns={[
        { key: 'code', label: 'Code' }, { label: 'Country', render: (c) => <b>{c.name}</b> }, { key: 'region', label: 'Region' }, { key: 'currency', label: 'Currency' }, { key: 'port', label: 'Port' }, { label: 'Orders', align: 'right', render: (c) => c.orders },
      ]} />}
      {open && <FormModal title="Add country" onClose={() => setOpen(false)} fields={[
        { name: 'code', label: 'ISO code (2 letters)', required: true }, { name: 'name', label: 'Name', required: true }, { name: 'region', label: 'Region', type: 'select', required: true, options: ['North America', 'Europe', 'Asia Pacific', 'Middle East', 'Africa', 'South America'] },
        { name: 'currency', label: 'Currency', required: true }, { name: 'port', label: 'Main port', required: true }]}
        onSubmit={async (v) => (await run(() => api.post('/merchandising/countries', { ...v, code: v.code.toUpperCase() }), `${v.name} added`)) !== null} />}
    </>
  );
}
