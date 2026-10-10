import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, DataTable, FormModal, Kpi, Loading, PageHead, Pill, Steps } from '../components/ui.jsx';
import { Hub } from './Hub.jsx';
import { api } from '../api.js';
import { useAction, useFetch } from '../hooks.js';
import { bdt, num } from '../format.js';

const DEPTS = ['Management', 'HR', 'Production', 'Cutting', 'Sewing', 'Finishing', 'Quality Control', 'Warehouse', 'Procurement', 'Merchandising', 'Accounts'];
const ROLES = ['Admin', 'Manager', 'Supervisor', 'Production Worker', 'HR Officer', 'Store Keeper', 'Accountant', 'QC Inspector', 'Merchandiser'];

export const HrHub = () => (
  <Hub title="Human Resources" sub="People, attendance, leave and payroll" cards={[
    ['/hr/employees', 'Employees', 'Directory and onboarding'], ['/hr/departments', 'Departments', 'Headcount and payroll by team'],
    ['/hr/designations', 'Designations', 'Job titles and pay'], ['/hr/attendance', 'Attendance', 'Daily presence'],
    ['/hr/leave', 'Leave', 'Requests and approvals'], ['/hr/salary', 'Salary Structure', 'Basic and allowances'], ['/hr/payroll', 'Payroll', 'Monthly payroll run'],
  ]} />
);

export function Employees() {
  const st = useFetch('/hr/employees');
  const run = useAction(st.reload);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Employees" sub={st.data ? `${st.data.length} people` : ''}><button className="btn primary" onClick={() => setOpen(true)}>+ Add employee</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['id', 'name', 'designation']} filters={[{ key: 'dept', label: 'All departments' }, { key: 'type', label: 'All types' }]} onRowClick={(e) => nav(`/hr/employees/${e.id}`)} columns={[
        { key: 'id', label: 'ID' }, { label: 'Name', render: (e) => <b>{e.name}</b> }, { key: 'dept', label: 'Department' }, { key: 'designation', label: 'Designation' },
        { key: 'joined', label: 'Joined' }, { label: 'Type', render: (e) => <Pill>{e.type}</Pill> }, { label: 'Basic', align: 'right', render: (e) => bdt(e.basic) },
      ]} />}
      {open && <FormModal title="Add employee" onClose={() => setOpen(false)} fields={[
        { name: 'name', label: 'Full name', required: true }, { name: 'dept', label: 'Department', type: 'select', required: true, options: DEPTS }, { name: 'designation', label: 'Designation', required: true },
        { name: 'role', label: 'System role', type: 'select', required: true, options: ROLES }, { name: 'joined', label: 'Joining date', type: 'date', required: true, default: '2026-10-08' },
        { name: 'type', label: 'Type', type: 'select', required: true, default: 'Permanent', options: ['Permanent', 'Contract', 'Probation'] }, { name: 'basic', label: 'Basic salary (৳)', type: 'number', required: true }]}
        onSubmit={async (v) => (await run(() => api.post('/hr/employees', v), `Employee ${v.name} added`)) !== null} />}
    </>
  );
}

export function EmployeeDetail() {
  const { id } = useParams();
  const st = useFetch(`/hr/employees/${id}`);
  if (st.loading || st.error) return <Loading state={st} />;
  const e = st.data;
  return (
    <>
      <PageHead title={e.name} sub={`${e.id} · ${e.designation} · ${e.dept}`}><Link className="btn" to="/hr/employees">← Back</Link></PageHead>
      <div className="grid g2">
        <div className="card"><h2>Profile</h2><dl className="kv">
          <dt>Type</dt><dd><Pill>{e.type}</Pill></dd><dt>Joined</dt><dd>{e.joined}</dd><dt>Phone</dt><dd>{e.phone}</dd><dt>Email</dt><dd>{e.email}</dd><dt>System role</dt><dd>{e.role}</dd>
        </dl></div>
        <div className="card"><h2>Salary</h2><dl className="kv">
          <dt>Basic</dt><dd>{bdt(e.salary.basic)}</dd><dt>House rent</dt><dd>{bdt(e.salary.house)}</dd><dt>Medical</dt><dd>{bdt(e.salary.medical)}</dd><dt>Transport</dt><dd>{bdt(e.salary.transport)}</dd><dt><b>Gross</b></dt><dd><b>{bdt(e.salary.gross)}</b></dd>
        </dl></div>
        <div className="card"><h2>Leave balance</h2><dl className="kv"><dt>Casual</dt><dd>{e.leave.casual} days</dd><dt>Sick</dt><dd>{e.leave.sick} days</dd><dt>Annual</dt><dd>{e.leave.annual} days</dd></dl></div>
        <div className="card"><h2>Performance</h2><dl className="kv"><dt>Output / day</dt><dd>{e.perf.output}</dd><dt>Reject rate</dt><dd>{e.perf.rejectRate}%</dd><dt>Efficiency</dt><dd><Bar value={e.perf.efficiency} /></dd></dl></div>
      </div>
      <DataTable rows={e.attendance} columns={[{ key: 'date', label: 'Date' }, { key: 'in', label: 'In' }, { key: 'out', label: 'Out' }, { label: 'Hours', align: 'right', render: (a) => a.hours }, { label: 'Status', render: (a) => <Pill>{a.status}</Pill> }]} />
    </>
  );
}

export function Departments() {
  const st = useFetch('/hr/departments');
  return (<><PageHead title="Departments" /><Loading state={st} />{st.data && <DataTable rows={st.data.map((d) => ({ ...d, id: d.name }))} columns={[{ key: 'name', label: 'Department' }, { key: 'head', label: 'Senior-most' }, { label: 'Headcount', align: 'right', render: (d) => d.headcount }, { label: 'Monthly basic', align: 'right', render: (d) => bdt(d.payroll) }]} />}</>);
}

