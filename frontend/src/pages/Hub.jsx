import { Link } from 'react-router-dom';
import { Kpi, PageHead } from '../components/ui.jsx';

export function Hub({ title, sub, cards }) {
  return (
    <>
      <PageHead title={title} sub={sub} />
      <div className="grid g4">
        {cards.map(([to, name, desc]) => (
          <Link key={to} to={to} className="card">
            <h3>{name}</h3>
            <div className="muted">{desc}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
export { Kpi };
