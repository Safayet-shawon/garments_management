import { FAQ, PAGES, SITE, slugify, type PageMeta } from '../shared/site.js'
import type { PublicCatalog, PublicProduct } from './catalog.js'
import { config } from './config.js'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const abs = (path: string) => config.siteUrl + path
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')

const ERP_PREFIXES = ['/dashboard', '/products', '/inventory', '/manufacturing', '/procurement', '/hr', '/merchandising', '/reports', '/settings', '/catalog']
export const isErpPath = (p: string) => ERP_PREFIXES.some((x) => p === x || p.startsWith(x + '/'))

export interface RenderedMeta { status: number; meta: PageMeta & { canonical: string; image: string; type: 'website' | 'article' | 'product' }; jsonLd: object[]; body: string }

const orgLd = () => ({
  '@context': 'https://schema.org', '@type': 'Organization', '@id': abs('/#organization'),
  name: SITE.name, legalName: SITE.legalName, url: abs('/'), logo: abs('/icon-512.png'), foundingDate: String(SITE.founded), email: SITE.email, telephone: SITE.phone,
  address: { '@type': 'PostalAddress', streetAddress: SITE.address.street, addressLocality: SITE.address.city, addressRegion: SITE.address.region, postalCode: SITE.address.postalCode, addressCountry: SITE.address.country },
  contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', email: SITE.email, telephone: SITE.phone, availableLanguage: ['English', 'Bengali'] }],
  sameAs: SITE.social,
})
const siteLd = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': abs('/#website'), url: abs('/'), name: SITE.name, inLanguage: 'en', publisher: { '@id': abs('/#organization') } })
const crumbs = (items: [string, string][]) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })) })

function nav(catalog: PublicCatalog) {
  const links = [['/', 'Home'], ['/collections', 'Collections'], ['/about', 'About'], ['/contact', 'Request a quote']]
    .map(([h, t]) => `<a href="${h}">${t}</a>`).join(' · ')
  const prods = catalog.products.map((p) => `<li><a href="/collections/${p.slug}">${esc(p.name)}</a></li>`).join('')
  return `<nav aria-label="Main">${links}</nav><h2>Collections</h2><ul>${prods}</ul>`
}

export function renderRoute(pathname: string, catalog: PublicCatalog): RenderedMeta {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const base = { image: abs('/og-image.jpg'), type: 'website' as const }
  const known = PAGES[path]

  if (known) {
    const ld: object[] = [orgLd(), siteLd()]
    let body = `<h1>${esc(known.h1)}</h1><p>${esc(known.description)}</p>${nav(catalog)}`
    if (path === '/') {
      ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
      body += `<h2>Frequently asked questions</h2>${FAQ.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}`
    }
    if (path === '/collections') {
      ld.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Winner Apparels collections', itemListElement: catalog.products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/collections/${p.slug}`), name: p.name })) })
      ld.push(crumbs([['Home', '/'], ['Collections', '/collections']]))
    }
    if (path === '/about') ld.push(crumbs([['Home', '/'], ['About', '/about']]))
    if (path === '/contact') { ld.push({ '@context': 'https://schema.org', '@type': 'ContactPage', url: abs('/contact'), name: known.title }); ld.push(crumbs([['Home', '/'], ['Contact', '/contact']])) }
    return { status: 200, meta: { ...known, canonical: abs(path === '/' ? '/' : path), ...base }, jsonLd: path === '/login' ? [] : ld, body }
  }

  const m = /^\/collections\/([a-z0-9-]+)$/.exec(path)
  if (m) {
    const p = catalog.products.find((x) => x.slug === m[1])
    if (p) return { status: 200, ...productPage(p, catalog) }
    return { status: 404, meta: { path, title: 'Page not found | Winner Apparels', description: 'This page could not be found.', h1: 'Page not found', keywords: [], index: false, canonical: abs('/'), ...base }, jsonLd: [], body: `<h1>Page not found</h1><p>Try our <a href="/collections">collections</a>.</p>` }
  }

  if (isErpPath(path)) {
    return { status: 200, meta: { path, title: 'Winner Apparels Business Management', description: 'Winner Apparels business management system.', h1: 'Winner Apparels Business Management', keywords: [], index: false, canonical: abs('/'), ...base }, jsonLd: [], body: '' }
  }
  return { status: 404, meta: { path, title: 'Page not found | Winner Apparels', description: 'This page could not be found.', h1: 'Page not found', keywords: [], index: false, canonical: abs('/'), ...base }, jsonLd: [], body: `<h1>Page not found</h1><p>Go back to the <a href="/">Winner Apparels home page</a>.</p>` }
}

