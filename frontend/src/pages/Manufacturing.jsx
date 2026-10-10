import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, DataTable, FormModal, Kpi, Loading, PageHead, Pill, Steps } from '../components/ui.jsx';
import { Hub } from './Hub.jsx';
import { api } from '../api.js';
import { useAction, useFetch, useToast } from '../hooks.js';
import { num } from '../format.js';

const STAGES = ['Planned', 'Material Check', 'Cutting', 'Sewing', 'Finishing', 'Quality Control', 'Completed'];

export const ManufacturingHub = () => (
  <Hub title="Manufacturing" sub="Plan, cut, sew, finish and inspect" cards={[
    ['/manufacturing/plans', 'Production Plans', 'All plans and their progress'],
    ['/manufacturing/requirements', 'Material Requirements', 'Check BOM needs vs. stock'],
    ['/manufacturing/cutting', 'Cutting', 'Record cutting output'],
    ['/manufacturing/sewing', 'Sewing', 'Record sewing output'],
    ['/manufacturing/finishing', 'Finishing', 'Record finishing output'],
    ['/manufacturing/qc', 'Quality Control', 'Inspect and release batches'],
    ['/manufacturing/reports', 'Reports', 'Efficiency, waste and rejects'],
  ]} />
);

const planCols = [
  { label: 'Plan', render: (p) => <Link to={`/manufacturing/plans/${p.id}`}><b>{p.id}</b></Link> },
  { key: 'product', label: 'Product' },
  { label: 'Target', align: 'right', render: (p) => num(p.target) },
  { label: 'Progress', render: (p) => <Bar value={p.progress} /> },
  { key: 'stage', label: 'Stage' },
  { key: 'team', label: 'Team' },
  { key: 'end', label: 'Due' },
  { label: 'Status', render: (p) => <Pill>{p.display_status}</Pill> },
];

export function Plans() {
  const st = useFetch('/manufacturing/plans');
  return (
    <>
      <PageHead title="Production Plans"><Link className="btn primary" to="/manufacturing/plans/new">+ New plan</Link></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['id', 'product']} filters={[{ key: 'stage', label: 'All stages' }, { key: 'display_status', label: 'All statuses' }]} columns={planCols} />}
    </>
  );
}

