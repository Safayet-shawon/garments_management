import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const TONES = {
  ok: ['Active', 'Healthy', 'Approved', 'Received', 'Closed', 'Completed', 'Paid', 'Present', 'Passed', 'Ready', 'Shipped', 'Moved to Finished Goods', 'Accepted'],
  warn: ['Low', 'Pending', 'Draft', 'Late', 'Planned', 'Sampling', 'Pending Purchase', 'Partially Received', 'Normal', 'Medium', 'Probation', 'Not Ready', 'Ordered'],
  bad: ['Critical', 'Rejected', 'Absent', 'Cancelled', 'Inactive', 'Short', 'High'],
  info: ['In Progress', 'In Production', 'Ready to Ship', 'Leave', 'PO Created', 'Contract', 'Permanent', 'Material Check'],
};
export function Pill({ children }) {
  const t = Object.keys(TONES).find((k) => TONES[k].includes(String(children))) || '';
  return <span className={`pill ${t}`}>{children}</span>;
}

export function Bar({ value }) {
  return (
    <div className="bar" title={`${value}%`}>
      <i style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="muted">{sub}</div>}
      </div>
      <div className="sp" />
      {children}
    </div>
  );
}

export function Loading({ state }) {
  if (state.loading) return <div className="card empty">Loading…</div>;
  if (state.error) return <div className="card empty" style={{ color: 'var(--bad)' }}>Could not load data: {state.error}</div>;
  return null;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** fields: [{name,label,type,options,required,default,placeholder}] */
export function FormModal({ title, fields, initial = {}, submitLabel = 'Save', onSubmit, onClose }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? f.default ?? ''])));
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const out = {};
    fields.forEach((f) => {
      const val = v[f.name];
      if (val === '' && !f.required) return;
      out[f.name] = f.type === 'number' ? Number(val) : val;
    });
    const ok = await onSubmit(out);
    setBusy(false);
    if (ok !== false) onClose();
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {fields.map((f) => (
          <label className="f" key={f.name}>
            {f.label}
            {f.type === 'select' ? (
              <select required={f.required} value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })}>
                <option value="">Select…</option>
                {f.options.map((o) => {
                  const [val, text] = Array.isArray(o) ? o : [o, o];
                  return <option key={val} value={val}>{text}</option>;
                })}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea rows={3} required={f.required} value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
            ) : (
              <input type={f.type || 'text'} step="any" required={f.required} placeholder={f.placeholder} value={v[f.name]} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />
            )}
          </label>
        ))}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * columns: [{key,label,render(row),align,sortValue}]. `search` = keys searched by the filter box.
 */
export function DataTable({ columns, rows, search = [], filters, onRowClick, empty = 'Nothing to show', toolbar }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState({});
  const shown = useMemo(() => {
    let r = rows || [];
    if (q) r = r.filter((x) => search.some((k) => String(x[k] ?? '').toLowerCase().includes(q.toLowerCase())));
    (filters || []).forEach((fl) => {
      if (f[fl.key]) r = r.filter((x) => String(x[fl.key]) === f[fl.key]);
    });
    return r;
  }, [rows, q, f, search, filters]);
  return (
    <div className="card flush">
      {(search.length > 0 || filters || toolbar) && (
        <div className="toolbar">
          {search.length > 0 && <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}
          {(filters || []).map((fl) => (
            <select key={fl.key} value={f[fl.key] || ''} onChange={(e) => setF({ ...f, [fl.key]: e.target.value })}>
              <option value="">{fl.label}</option>
              {[...new Set((rows || []).map((x) => x[fl.key]))].filter(Boolean).map((o) => <option key={o}>{o}</option>)}
            </select>
          ))}
          <span className="muted">{shown.length} of {(rows || []).length}</span>
          <div style={{ flex: 1 }} />
          {toolbar}
        </div>
      )}
      <div className="scroll">
        <table>
          <thead>
            <tr>{columns.map((c) => <th key={c.label} className={c.align === 'right' ? 'right' : ''}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.id ?? r.code ?? i} className={onRowClick ? 'click' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => (
                  <td key={c.label} className={c.align === 'right' ? 'right' : ''}>{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <div className="empty">{empty}</div>}
      </div>
    </div>
  );
}

export function Kpi({ label, value, sub, to }) {
  const body = (
    <>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      {sub && <div className="muted">{sub}</div>}
    </>
  );
  return to ? <Link className="card kpi" to={to}>{body}</Link> : <div className="card kpi">{body}</div>;
}

export function Steps({ steps, current }) {
  return (
    <div className="steps">
      {steps.map((s, i) => <span key={s} className={i <= current ? 'done' : ''}>{s}</span>)}
    </div>
  );
}