function productPage(p: PublicProduct, catalog: PublicCatalog) {
  const title = clip(`${p.name} Manufacturer | Winner Apparels`, 60)
  const description = clip(`${p.name} made to order in Bangladesh: ${p.colors.slice(0, 4).join(', ')} and more, sizes ${p.sizes[0] ?? 'S'} to ${p.sizes[p.sizes.length - 1] ?? 'XL'}. MOQ ${p.moq} pcs, ${p.leadTimeDays} day lead time.`, 158)
  const path = `/collections/${p.slug}`
  const meta = { path, title, description, h1: p.name, keywords: [p.category.toLowerCase() + ' manufacturer', slugify(p.name).replace(/-/g, ' ')], index: true, canonical: abs(path), image: abs(p.image), type: 'product' as const }
  const jsonLd = [
    orgLd(), siteLd(),
    { '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description || description, image: [abs(p.image)], category: p.category, brand: { '@type': 'Brand', name: SITE.name }, manufacturer: { '@id': abs('/#organization') }, url: abs(path), color: p.colors.join(', '), size: p.sizes.join(', ') },
    crumbs([['Home', '/'], ['Collections', '/collections'], [p.name, path]]),
  ]
  const body = `<h1>${esc(p.name)}</h1><p>${esc(p.description || description)}</p><ul><li>Colours: ${esc(p.colors.join(', '))}</li><li>Sizes: ${esc(p.sizes.join(', '))}</li><li>MOQ: ${p.moq} pcs</li><li>Lead time: ${p.leadTimeDays} days</li></ul><p><a href="/contact">Request a quote for ${esc(p.name)}</a></p>${nav(catalog)}`
  return { meta, jsonLd, body }
}

export function headHtml(r: RenderedMeta): string {
  const m = r.meta
  const robots = m.index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'
  const parts = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    m.keywords.length ? `<meta name="keywords" content="${esc(m.keywords.join(', '))}" />` : '',
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${esc(m.canonical)}" />`,
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta property="og:type" content="${m.type === 'product' ? 'product' : 'website'}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.canonical)}" />`,
    `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(m.image)}" />`,
    ...r.jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ]
  return parts.filter(Boolean).join('\n    ')
}

export function applyTemplate(template: string, r: RenderedMeta): string {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace('<!--SEO_HEAD-->', headHtml(r))
    .replace('<!--SEO_BODY-->', r.body ? `<div id="seo-fallback">${r.body}</div>` : '')
}

export function robotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /login',
    ...ERP_PREFIXES.map((p) => `Disallow: ${p}`),
    '',
    `Sitemap: ${abs('/sitemap.xml')}`,
    '',
  ].join('\n')
}

export function sitemapXml(catalog: PublicCatalog, built = new Date()): string {
  const day = (d: string | Date) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10))
  const urls: { loc: string; lastmod: string; priority: string; freq: string; image?: string }[] = [
    { loc: '/', lastmod: day(built), priority: '1.0', freq: 'weekly' },
    { loc: '/collections', lastmod: day(built), priority: '0.9', freq: 'weekly' },
    { loc: '/about', lastmod: day(built), priority: '0.6', freq: 'monthly' },
    { loc: '/contact', lastmod: day(built), priority: '0.8', freq: 'monthly' },
    ...catalog.products.map((p) => ({ loc: `/collections/${p.slug}`, lastmod: p.updated ? day(p.updated) : day(built), priority: '0.7', freq: 'monthly', image: p.image })),
  ]
  const body = urls.map((u) => `  <url>\n    <loc>${esc(abs(u.loc))}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>${u.image ? `\n    <image:image><image:loc>${esc(abs(u.image))}</image:loc></image:image>` : ''}\n  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`
}
