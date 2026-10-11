import { Check, RotateCcw } from 'lucide-react'
import { useStore } from '../store'
import { Card, DataTable, FormField, PageHeader, StatusBadge, useConfirm } from '../ui'
import { SYSTEM_ROLES } from '../data'

export function UsersPage() {
  const { s } = useStore()
  const rows = s.employees.filter((e) => ['Admin', 'Manager', 'HR Officer', 'Accountant', 'Store Keeper', 'QC Inspector', 'Merchandiser'].includes(e.role)).map((e, i) => ({ ...e, last: ['Today 09:12', 'Today 08:41', 'Yesterday', '2 days ago', 'Today 10:05'][i % 5] }))
  return <><PageHeader title="Users" subtitle="People who can sign in to Winner Apparels" /><DataTable rows={rows} rowKey={(e) => e.id} pageSize={10} searchPlaceholder="Search users…" filters={[{ label: 'Role', options: SYSTEM_ROLES, get: (e) => e.role }]} columns={[{ key: 'n', header: 'User', sort: (e) => e.name, search: (e) => e.name, render: (e) => <div><b className="text-slate-900">{e.name}</b><div className="text-xs text-slate-400">{e.email}</div></div> }, { key: 'r', header: 'System Role', sort: (e) => e.role, render: (e) => e.role }, { key: 'd', header: 'Department', sort: (e) => e.dept }, { key: 'l', header: 'Last Active', render: (e) => e.last }, { key: 's', header: 'Status', render: () => <StatusBadge status="Active" /> }]} /></>
}

const MODULES = ['Catalog', 'Inventory', 'Manufacturing', 'Procurement', 'HR', 'Payroll', 'Merchandising', 'Reports', 'Settings']
const ACCESS: Record<string, string[]> = {
  Admin: MODULES, Manager: ['Catalog', 'Inventory', 'Manufacturing', 'Procurement', 'HR', 'Merchandising', 'Reports'], Supervisor: ['Inventory', 'Manufacturing', 'Reports'], 'Production Worker': ['Manufacturing'],
  'HR Officer': ['HR', 'Payroll', 'Reports'], 'Store Keeper': ['Inventory', 'Procurement'], Accountant: ['Procurement', 'Payroll', 'Merchandising', 'Reports'], 'QC Inspector': ['Manufacturing', 'Inventory'], 'Merchandiser': ['Catalog', 'Merchandising', 'Reports'],
}
export function RolesPage() {
  const { s } = useStore()
  return (
    <>
      <PageHeader title="Roles & Permissions" subtitle="System roles decide what each person can access – separate from their job designation" />
      <Card pad={false}><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Role</th><th className="th">Users</th>{MODULES.map((m) => <th key={m} className="th text-center">{m}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{SYSTEM_ROLES.map((r) => <tr key={r}><td className="td font-semibold text-slate-900">{r}</td><td className="td">{s.employees.filter((e) => e.role === r).length}</td>{MODULES.map((m) => <td key={m} className="td text-center">{ACCESS[r].includes(m) ? <Check size={16} className="mx-auto text-emerald-500" /> : <span className="text-slate-300">—</span>}</td>)}</tr>)}</tbody></table></div></Card>
    </>
  )
}

export function SystemSettings() {
  const { s, a } = useStore()
  const { ask, el } = useConfirm()
  return (
    <>
      <PageHeader title="System Settings" subtitle="Company profile and demo controls" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Company profile"><div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Company"><input className="input" defaultValue="Winner Apparels Ltd." /></FormField><FormField label="Factory"><input className="input" defaultValue="Gazipur Factory" /></FormField>
          <FormField label="Currency"><input className="input bg-slate-50" readOnly value="USD export / BDT local" /></FormField><FormField label="Fiscal year start"><input className="input bg-slate-50" readOnly value="1 July" /></FormField>
          <div className="sm:col-span-2"><button className="btn-primary" onClick={() => a.toast('Settings saved')}>Save Changes</button></div></div></Card>
        <Card title="Demo controls">
          <p className="mb-4 text-sm text-slate-500">This is a frontend-only prototype with sample data. Use these tools while presenting.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-slate-200 p-3"><div><div className="text-sm font-medium">Simulate inventory load error</div><div className="text-xs text-slate-500">Shows the error state on Inventory → Overview</div></div><button className={s.inventoryError ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'} onClick={() => a.setInventoryError(!s.inventoryError)}>{s.inventoryError ? 'Turn off' : 'Turn on'}</button></div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 p-3"><div><div className="text-sm font-medium">Reset demo data</div><div className="text-xs text-slate-500">Restore all sample inventory, production, HR and sales data</div></div><button className="btn-secondary btn-sm" onClick={() => ask({ title: 'Reset demo data?', message: 'All changes you made during this session will be discarded.', confirmLabel: 'Reset', danger: true, onConfirm: a.resetDemo })}><RotateCcw size={13} />Reset</button></div>
          </div>
        </Card>
      </div>
      {el}
    </>
  )
}
