// Technical SEO audit of a running site (raw server HTML, i.e. what a crawler sees before running JavaScript).
//   node scripts/seo-audit.mjs [baseUrl] [--md docs/SEO-AUDIT.md]
// Checks: robots.txt, sitemap, title tags, meta descriptions, H1 structure, canonical, schema markup,
// Open Graph, internal links (including broken ones) and keyword targeting.
import { writeFileSync } from 'node:fs'
import * as cheerio from 'cheerio'

const args = process.argv.slice(2)
const mdIdx = args.indexOf('--md')
const mdPath = mdIdx >= 0 ? args[mdIdx + 1] : null
const base = (args.find((a, i) => !a.startsWith('--') && !(mdIdx >= 0 && i === mdIdx + 1)) || 'http://localhost:8080').replace(/\/$/, '')

const results = []
const add = (page, check, level, msg) => results.push({ page, check, level, msg })
const get = async (url, init) => { const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WinnerSeoAudit/1.0)' }, ...init }); return { r, text: init?.method === 'HEAD' ? '' : await r.text() } }

const KEYWORDS = { '/': 'garment manufacturer', '/collections': 'collections', '/about': 'garment factory', '/contact': 'quote' }

async function main() {
  // ---- robots.txt
  const robots = await get(`${base}/robots.txt`)
  if (robots.r.status !== 200) add('/robots.txt', 'robots.txt', 'error', `status ${robots.r.status}`)
  else {
    add('/robots.txt', 'robots.txt', 'pass', 'served as plain text')
    if (!/^sitemap:\s*\S+/im.test(robots.text)) add('/robots.txt', 'robots.txt sitemap', 'error', 'no Sitemap: line')
    else add('/robots.txt', 'robots.txt sitemap', 'pass', 'Sitemap line present')
    if (/^disallow:\s*\/\s*$/im.test(robots.text)) add('/robots.txt', 'robots.txt blocks site', 'error', 'Disallow: / blocks everything')
  }
  const disallowed = [...robots.text.matchAll(/^disallow:\s*(\S+)/gim)].map((m) => m[1])

  // ---- sitemap
  const sm = await get(`${base}/sitemap.xml`)
  const locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  if (sm.r.status !== 200 || !locs.length) add('/sitemap.xml', 'sitemap', 'error', `status ${sm.r.status}, ${locs.length} URLs`)
  else add('/sitemap.xml', 'sitemap', 'pass', `${locs.length} URLs`)
  const paths = locs.map((l) => { try { return new URL(l).pathname } catch { return null } }).filter(Boolean)
  for (const p of paths) if (disallowed.some((d) => p.startsWith(d))) add(p, 'sitemap vs robots', 'error', 'URL is in the sitemap but disallowed in robots.txt')
  if (new Set(locs).size !== locs.length) add('/sitemap.xml', 'sitemap duplicates', 'warn', 'duplicate URLs')

  const titles = new Map(), descs = new Map()
  const internal = new Set()
  for (const path of paths) {
    const { r, text } = await get(base + path)
    if (r.status !== 200) { add(path, 'status', 'error', `HTTP ${r.status}`); continue }
    const $ = cheerio.load(text)
    const title = $('title').first().text().trim()
    const desc = $('meta[name="description"]').attr('content')?.trim() ?? ''
    // title tag
    if (!title) add(path, 'title tag', 'error', 'missing')
    else if ($('title').length > 1) add(path, 'title tag', 'error', 'more than one <title>')
    else if (title.length < 30 || title.length > 60) add(path, 'title tag', 'warn', `${title.length} chars (aim for 30-60): "${title}"`)
    else add(path, 'title tag', 'pass', `${title.length} chars`)
    titles.set(title, [...(titles.get(title) ?? []), path])
    // meta description
    if (!desc) add(path, 'meta description', 'error', 'missing')
    else if (desc.length < 70 || desc.length > 160) add(path, 'meta description', 'warn', `${desc.length} chars (aim for 70-160)`)
    else add(path, 'meta description', 'pass', `${desc.length} chars`)
    descs.set(desc, [...(descs.get(desc) ?? []), path])
    // H1 structure
    const h1 = $('h1')
    if (h1.length !== 1) add(path, 'H1', 'error', `${h1.length} H1 tags (need exactly 1)`)
    else add(path, 'H1', 'pass', `"${h1.text().trim().slice(0, 70)}"`)
    let last = 0, skip = false
    $('h1,h2,h3,h4,h5,h6').each((_, el) => { const n = Number(el.tagName[1]); if (last && n > last + 1) skip = true; last = n })
    if (skip) add(path, 'heading order', 'warn', 'heading level skipped')
    // canonical
    const canon = $('link[rel="canonical"]').attr('href')
    const expect = base + (path === '/' ? '/' : path)
    if (!canon) add(path, 'canonical', 'error', 'missing')
    else if ($('link[rel="canonical"]').length > 1) add(path, 'canonical', 'error', 'multiple canonical tags')
    else if (new URL(canon, base).pathname !== new URL(expect).pathname) add(path, 'canonical', 'error', `points to ${canon}`)
    else add(path, 'canonical', 'pass', 'self-referencing')
    // robots meta
    const rm = $('meta[name="robots"]').attr('content') ?? ''
    if (/noindex/i.test(rm)) add(path, 'robots meta', 'error', 'noindex on a sitemap URL')
    // schema markup
    const types = []
    let bad = 0
    $('script[type="application/ld+json"]').each((_, el) => { try { const j = JSON.parse($(el).text()); types.push(j['@type']) } catch { bad++ } })
    if (bad) add(path, 'schema markup', 'error', `${bad} invalid JSON-LD block(s)`)
    else if (!types.length) add(path, 'schema markup', 'warn', 'no structured data')
    else add(path, 'schema markup', 'pass', types.flat().join(', '))
    // social tags
    const og = ['og:title', 'og:description', 'og:image', 'og:url'].filter((k) => !$(`meta[property="${k}"]`).attr('content'))
    if (og.length) add(path, 'Open Graph', 'warn', `missing ${og.join(', ')}`)
    else add(path, 'Open Graph', 'pass', 'complete')
    // internal links
    let links = 0
    $('a[href]').each((_, el) => { const h = $(el).attr('href'); if (h?.startsWith('/') && !h.startsWith('//')) { links++; internal.add(h.split('#')[0]) } })
    if (links < 3) add(path, 'internal links', 'warn', `${links} internal links in the server HTML`)
    else add(path, 'internal links', 'pass', `${links} links`)
    // keyword targeting
    const kw = (KEYWORDS[path] || (path.startsWith('/collections/') ? $('h1').text().trim().toLowerCase().split(' ').slice(-1)[0] : '')).toLowerCase()
    if (kw) {
      const where = { title: title.toLowerCase().includes(kw), h1: h1.text().toLowerCase().includes(kw), description: desc.toLowerCase().includes(kw) }
      const missing = Object.entries(where).filter(([, v]) => !v).map(([k]) => k)
      if (missing.length > 1) add(path, 'keyword targeting', 'warn', `"${kw}" missing from ${missing.join(', ')}`)
      else add(path, 'keyword targeting', 'pass', `"${kw}" appears in title/H1/description`)
    }
  }
  for (const [t, ps] of titles) if (ps.length > 1) add(ps.join(', '), 'duplicate titles', 'error', `"${t}"`)
  for (const [d, ps] of descs) if (ps.length > 1) add(ps.join(', '), 'duplicate descriptions', 'error', d.slice(0, 60))

  // ---- broken internal links
  let broken = 0
  for (const href of internal) {
    if (!href || href === '/') continue
    const { r } = await get(base + href, { method: 'HEAD' })
    if (r.status >= 400) { broken++; add(href, 'broken link', 'error', `HTTP ${r.status}`) }
  }
  if (!broken) add('(site)', 'broken internal links', 'pass', `${internal.size} unique links checked`)

  // ---- unknown URL must be a real 404, protected app must be noindex
  const nf = await get(`${base}/definitely-not-a-page`)
  add('/definitely-not-a-page', 'soft 404', nf.r.status === 404 ? 'pass' : 'error', `HTTP ${nf.r.status}`)
  const erp = cheerio.load((await get(`${base}/dashboard`)).text)
  add('/dashboard', 'private area noindex', /noindex/i.test(erp('meta[name="robots"]').attr('content') ?? '') ? 'pass' : 'error', 'application pages are not indexable')

  report()
}

