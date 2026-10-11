import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Briefcase, Check, Clock, FileText, Plus, UserCheck, UserMinus, Users, Wallet, X } from 'lucide-react'
import { useStore, empName } from '../store'
import { DEPARTMENTS, DESIGNATIONS, TODAY, salaryParts, type Employee } from '../data'
import { Card, DataTable, DatePicker, EmptyState, Money, PageHeader, Select, StatCard, StatusBadge, Stepper, Tabs, fmt, fmtDate, money, useConfirm } from '../ui'

export const payrollTotals = (emps: Employee[]) => {
  const gross = emps.reduce((t, e) => t + salaryParts(e.basic).gross, 0)
  const deductions = Math.round(gross * 0.05)
  return { gross, deductions, net: gross - deductions }
}
const PAY_LABEL = ['Draft', 'Calculated', 'Pending Approval', 'Approved', 'Payslips Generated', 'Paid']

export function HRDashboard() {
  const { s, a } = useStore()
  const today = s.attendance.filter((x) => x.date === TODAY)
  const present = today.filter((x) => x.status === 'Present' || x.status === 'Late').length
  const pending = s.leaves.filter((l) => l.status === 'Pending')
  const byDept = DEPARTMENTS.map((d) => ({ name: d.replace('Quality Control', 'QC'), count: s.employees.filter((e) => e.dept === d).length }))
  return (
    <>
      <PageHeader title="HR Dashboard" subtitle="People, attendance, leave and payroll at a glance" actions={<button className="btn-primary" onClick={() => a.openModal('employee')}><Plus size={15} />Add Employee</button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Employees" value={s.employees.length} icon={<Users size={18} />} to="/hr/employees" />
        <StatCard label="Present Today" value={present} icon={<UserCheck size={18} />} accent="green" to="/hr/attendance" />
        <StatCard label="On Leave" value={today.filter((x) => x.status === 'Leave').length} icon={<UserMinus size={18} />} accent="blue" to="/hr/leave" />
        <StatCard label="Late" value={today.filter((x) => x.status === 'Late').length} icon={<Clock size={18} />} accent="amber" to="/hr/attendance" />
        <StatCard label="Payroll Pending" value={s.payrollStage < 5 ? 1 : 0} sub={PAY_LABEL[s.payrollStage]} icon={<Wallet size={18} />} accent="amber" to="/hr/payroll" />
        <StatCard label="Open Positions" value={4} sub="Sewing, QC, Cutting" icon={<Briefcase size={18} />} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Headcount by department" className="lg:col-span-2"><div className="h-64"><ResponsiveContainer><BarChart data={byDept} margin={{ left: -15 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={55} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="count" name="Employees" fill="#4a67d6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card title={`Leave awaiting approval (${pending.length})`} pad={false} action={<Link className="text-xs text-brand-600 hover:underline" to="/hr/leave">Manage</Link>}>
          {pending.length ? <ul className="divide-y divide-slate-100">{pending.slice(0, 4).map((l) => <li key={l.id} className="flex items-center justify-between gap-2 px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{empName(s, l.empId)}</div><div className="text-xs text-slate-500">{l.type} · {fmtDate(l.from)} – {fmtDate(l.to)} ({l.days}d)</div></div><div className="flex gap-1"><button className="btn-primary btn-sm" onClick={() => a.decideLeave(l.id, 'Approved')}>Approve</button></div></li>)}</ul> : <EmptyState title="No pending leave requests" />}
        </Card>
      </div>
    </>
  )
}

export function Employees() {
  const { s, a } = useStore()
  const nav = useNavigate()
  return (
    <>
      <PageHeader title="Employees" subtitle={`${s.employees.length} people across ${DEPARTMENTS.length} departments`} actions={<button className="btn-primary" onClick={() => a.openModal('employee')}><Plus size={15} />Add Employee</button>} />
      <DataTable rows={s.employees} rowKey={(e) => e.id} pageSize={12} onRowClick={(e) => nav(`/hr/employees/${e.id}`)} searchPlaceholder="Search name, ID, designation…"
        filters={[{ label: 'Department', options: DEPARTMENTS, get: (e) => e.dept }, { label: 'Type', options: ['Permanent', 'Contract', 'Probation'], get: (e) => e.type }, { label: 'Status', options: ['Active', 'On Leave', 'Inactive'], get: (e) => e.status }]}
        columns={[
          { key: 'id', header: 'Employee ID', sort: (e) => e.id, search: (e) => e.id, render: (e) => <span className="font-mono text-xs">{e.id}</span> },
          { key: 'name', header: 'Name', sort: (e) => e.name, search: (e) => e.name, render: (e) => <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">{e.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span><b className="text-slate-900">{e.name}</b></div> },
          { key: 'dept', header: 'Department', sort: (e) => e.dept }, { key: 'des', header: 'Designation', sort: (e) => e.designation, search: (e) => e.designation },
          { key: 'role', header: 'System Role', sort: (e) => e.role, render: (e) => <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{e.role}</span> },
          { key: 'join', header: 'Joining Date', sort: (e) => e.joined, render: (e) => fmtDate(e.joined) },
          { key: 'type', header: 'Type', sort: (e) => e.type, render: (e) => <StatusBadge status={e.type} /> }, { key: 'st', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
        ]}
        actions={[{ label: 'View Profile', onClick: (e) => nav(`/hr/employees/${e.id}`) }, { label: 'Request Leave', onClick: () => a.openModal('leave') }]} />
    </>
  )
}

export function EmployeeProfile() {
  const { id } = useParams()
  const { s, a } = useStore()
  const [tab, setTab] = useState('Overview')
  const e = s.employees.find((x) => x.id === id)
  if (!e) return <EmptyState title="Employee not found" action={<Link className="btn-primary" to="/hr/employees">Back to employees</Link>} />
  const att = s.attendance.filter((x) => x.empId === e.id)
  const attPct = att.length ? Math.round((att.filter((x) => x.status === 'Present' || x.status === 'Late').length / att.length) * 100) : 100
  const sal = salaryParts(e.basic)
  const leaves = s.leaves.filter((l) => l.empId === e.id)
  const row = (k: string, v: React.ReactNode) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="text-sm font-medium text-slate-900">{v}</dd></div>
  return (
    <>
      <PageHeader back="/hr/employees" title={e.name} subtitle={`${e.id} · ${e.designation} · ${e.dept}`} actions={<><StatusBadge status={e.status} /><button className="btn-secondary" onClick={() => a.openModal('leave')}>Request Leave</button></>} />
      <Tabs tabs={['Overview', 'Attendance', 'Leave', 'Salary', 'Payroll', 'Documents', 'Production Performance']} active={tab} onChange={setTab} />
      {tab === 'Overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Employee information" className="lg:col-span-2"><dl className="grid grid-cols-2 gap-4 md:grid-cols-3">{[row('Department', e.dept), row('Job Designation', e.designation), row('System Role', e.role), row('Joining Date', fmtDate(e.joined)), row('Employment Type', e.type), row('Phone', e.phone), row('Email', e.email), row('Monthly Gross Salary', money(sal.gross))]}</dl>
            <p className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-500">Job designation describes the person's position at the company; the system role controls what they can see and do in this software.</p></Card>
          <Card title="Snapshot"><div className="space-y-4"><div><div className="text-xs text-slate-500">Attendance (last 5 days)</div><div className="text-2xl font-semibold">{attPct}%</div></div>
            <div><div className="mb-1 text-xs text-slate-500">Leave balance</div><div className="grid grid-cols-3 gap-2 text-center">{(['casual', 'sick', 'annual'] as const).map((k) => <div key={k} className="rounded-md bg-slate-50 p-2"><div className="text-lg font-semibold">{e.leave[k]}</div><div className="text-[11px] capitalize text-slate-500">{k}</div></div>)}</div></div>
            <div><div className="text-xs text-slate-500">Avg. daily output</div><div className="text-2xl font-semibold">{e.perf.output ? `${e.perf.output} pcs` : '—'}</div></div></div></Card>
        </div>
      )}
      {tab === 'Attendance' && <DataTable rows={att} rowKey={(x) => x.id} columns={[{ key: 'd', header: 'Date', sort: (x) => x.date, render: (x) => fmtDate(x.date) }, { key: 'i', header: 'Check In', render: (x) => x.in }, { key: 'o', header: 'Check Out', render: (x) => x.out }, { key: 's', header: 'Status', render: (x) => <StatusBadge status={x.status} /> }, { key: 'h', header: 'Hours', render: (x) => x.hours || '—' }]} />}
      {tab === 'Leave' && <DataTable rows={leaves} rowKey={(l) => l.id} columns={[{ key: 't', header: 'Type', render: (l) => l.type }, { key: 'f', header: 'From', render: (l) => fmtDate(l.from) }, { key: 'to', header: 'To', render: (l) => fmtDate(l.to) }, { key: 'd', header: 'Days', render: (l) => l.days }, { key: 'r', header: 'Reason', render: (l) => l.reason }, { key: 's', header: 'Status', render: (l) => <StatusBadge status={l.status} /> }]} empty={<EmptyState title="No leave requests" />} />}
      {tab === 'Salary' && <Card title="Salary structure"><div className="grid max-w-md gap-2 text-sm">{[['Basic', sal.basic], ['House Allowance', sal.house], ['Medical', sal.medical], ['Transport', sal.transport]].map(([k, v]) => <div key={k as string} className="flex justify-between border-b border-slate-100 py-1.5"><span className="text-slate-600">{k}</span><Money v={v as number} /></div>)}<div className="flex justify-between pt-1 text-base font-semibold"><span>Gross</span><Money v={sal.gross} /></div></div></Card>}
      {tab === 'Payroll' && <DataTable rows={s.payrollHistory} rowKey={(p) => p.month} columns={[{ key: 'm', header: 'Month', render: (p) => p.month }, { key: 'g', header: 'Gross', align: 'right', render: () => <Money v={sal.gross} /> }, { key: 'd', header: 'Deductions', align: 'right', render: () => <Money v={Math.round(sal.gross * 0.05)} /> }, { key: 'n', header: 'Net Paid', align: 'right', render: () => <Money v={sal.gross - Math.round(sal.gross * 0.05)} /> }, { key: 's', header: 'Status', render: (p) => <StatusBadge status={p.status} /> }]} />}
      {tab === 'Documents' && <Card pad={false}><ul className="divide-y divide-slate-100">{['Appointment Letter.pdf', 'National ID Copy.pdf', 'Employment Contract.pdf', 'Bank Account Form.pdf'].map((d) => <li key={d} className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2"><FileText size={16} className="text-slate-400" />{d}</span><button className="btn-ghost btn-sm" onClick={() => a.toast('Document preview is not available in the demo', 'info')}>View</button></li>)}</ul></Card>}
      {tab === 'Production Performance' && (e.perf.output ? <div className="grid gap-3 sm:grid-cols-3">{[['Avg. daily output', `${e.perf.output} pcs`], ['Rejection rate', `${e.perf.rejectRate}%`], ['Line efficiency', `${e.perf.efficiency}%`]].map(([k, v]) => <div key={k} className="card p-4"><div className="text-xs uppercase text-slate-500">{k}</div><div className="text-2xl font-semibold">{v}</div></div>)}</div> : <Card><EmptyState title="No production data yet" text="Performance appears after the employee's first week on the floor." /></Card>)}
    </>
  )
}

export function Departments() {
  const { s } = useStore()
  const rows = DEPARTMENTS.map((d) => { const es = s.employees.filter((e) => e.dept === d); return { name: d, count: es.length, head: es.find((e) => /Manager|Master|Supervisor/.test(e.designation))?.name || es[0]?.name || '—', payroll: es.reduce((t, e) => t + salaryParts(e.basic).gross, 0) } })
  return <><PageHeader title="Departments" subtitle="Organization structure" /><DataTable rows={rows} rowKey={(r) => r.name} columns={[{ key: 'n', header: 'Department', sort: (r) => r.name, render: (r) => <b className="text-slate-900">{r.name}</b> }, { key: 'h', header: 'Head', render: (r) => r.head }, { key: 'c', header: 'Employees', sort: (r) => r.count, render: (r) => r.count }, { key: 'p', header: 'Monthly Payroll', align: 'right', sort: (r) => r.payroll, render: (r) => <Money v={r.payroll} /> }]} /></>
}
export function Designations() {
  const { s } = useStore()
  const rows = Object.entries(DESIGNATIONS).flatMap(([d, list]) => list.map(([n, base, role]) => ({ name: n, dept: d, role, base, count: s.employees.filter((e) => e.designation === n && e.dept === d).length })))
  return <><PageHeader title="Designations" subtitle="Job titles and their default system role" /><DataTable rows={rows} rowKey={(r) => r.dept + r.name} filters={[{ label: 'Department', options: DEPARTMENTS, get: (r) => r.dept }]} columns={[{ key: 'n', header: 'Designation', sort: (r) => r.name, search: (r) => r.name, render: (r) => <b className="text-slate-900">{r.name}</b> }, { key: 'd', header: 'Department', sort: (r) => r.dept }, { key: 'r', header: 'Default System Role', render: (r) => <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{r.role}</span> }, { key: 'b', header: 'Typical Basic', align: 'right', sort: (r) => r.base, render: (r) => <Money v={r.base} /> }, { key: 'c', header: 'Employees', sort: (r) => r.count, render: (r) => r.count }]} /></>
}

export function AttendancePage() {
  const { s } = useStore()
  const [date, setDate] = useState(TODAY)
  const rows = s.attendance.filter((x) => x.date === date)
  return (
    <>
      <PageHeader title="Attendance" subtitle="Daily check-in and check-out records" />
      <DataTable rows={rows} rowKey={(x) => x.id} pageSize={12} searchPlaceholder="Search employee…" toolbar={<DatePicker value={date} onChange={setDate} className="w-40" />}
        filters={[{ label: 'Department', options: DEPARTMENTS, get: (x) => s.employees.find((e) => e.id === x.empId)?.dept || '' }, { label: 'Status', options: ['Present', 'Late', 'Absent', 'Leave'], get: (x) => x.status }]}
        columns={[
          { key: 'd', header: 'Date', sort: (x) => x.date, render: (x) => fmtDate(x.date) },
          { key: 'e', header: 'Employee', sort: (x) => empName(s, x.empId), search: (x) => empName(s, x.empId) + x.empId, render: (x) => <Link to={`/hr/employees/${x.empId}`} className="font-medium text-slate-900 hover:text-brand-600">{empName(s, x.empId)} <span className="font-mono text-xs text-slate-400">{x.empId}</span></Link> },
          { key: 'dept', header: 'Department', render: (x) => s.employees.find((e) => e.id === x.empId)?.dept },
          { key: 'in', header: 'Check In', sort: (x) => x.in, render: (x) => x.in }, { key: 'out', header: 'Check Out', render: (x) => x.out },
          { key: 'st', header: 'Status', sort: (x) => x.status, render: (x) => <StatusBadge status={x.status} /> }, { key: 'h', header: 'Hours', align: 'right', sort: (x) => x.hours, render: (x) => (x.hours ? x.hours.toFixed(1) : '—') },
        ]} empty={<EmptyState title="No attendance records for this date" text="Pick another date between Oct 4 and Oct 8, 2026." />} />
    </>
  )
}

export function LeavePage() {
  const { s, a } = useStore()
  const { ask, el } = useConfirm()
  return (
    <>
      <PageHeader title="Leave Management" subtitle="Review and approve time-off requests" actions={<button className="btn-primary" onClick={() => a.openModal('leave')}><Plus size={15} />New Leave Request</button>} />
      <div className="mb-4 grid grid-cols-3 gap-3"><StatCard label="Pending" value={s.leaves.filter((l) => l.status === 'Pending').length} accent="amber" /><StatCard label="Approved" value={s.leaves.filter((l) => l.status === 'Approved').length} accent="green" /><StatCard label="Rejected" value={s.leaves.filter((l) => l.status === 'Rejected').length} accent="red" /></div>
      <DataTable rows={s.leaves} rowKey={(l) => l.id} filters={[{ label: 'Status', options: ['Pending', 'Approved', 'Rejected'], get: (l) => l.status }, { label: 'Type', options: ['Casual', 'Sick', 'Annual'], get: (l) => l.type }]} searchPlaceholder="Search employee…"
        columns={[
          { key: 'e', header: 'Employee', sort: (l) => empName(s, l.empId), search: (l) => empName(s, l.empId), render: (l) => <div><b className="text-slate-900">{empName(s, l.empId)}</b><div className="text-xs text-slate-400">{l.reason}</div></div> },
          { key: 't', header: 'Type', sort: (l) => l.type }, { key: 'f', header: 'From', sort: (l) => l.from, render: (l) => fmtDate(l.from) }, { key: 'to', header: 'To', render: (l) => fmtDate(l.to) },
          { key: 'd', header: 'Days', align: 'right', sort: (l) => l.days }, { key: 'b', header: 'Balance', render: (l) => { const e = s.employees.find((x) => x.id === l.empId)!; return `${e.leave[l.type.toLowerCase() as 'casual']} days left` } },
          { key: 's', header: 'Status', sort: (l) => l.status, render: (l) => <StatusBadge status={l.status} /> },
          { key: 'a', header: '', render: (l) => l.status === 'Pending' ? <div className="flex gap-1.5"><button className="btn-primary btn-sm" onClick={() => ask({ title: 'Approve leave request?', message: `${empName(s, l.empId)} – ${l.type} leave for ${l.days} day(s). Their leave balance will be reduced.`, confirmLabel: 'Approve', onConfirm: () => a.decideLeave(l.id, 'Approved') })}><Check size={13} />Approve</button><button className="btn-danger btn-sm" onClick={() => ask({ title: 'Reject leave request?', message: `${empName(s, l.empId)}'s request will be rejected.`, confirmLabel: 'Reject', danger: true, onConfirm: () => a.decideLeave(l.id, 'Rejected') })}><X size={13} />Reject</button></div> : null },
        ]} />
      {el}
    </>
  )
}

export function SalaryPage() {
  const { s } = useStore()
  return (
    <>
      <PageHeader title="Salary Structures" subtitle="Monthly components per employee" />
      <DataTable rows={s.employees} rowKey={(e) => e.id} pageSize={12} searchPlaceholder="Search employee…" filters={[{ label: 'Department', options: DEPARTMENTS, get: (e) => e.dept }]}
        columns={[
          { key: 'n', header: 'Employee', sort: (e) => e.name, search: (e) => e.name + e.id, render: (e) => <div><b className="text-slate-900">{e.name}</b><div className="text-xs text-slate-400">{e.id} · {e.designation}</div></div> },
          { key: 'b', header: 'Basic', align: 'right', sort: (e) => e.basic, render: (e) => <Money v={e.basic} /> },
          { key: 'h', header: 'House Allowance', align: 'right', render: (e) => <Money v={salaryParts(e.basic).house} /> }, { key: 'm', header: 'Medical', align: 'right', render: (e) => <Money v={salaryParts(e.basic).medical} /> },
          { key: 't', header: 'Transport', align: 'right', render: (e) => <Money v={salaryParts(e.basic).transport} /> },
          { key: 'g', header: 'Gross', align: 'right', sort: (e) => salaryParts(e.basic).gross, render: (e) => <b><Money v={salaryParts(e.basic).gross} /></b> },
        ]} />
    </>
  )
}

export function PayrollPage() {
  const { s, a } = useStore()
  const { ask, el } = useConfirm()
  const t = payrollTotals(s.employees)
  const st = s.payrollStage
  const next: [string, string | null][] = [['Generate Payroll', null], ['Mark as Reviewed', null], ['Approve Payroll', 'Approve October 2026 Payroll?'], ['Generate Payslips', null], ['Mark as Paid', 'Mark October 2026 Payroll as Paid?']]
  const toast = ['Payroll calculated for ' + s.employees.length + ' employees', 'Payroll reviewed', 'Payroll approved', 'Payslips generated', 'Payroll marked as paid']
  const act = () => { a.advancePayroll(); a.toast(toast[st]) }
  return (
    <>
      <PageHeader title="Payroll" subtitle="Monthly payroll run" />
      <Card className="mb-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="text-lg font-semibold text-slate-900">October 2026 Payroll</div><div className="text-sm text-slate-500">{s.employees.length} employees · period 1–31 Oct</div></div><div className="flex items-center gap-3"><StatusBadge status={PAY_LABEL[st]} color={st === 5 ? 'green' : st === 2 ? 'amber' : st >= 3 ? 'blue' : 'gray'} />
          {st < 5 && <button className="btn-primary" onClick={() => (next[st][1] ? ask({ title: next[st][1]!, message: `Net payroll ${money(t.net)} for ${s.employees.length} employees.`, confirmLabel: st === 2 ? 'Approve' : 'Mark as Paid', onConfirm: act }) : act())}>{next[st][0]}</button>}</div></div>
        <Stepper steps={['Calculate', 'Review', 'Approve', 'Generate Payslips', 'Mark Paid']} current={st} />
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Employees" value={s.employees.length} /><StatCard label="Gross Payroll" value={<Money v={t.gross} />} /><StatCard label="Deductions" value={<Money v={t.deductions} />} accent="amber" /><StatCard label="Net Payroll" value={<Money v={t.net} />} accent="green" /></div>
      {st >= 4 && <div className="mb-3 text-sm text-emerald-700"><Check size={14} className="mr-1 inline" />Payslips are ready for all employees.</div>}
      <Card title={st >= 1 ? 'Employee payroll' : 'Payroll not yet calculated'} pad={false}>
        {st >= 1 ? <DataTable rows={s.employees} rowKey={(e) => e.id} pageSize={8} searchPlaceholder="Search employee…" columns={[
          { key: 'n', header: 'Employee', sort: (e) => e.name, search: (e) => e.name + e.id, render: (e) => <div><b className="text-slate-900">{e.name}</b><div className="text-xs text-slate-400">{e.id} · {e.dept}</div></div> },
          { key: 'g', header: 'Gross', align: 'right', sort: (e) => salaryParts(e.basic).gross, render: (e) => <Money v={salaryParts(e.basic).gross} /> },
          { key: 'd', header: 'Deductions', align: 'right', render: (e) => <Money v={Math.round(salaryParts(e.basic).gross * 0.05)} /> },
          { key: 'net', header: 'Net Pay', align: 'right', sort: (e) => salaryParts(e.basic).gross, render: (e) => <b><Money v={salaryParts(e.basic).gross - Math.round(salaryParts(e.basic).gross * 0.05)} /></b> },
          { key: 'p', header: 'Payslip', render: () => (st >= 4 ? <StatusBadge status="Ready" label="Generated" /> : <span className="text-xs text-slate-400">Pending</span>) },
          { key: 's', header: 'Payment', render: () => <StatusBadge status={st === 5 ? 'Paid' : 'Pending'} /> },
        ]} /> : <EmptyState title="Run the calculation to see employee payroll" action={<button className="btn-primary" onClick={act}>Generate Payroll</button>} />}
      </Card>
      <Card title="Previous months" className="mt-4" pad={false}><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Month</th><th className="th text-right">Employees</th><th className="th text-right">Gross</th><th className="th text-right">Deductions</th><th className="th text-right">Net</th><th className="th">Status</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{s.payrollHistory.map((p) => <tr key={p.month}><td className="td font-medium">{p.month}</td><td className="td text-right">{p.employees}</td><td className="td text-right"><Money v={p.gross} /></td><td className="td text-right"><Money v={p.deductions} /></td><td className="td text-right"><Money v={p.net} /></td><td className="td"><StatusBadge status={p.status} /></td></tr>)}</tbody></table></div></Card>
      {el}
    </>
  )
}
export { fmt }