export function PlanForm() {
  const products = useFetch('/products');
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ product_id: '', target: 1000, start: '2026-10-12', end: '2026-10-28', supervisor: '', priority: 'Normal', notes: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const req = useFetch(f.product_id && f.target > 0 ? `/manufacturing/requirements?product_id=${f.product_id}&qty=${f.target}` : '/health');
  const reqs = f.product_id && Array.isArray(req.data) ? req.data : [];
  const submit = async (e) => {
    e.preventDefault();
    try {
      const p = await api.post('/manufacturing/plans', { ...f, target: Number(f.target) });
      toast(`Production plan ${p.id} created`);
      nav(`/manufacturing/plans/${p.id}`);
    } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <>
      <PageHead title="New production plan" />
      <div className="grid g2">
        <form className="card" onSubmit={submit}>
          <label className="f">Product<select required value={f.product_id} onChange={set('product_id')}><option value="">Select…</option>{(products.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="f">Target quantity<input required type="number" min="1" value={f.target} onChange={set('target')} /></label>
          <div className="grid g2">
            <label className="f">Start<input required type="date" value={f.start} onChange={set('start')} /></label>
            <label className="f">End<input required type="date" value={f.end} onChange={set('end')} /></label>
          </div>
          <label className="f">Supervisor<input value={f.supervisor} onChange={set('supervisor')} /></label>
          <label className="f">Priority<select value={f.priority} onChange={set('priority')}><option>Low</option><option>Normal</option><option>High</option></select></label>
          <label className="f">Notes<textarea rows={2} value={f.notes} onChange={set('notes')} /></label>
          <button className="btn primary">Create plan</button>
        </form>
        <ReqTable rows={reqs} title="Material check" />
      </div>
    </>
  );
}

function ReqTable({ rows, title }) {
  return (
    <div className="card flush">
      <div className="toolbar"><b>{title}</b></div>
      <DataTable rows={rows.map((r) => ({ ...r, id: r.material_id }))} empty="Select a product to see requirements" columns={[
        { key: 'material', label: 'Material' }, { label: 'Required', align: 'right', render: (r) => `${num(r.required, 2)} ${r.unit}` },
        { label: 'Available', align: 'right', render: (r) => num(r.available) }, { label: 'Shortage', align: 'right', render: (r) => num(r.shortage, 2) },
        { label: 'Status', render: (r) => <Pill>{r.status}</Pill> },
      ]} />
    </div>
  );
}

export function Requirements() {
  const products = useFetch('/products');
  const [pid, setPid] = useState('');
  const [qty, setQty] = useState(1000);
  const req = useFetch(pid && qty > 0 ? `/manufacturing/requirements?product_id=${pid}&qty=${qty}` : '/health');
  return (
    <>
      <PageHead title="Material Requirements" sub="Check what a production run needs against current stock" />
      <div className="card toolbar" style={{ borderBottom: 0 }}>
        <select value={pid} onChange={(e) => setPid(e.target.value)}><option value="">Select product…</option>{(products.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        <span className="muted">units</span>
      </div>
      <ReqTable rows={pid && Array.isArray(req.data) ? req.data : []} title="Requirements" />
    </>
  );
}

export function PlanDetail() {
  const { id } = useParams();
  const st = useFetch(`/manufacturing/plans/${id}`);
  const run = useAction(st.reload);
  const [modal, setModal] = useState(null);
  if (st.loading || st.error) return <Loading state={st} />;
  const p = st.data;
  const act = (a, body, msg) => run(() => api.post(`/manufacturing/plans/${id}/${a}`, body), msg);
  const q = (name, text, extra = []) => setModal({ name, text, extra });
  return (
    <>
      <PageHead title={`${p.id} · ${p.product}`} sub={`Priority ${p.priority} · ${p.start} → ${p.end}`}>
        {p.status === 'Planned' || p.status === 'Ready' ? <button className="btn primary" onClick={() => act('start', {}, 'Production started – cutting stage is now open')}>Start production</button> : null}
        {p.status !== 'Cancelled' && p.status !== 'Completed' && <button className="btn" onClick={() => act('cancel', {}, 'Production plan cancelled')}>Cancel plan</button>}
      </PageHead>
      <Steps steps={STAGES} current={STAGES.indexOf(p.stage)} />
      <div className="grid g4">
        <Kpi label="Target" value={num(p.target)} />
        <Kpi label="Cut" value={num(p.cut)} sub={`${num(p.waste_kg)} kg waste`} />
        <Kpi label="Sewn" value={num(p.sewn)} sub={`${num(p.sew_reject)} rejects`} />
        <Kpi label="Finished" value={num(p.finished)} />
      </div>
      <div className="card">
        <h2>Stage actions</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setModal({ title: 'Assign team', action: 'assign-team', fields: [{ name: 'team', label: 'Team', required: true, default: p.team }, { name: 'supervisor', label: 'Supervisor', required: true, default: p.supervisor }], msg: 'Team assigned' })}>Assign team</button>
          <button className="btn" onClick={() => setModal({ title: 'Record cutting', action: 'record-cutting', fields: [{ name: 'qty', label: 'Pieces cut', type: 'number', required: true }, { name: 'waste_kg', label: 'Waste (kg)', type: 'number' }], msg: 'Cutting output recorded' })}>Record cutting</button>
          <button className="btn" onClick={() => setModal({ title: 'Record sewing', action: 'record-sewing', fields: [{ name: 'qty', label: 'Pieces sewn', type: 'number', required: true }, { name: 'rejected', label: 'Rejected', type: 'number' }], msg: 'Sewing output recorded' })}>Record sewing</button>
          <button className="btn" onClick={() => setModal({ title: 'Record finishing', action: 'record-finishing', fields: [{ name: 'qty', label: 'Pieces finished', type: 'number', required: true }], msg: 'Finishing output recorded' })}>Record finishing</button>
          <button className="btn" onClick={() => act('send-qc', {}, 'Batch sent to Quality Control')}>Send to QC</button>
          <button className="btn" disabled={p.qc_status !== 'Pending'} onClick={() => setModal({ title: 'Complete inspection', action: 'complete-qc', fields: [{ name: 'inspected', label: 'Inspected', type: 'number', required: true, default: p.finished }, { name: 'rejected', label: 'Rejected', type: 'number', required: true, default: 0 }, { name: 'inspector', label: 'Inspector', default: p.qc_inspector }], msg: 'Quality inspection completed' })}>Complete QC</button>
          <button className="btn primary" disabled={p.qc_status !== 'Passed'} onClick={() => act('move-to-fg', {}, 'Finished goods inventory updated')}>Move to finished goods</button>
        </div>
        <p className="muted">QC status: <Pill>{p.qc_status}</Pill> · passed {num(p.qc_passed)} · rejected {num(p.qc_rejected)}</p>
      </div>
      <ReqTable rows={p.requirements.map((r) => r)} title="Material requirements" />
      {modal && <FormModal title={modal.title} fields={modal.fields} onClose={() => setModal(null)}
        onSubmit={async (v) => (await act(modal.action, v, modal.msg)) !== null} />}
    </>
  );
}

const STAGE_FILTER = {
  cutting: (p) => p.status === 'In Progress' && p.cut < p.target,
  sewing: (p) => p.status === 'In Progress' && p.cut > 0 && p.sewn < p.target,
  finishing: (p) => p.status === 'In Progress' && p.sewn > 0 && p.finished < p.target,
  qc: (p) => p.qc_status === 'Pending' || p.qc_status === 'Passed',
};
export function StagePage({ stage }) {
  const st = useFetch('/manufacturing/plans');
  const run = useAction(st.reload);
  const [modal, setModal] = useState(null);
  const cfg = {
    cutting: { title: 'Cutting', col: ['Cut', 'cut'], action: 'record-cutting', fields: [{ name: 'qty', label: 'Pieces cut', type: 'number', required: true }, { name: 'waste_kg', label: 'Waste (kg)', type: 'number' }] },
    sewing: { title: 'Sewing', col: ['Sewn', 'sewn'], action: 'record-sewing', fields: [{ name: 'qty', label: 'Pieces sewn', type: 'number', required: true }, { name: 'rejected', label: 'Rejected', type: 'number' }] },
    finishing: { title: 'Finishing', col: ['Finished', 'finished'], action: 'record-finishing', fields: [{ name: 'qty', label: 'Pieces finished', type: 'number', required: true }] },
    qc: { title: 'Quality Control', col: ['Inspected', 'qc_inspected'], action: 'complete-qc', fields: [{ name: 'inspected', label: 'Inspected', type: 'number', required: true }, { name: 'rejected', label: 'Rejected', type: 'number', required: true, default: 0 }, { name: 'inspector', label: 'Inspector' }] },
  }[stage];
  return (
    <>
      <PageHead title={cfg.title} sub="Batches waiting at this stage" />
      <Loading state={st} />
      {st.data && <DataTable rows={st.data.filter(STAGE_FILTER[stage])} empty="No batches at this stage" columns={[
        { label: 'Plan', render: (p) => <Link to={`/manufacturing/plans/${p.id}`}><b>{p.id}</b></Link> }, { key: 'product', label: 'Product' }, { key: 'team', label: 'Team' },
        { label: 'Target', align: 'right', render: (p) => num(p.target) }, { label: cfg.col[0], align: 'right', render: (p) => num(p[cfg.col[1]]) },
        { label: '', render: (p) => <button className="btn sm primary" onClick={() => setModal(p)}>{stage === 'qc' ? 'Inspect' : 'Record output'}</button> },
      ]} />}
      {modal && <FormModal title={`${cfg.title} – ${modal.id}`} fields={cfg.fields.map((f) => (f.name === 'inspected' ? { ...f, default: modal.finished } : f))} onClose={() => setModal(null)}
        onSubmit={async (v) => (await run(() => api.post(`/manufacturing/plans/${modal.id}/${cfg.action}`, v), 'Saved')) !== null} />}
    </>
  );
}

export function MfgReports() {
  const st = useFetch('/manufacturing/report');
  if (st.loading || st.error) return <Loading state={st} />;
  const r = st.data;
  return (
    <>
      <PageHead title="Production Reports" />
      <div className="grid g4">
        <Kpi label="Plans" value={r.plans} /><Kpi label="Target" value={num(r.target)} /><Kpi label="Sewn" value={num(r.sewn)} sub={`${r.target ? Math.round((r.sewn / r.target) * 100) : 0}% of target`} />
        <Kpi label="Cutting waste" value={`${num(r.waste_kg)} kg`} /><Kpi label="Sewing rejects" value={num(r.sew_reject)} /><Kpi label="QC passed" value={num(r.qc_passed)} sub={`${num(r.qc_rejected)} rejected`} />
      </div>
      <DataTable rows={Object.entries(r.by_team).map(([team, v]) => ({ id: team, team, ...v }))} columns={[
        { key: 'team', label: 'Team' }, { key: 'plans', label: 'Plans' }, { label: 'Sewn', align: 'right', render: (t) => num(t.sewn) }, { label: 'Target', align: 'right', render: (t) => num(t.target) },
        { label: 'Efficiency', render: (t) => <Bar value={t.target ? Math.round((t.sewn / t.target) * 100) : 0} /> },
      ]} />
    </>
  );
}