function report() {
  const order = { error: 0, warn: 1, pass: 2 }
  const counts = { error: 0, warn: 0, pass: 0 }
  results.forEach((r) => counts[r.level]++)
  const icon = { error: 'FAIL', warn: 'WARN', pass: 'PASS' }
  console.log(`\nSEO audit of ${base}\n${'-'.repeat(60)}`)
  for (const r of [...results].sort((a, b) => order[a.level] - order[b.level])) if (r.level !== 'pass') console.log(`${icon[r.level]}  ${r.page}  [${r.check}]  ${r.msg}`)
  console.log(`\n${counts.pass} passed, ${counts.warn} warnings, ${counts.error} errors`)
  if (mdPath) {
    const rows = results.map((r) => `| ${icon[r.level]} | \`${r.page}\` | ${r.check} | ${r.msg.replace(/\|/g, '/')} |`).join('\n')
    writeFileSync(mdPath, `# Technical SEO audit\n\nSite: ${base}\n\n**${counts.pass} passed, ${counts.warn} warnings, ${counts.error} errors**\n\nChecked: sitemap, robots.txt, title tags, meta descriptions, H1 structure, canonical, schema markup, Open Graph, internal links and keyword targeting. Run it again with \`npm run seo:audit\`.\n\n| Result | Page | Check | Detail |\n|---|---|---|---|\n${rows}\n`)
    console.log(`Report written to ${mdPath}`)
  }
  process.exit(counts.error ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(2) })
