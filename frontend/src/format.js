export const num = (n, d = 0) => Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: d });
export const bdt = (n) => '৳' + num(n);
export const usd = (n) => '$' + num(n);
export const label = (s) => String(s || '').replace(/_/g, ' ');
