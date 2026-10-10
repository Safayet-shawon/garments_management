import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

export const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { label: 'Catalog', base: '/catalog', items: [['/products', 'Products'], ['/catalog/categories', 'Categories'], ['/catalog/brands', 'Brands'], ['/catalog/attributes', 'Attributes']] },
  { label: 'Inventory', base: '/inventory', items: [['/inventory', 'Overview'], ['/inventory/raw-materials', 'Raw Materials'], ['/inventory/finished-goods', 'Finished Goods'], ['/inventory/warehouses', 'Warehouses'], ['/inventory/movements', 'Stock Movements'], ['/inventory/low-stock', 'Low Stock'], ['/inventory/reservations', 'Reservations']] },
  { label: 'Manufacturing', base: '/manufacturing', items: [['/manufacturing', 'Overview'], ['/manufacturing/plans', 'Production Plans'], ['/manufacturing/requirements', 'Material Requirements'], ['/manufacturing/cutting', 'Cutting'], ['/manufacturing/sewing', 'Sewing'], ['/manufacturing/finishing', 'Finishing'], ['/manufacturing/qc', 'Quality Control'], ['/manufacturing/reports', 'Reports']] },
  { label: 'Procurement', base: '/procurement', items: [['/procurement', 'Overview'], ['/procurement/suppliers', 'Suppliers'], ['/procurement/requirements', 'Requirements'], ['/procurement/orders', 'Purchase Orders'], ['/procurement/receiving', 'Receiving']] },
  { label: 'HR', base: '/hr', items: [['/hr', 'Overview'], ['/hr/employees', 'Employees'], ['/hr/departments', 'Departments'], ['/hr/designations', 'Designations'], ['/hr/attendance', 'Attendance'], ['/hr/leave', 'Leave'], ['/hr/salary', 'Salary Structure'], ['/hr/payroll', 'Payroll']] },
  { label: 'Merchandising', base: '/merchandising', items: [['/merchandising', 'Overview'], ['/merchandising/orders', 'Buyer Orders'], ['/merchandising/buyers', 'Buyers'], ['/merchandising/shipments', 'Shipments'], ['/merchandising/countries', 'Countries']] },
  { label: 'Reports', base: '/reports', items: [['/reports/sales', 'Sales'], ['/reports/inventory', 'Inventory'], ['/reports/production', 'Production'], ['/reports/procurement', 'Procurement'], ['/reports/hr', 'HR']] },
  { label: 'Settings', base: '/settings', items: [['/settings/users', 'Users'], ['/settings/roles', 'Roles'], ['/settings/system', 'System']] },
];

export default function Layout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('wa-theme') === 'dark'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('wa-theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="logo">WINNER<small>Apparels</small></div>
        <nav>
          {NAV.map((g) =>
            g.to ? (
              <NavLink key={g.to} to={g.to} className={({ isActive }) => `top ${isActive ? 'active' : ''}`}>{g.label}</NavLink>
            ) : (
              <details key={g.label} open={pathname.startsWith(g.base) || (g.label === 'Catalog' && pathname.startsWith('/products'))}>
                <summary>{g.label}</summary>
                <div className="sub">
                  {g.items.map(([to, text]) => (
                    <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'active' : '')}>{text}</NavLink>
                  ))}
                </div>
              </details>
            ),
          )}
        </nav>
      </aside>
      <div className="main">
        <header className="top">
          <button className="btn menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <div className="sp" />
          <span className="badge-demo hide-sm">Demo Environment</span>
          <button className="btn sm" onClick={() => setDark(!dark)}>{dark ? '☀ Light' : '☾ Dark'}</button>
          <div className="avatar">SS</div>
          <div className="hide-sm" style={{ lineHeight: 1.2 }}>
            <b style={{ fontSize: 12 }}>Safayet Shawon</b>
            <div className="muted" style={{ fontSize: 11 }}>Administrator</div>
          </div>
        </header>
        <main className="content">
          <div className="page"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
