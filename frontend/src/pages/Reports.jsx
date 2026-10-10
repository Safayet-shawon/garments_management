import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataTable, Kpi, Loading, PageHead } from '../components/ui.jsx';
import { useFetch } from '../hooks.js';
import { bdt, num, usd } from '../format.js';

function Chart({ data, x, y, fmt = num }) {
  return (
    <div className="card" style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey={x} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => fmt(v)} />
          <Bar dataKey={y} fill="#2f4ba3" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
const obj = (o) => Object.entries(o || {}).map(([name, value]) => ({ id: name, name, value }));

export default function Reports() {
  const { kind } = useParams();
  const st = useFetch(`/reports/${kind}`);
  if (st.loading || st.error) return <><PageHead title={`${kind} report`} /><Loading state={st} /></>;
  const r = st.data;
  const title = kind[0].toUpperCase() + kind.slice(1) + ' Report';
  return (
    <>
      <PageHead title={title} />
      {kind === 'sales' && (<>
        <div className="grid g4"><Kpi label="Order value" value={usd(r.total_value)} /><Kpi label="Orders" value={r.orders} /></div>
        <Chart data={r.by_buyer} x="buyer" y="value" fmt={usd} />
        <DataTable rows={r.by_country.map((c) => ({ ...c, id: c.country }))} columns={[{ key: 'country', label: 'Country' }, { key: 'orders', label: 'Orders' }, { label: 'Value', align: 'right', render: (c) => usd(c.value) }]} />
      </>)}
      {kind === 'inventory' && (<>
        <div className="grid g4"><Kpi label="Raw material value" value={bdt(r.raw_material_value)} /><Kpi label="Finished goods" value={`${num(r.finished_goods_units)} pcs`} />
          {obj(r.by_status).map((s) => <Kpi key={s.name} label={s.name} value={s.value} />)}</div>
        <DataTable rows={r.materials} search={['name']} columns={[{ key: 'name', label: 'Material' }, { label: 'On hand', align: 'right', render: (m) => `${num(m.on_hand)} ${m.unit}` }, { label: 'Value', align: 'right', render: (m) => bdt(m.value) }, { key: 'status', label: 'Status' }]} />
      </>)}
      {kind === 'production' && (<>
        <div className="grid g4"><Kpi label="Plans" value={r.plans} /><Kpi label="Target" value={num(r.target)} /><Kpi label="Sewn" value={num(r.sewn)} /><Kpi label="Efficiency" value={`${r.efficiency}%`} /></div>
        <DataTable rows={r.rows} columns={[{ key: 'id', label: 'Plan' }, { key: 'stage', label: 'Stage' }, { label: 'Target', align: 'right', render: (p) => num(p.target) }, { label: 'Cut', align: 'right', render: (p) => num(p.cut) }, { label: 'Sewn', align: 'right', render: (p) => num(p.sewn) }, { label: 'Finished', align: 'right', render: (p) => num(p.finished) }]} />
      </>)}
      {kind === 'procurement' && (<>
        <div className="grid g4"><Kpi label="Total PO value" value={bdt(r.total_value)} />{obj(r.by_status).map((s) => <Kpi key={s.name} label={s.name} value={s.value} />)}</div>
        <Chart data={r.by_supplier} x="supplier" y="value" fmt={bdt} />
      </>)}
      {kind === 'hr' && (<>
        <div className="grid g4"><Kpi label="Headcount" value={r.headcount} /><Kpi label="Monthly basic" value={bdt(r.monthly_basic)} />{obj(r.by_type).map((s) => <Kpi key={s.name} label={s.name} value={s.value} />)}</div>
        <Chart data={r.by_dept} x="dept" y="headcount" />
      </>)}
    </>
  );
}
