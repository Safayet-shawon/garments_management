import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Kpi, Loading, PageHead, Pill } from '../components/ui.jsx';
import { useFetch } from '../hooks.js';
import { bdt, num, usd } from '../format.js';

export default function Dashboard() {
  const st = useFetch('/dashboard');
  if (st.loading || st.error) return <Loading state={st} />;
  const d = st.data;
  const k = d.kpis;
  return (
    <>
      <PageHead title="Executive Dashboard" sub={`Factory overview as of ${d.as_of}`} />
      <div className="grid g4">
        <Kpi label="Sales (30 days)" value={bdt(k.sales_30d)} to="/reports/sales" />
        <Kpi label="Open buyer orders" value={k.open_orders} to="/merchandising/orders" />
        <Kpi label="Output today" value={`${num(k.output_today)} pcs`} sub={`${k.active_plans} active plans`} to="/manufacturing/plans" />
        <Kpi label="Finished goods" value={`${num(k.finished_goods)} pcs`} to="/inventory/finished-goods" />
        <Kpi label="Low stock materials" value={k.low_stock} sub={`${k.critical_stock} critical`} to="/inventory/low-stock" />
        <Kpi label="Open purchase orders" value={k.pending_pos} sub={`${k.pending_requisitions} requirements pending`} to="/procurement/orders" />
        <Kpi label="Employees" value={k.employees} to="/hr/employees" />
        <Kpi label="Attendance today" value={`${k.attendance_rate}%`} sub={`${k.present_today} present`} to="/hr/attendance" />
      </div>

      <div className="grid g2">
        <div className="card">
          <h2>Sales trend</h2>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={d.sales_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => bdt(v)} />
                <Area dataKey="revenue" stroke="#d4a21f" fill="#d4a21f33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2>Production by stage</h2>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={d.production_by_stage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="plans" fill="#2f4ba3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card flush">
          <div className="toolbar"><b>Recent buyer orders</b></div>
          <table>
            <tbody>
              {d.recent_orders.map((o) => (
                <tr key={o.id}>
                  <td><Link to="/merchandising/orders"><b>{o.id}</b></Link></td>
                  <td>{o.buyer_po}</td>
                  <td className="right">{usd(o.value)}</td>
                  <td><Pill>{o.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card flush">
          <div className="toolbar"><b>Low stock alerts</b></div>
          <table>
            <tbody>
              {d.low_stock_items.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td className="right">{num(m.on_hand)} {m.unit}</td>
                  <td><Pill>{m.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Recent activity</h2>
        {d.activities.map((a) => (
          <div key={a.id} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
            {a.text} <span className="muted">· {a.by}</span>
          </div>
        ))}
      </div>
    </>
  );
}
