import { useState } from 'react';
import { DataTable, FormModal, Loading, PageHead, Pill } from '../components/ui.jsx';
import { api } from '../api.js';
import { useAction, useFetch, useToast } from '../hooks.js';

const ROLES = ['Admin', 'Manager', 'Supervisor', 'Production Worker', 'HR Officer', 'Store Keeper', 'Accountant', 'QC Inspector', 'Merchandiser'];

export function Users() {
  const st = useFetch('/settings/users');
  const run = useAction(st.reload);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Users"><button className="btn primary" onClick={() => setOpen(true)}>+ Add user</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['name', 'email']} columns={[
        { label: 'Name', render: (u) => <b>{u.name}</b> }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { label: 'Status', render: (u) => <Pill>{u.status}</Pill> },
        { label: '', render: (u) => <button className="btn sm" onClick={() => run(() => api.put(`/settings/users/${u.id}`, { status: u.status === 'Active' ? 'Inactive' : 'Active' }), 'User updated')}>{u.status === 'Active' ? 'Deactivate' : 'Activate'}</button> },
      ]} />}
      {open && <FormModal title="Add user" onClose={() => setOpen(false)} fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'role', label: 'Role', type: 'select', required: true, options: ROLES }, { name: 'password', label: 'Password', type: 'password', required: true }]}
        onSubmit={async (v) => (await run(() => api.post('/settings/users', v), 'User added')) !== null} />}
    </>
  );
}

export function Roles() {
  const st = useFetch('/settings/roles');
  return (<><PageHead title="Roles & permissions" /><Loading state={st} />{st.data && <DataTable rows={st.data.map((r) => ({ ...r, id: r.name }))} columns={[
    { label: 'Role', render: (r) => <b>{r.name}</b> }, { label: 'Permissions', render: (r) => r.permissions.join(', ') }, { label: 'Employees', align: 'right', render: (r) => r.employees },
  ]} />}</>);
}

export function SystemSettings() {
  const st = useFetch('/settings/system');
  const run = useAction(st.reload);
  const toast = useToast();
  const [f, setF] = useState(null);
  if (st.loading || st.error) return <Loading state={st} />;
  const v = f || st.data;
  const set = (k) => (e) => setF({ ...v, [k]: e.target.value });
  return (
    <>
      <PageHead title="System settings" />
      <form className="card" style={{ maxWidth: 520 }} onSubmit={(e) => { e.preventDefault(); run(() => api.put('/settings/system', { company: v.company, factory: v.factory, currency: v.currency }), 'Settings saved'); }}>
        <label className="f">Company<input value={v.company} onChange={set('company')} /></label>
        <label className="f">Factory<input value={v.factory} onChange={set('factory')} /></label>
        <label className="f">Currency (3 letters)<input maxLength={3} value={v.currency} onChange={set('currency')} /></label>
        <button className="btn primary">Save</button>
      </form>
      <div className="card" style={{ maxWidth: 520 }}>
        <h2>Demo data</h2>
        <p className="muted">Restore the original sample data set. All changes will be lost.</p>
        <button className="btn danger" onClick={async () => { if (confirm('Reset all demo data?')) { try { await api.post('/settings/reset'); toast('Demo data has been reset'); st.reload(); } catch (e) { toast(e.message, 'error'); } } }}>Reset demo data</button>
      </div>
    </>
  );
}