export function Designations() {
  const st = useFetch('/hr/designations');
  return (<><PageHead title="Designations" /><Loading state={st} />{st.data && <DataTable rows={st.data.map((d, i) => ({ ...d, id: i }))} search={['designation', 'dept']} columns={[{ key: 'designation', label: 'Designation' }, { key: 'dept', label: 'Department' }, { key: 'role', label: 'System role' }, { label: 'Headcount', align: 'right', render: (d) => d.headcount }, { label: 'Avg basic', align: 'right', render: (d) => bdt(d.avg_basic) }]} />}</>);
}

export function Attendance() {
  const [date, setDate] = useState('2026-10-08');
  const st = useFetch(`/hr/attendance?date=${date}`);
  return (
    <>
      <PageHead title="Attendance"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} /></PageHead>
      <Loading state={st} />
      {st.data && (<>
        <div className="grid g4">{Object.entries(st.data.summary).map(([k, v]) => <Kpi key={k} label={k} value={v} />)}</div>
        <DataTable rows={st.data.rows} search={['employee', 'emp_id']} filters={[{ key: 'status', label: 'All statuses' }]} columns={[
          { key: 'emp_id', label: 'ID' }, { key: 'employee', label: 'Employee' }, { key: 'in', label: 'In' }, { key: 'out', label: 'Out' }, { label: 'Hours', align: 'right', render: (a) => a.hours }, { label: 'Status', render: (a) => <Pill>{a.status}</Pill> },
        ]} />
      </>)}
    </>
  );
}

export function Leave() {
  const st = useFetch('/hr/leaves');
  const emps = useFetch('/hr/employees');
  const run = useAction(st.reload);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Leave"><button className="btn primary" onClick={() => setOpen(true)}>+ Request leave</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['employee', 'id']} filters={[{ key: 'status', label: 'All statuses' }, { key: 'type', label: 'All types' }]} columns={[
        { key: 'id', label: 'ID' }, { key: 'employee', label: 'Employee' }, { key: 'type', label: 'Type' }, { label: 'Dates', render: (l) => `${l.from} → ${l.to}` }, { label: 'Days', render: (l) => l.days },
        { key: 'reason', label: 'Reason' }, { label: 'Status', render: (l) => <Pill>{l.status}</Pill> },
        { label: '', render: (l) => l.status === 'Pending' && <span style={{ display: 'flex', gap: 4 }}>
          <button className="btn sm primary" onClick={() => run(() => api.put(`/hr/leaves/${l.id}/decision`, { status: 'Approved' }), 'Leave approved – balance updated')}>Approve</button>
          <button className="btn sm" onClick={() => run(() => api.put(`/hr/leaves/${l.id}/decision`, { status: 'Rejected' }), 'Leave rejected')}>Reject</button></span> },
      ]} />}
      {open && <FormModal title="Request leave" onClose={() => setOpen(false)} fields={[
        { name: 'emp_id', label: 'Employee', type: 'select', required: true, options: (emps.data || []).map((e) => [e.id, `${e.name} (${e.id})`]) },
        { name: 'type', label: 'Type', type: 'select', required: true, options: ['Casual', 'Sick', 'Annual'] }, { name: 'from', label: 'From', type: 'date', required: true }, { name: 'to', label: 'To', type: 'date', required: true }, { name: 'reason', label: 'Reason', type: 'textarea' }]}
        onSubmit={async (v) => (await run(() => api.post('/hr/leaves', v), 'Leave request submitted')) !== null} />}
    </>
  );
}

export function Salary() {
  const st = useFetch('/hr/salary');
  return (<><PageHead title="Salary Structure" sub="Basic + 25% house rent + 10% medical + 10% transport" /><Loading state={st} />{st.data && <DataTable rows={st.data} search={['name', 'id', 'designation']} filters={[{ key: 'dept', label: 'All departments' }]} columns={[
    { key: 'id', label: 'ID' }, { key: 'name', label: 'Employee' }, { key: 'designation', label: 'Designation' },
    ...['basic', 'house', 'medical', 'transport', 'gross'].map((k) => ({ label: k[0].toUpperCase() + k.slice(1), align: 'right', render: (r) => bdt(r[k]) })),
  ]} />}</>);
}

export function Payroll() {
  const st = useFetch('/hr/payroll');
  const run = useAction(st.reload);
  if (st.loading || st.error) return <Loading state={st} />;
  const { current: c, history } = st.data;
  return (
    <>
      <PageHead title={`Payroll – ${c.month}`}>
        <button className="btn primary" disabled={c.stage >= 4} onClick={() => run(() => api.post('/hr/payroll/advance'), 'Payroll advanced')}>{c.stage >= 4 ? 'Paid' : `Advance → ${c.stages[c.stage + 1]}`}</button>
      </PageHead>
      <Steps steps={c.stages} current={c.stage} />
      <div className="grid g4"><Kpi label="Employees" value={c.employees} /><Kpi label="Gross" value={bdt(c.gross)} /><Kpi label="Deductions" value={bdt(c.deductions)} /><Kpi label="Net payable" value={bdt(c.net)} /></div>
      <DataTable rows={history} columns={[{ key: 'month', label: 'Month' }, { label: 'Employees', align: 'right', render: (h) => h.employees }, { label: 'Gross', align: 'right', render: (h) => bdt(h.gross) }, { label: 'Deductions', align: 'right', render: (h) => bdt(h.deductions) }, { label: 'Net', align: 'right', render: (h) => bdt(h.net) }, { label: 'Status', render: (h) => <Pill>{h.status}</Pill> }]} />
    </>
  );
}
