// Runs Lighthouse (performance, accessibility, best practices, SEO) against a running site and checks minimum scores.
//   node scripts/lighthouse.mjs [baseUrl] [--device desktop|mobile]
// Requires Google Chrome. Reports are written to lighthouse-report/ (git-ignored).
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const di = args.indexOf('--device')
const device = di >= 0 ? args[di + 1] : 'desktop'
const base = (args.find((a, i) => !a.startsWith('--') && !(di >= 0 && i === di + 1)) || 'http://localhost:8080').replace(/\/$/, '')
const pages = ['/', '/collections', '/collections/classic-polo-shirt', '/contact']
const MIN = { performance: 0.9, accessibility: 0.9, 'best-practices': 0.9, seo: 0.95 }

mkdirSync('lighthouse-report', { recursive: true })
let failed = false
const rows = []
for (const path of pages) {
  const name = path === '/' ? 'home' : path.slice(1).replace(/\//g, '-')
  const out = `lighthouse-report/${name}-${device}`
  const cli = ['lighthouse', base + path, '--quiet', '--output=json', '--output=html', `--output-path=${out}`, '--chrome-flags=--headless=new --no-sandbox', '--max-wait-for-load=60000', '--only-categories=performance,accessibility,best-practices,seo']
  if (device === 'desktop') cli.push('--preset=desktop')
  let r
  for (let attempt = 1; attempt <= 6; attempt++) { // Chrome occasionally misses the navigation start; retrying is the documented fix
    r = spawnSync('npx', ['--yes', ...cli], { stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32' })
    if (r.status === 0) break
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},4000)']) // let Chrome release its profile before retrying
  }
  if (r.status !== 0) { console.error(`Lighthouse failed for ${path}`); process.exit(2) }
  const json = JSON.parse(readFileSync(`${out}.report.json`, 'utf8'))
  const s = Object.fromEntries(Object.entries(json.categories).map(([k, v]) => [k, v.score]))
  const a = json.audits
  rows.push({ page: path, perf: Math.round(s.performance * 100), a11y: Math.round(s.accessibility * 100), bp: Math.round(s['best-practices'] * 100), seo: Math.round(s.seo * 100), LCP: a['largest-contentful-paint'].displayValue, CLS: a['cumulative-layout-shift'].displayValue, TBT: a['total-blocking-time'].displayValue })
  for (const [k, min] of Object.entries(MIN)) if (s[k] < min) { failed = true; console.error(`  ${path}: ${k} ${Math.round(s[k] * 100)} is below ${min * 100}`) }
}
console.table(rows)
process.exit(failed ? 1 : 0)
