import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import compression from 'compression'
import express, { type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { z } from 'zod'
import { COLLECTIONS, KV_KEYS, idOf, type Bootstrap } from '../shared/collections.js'
import { assignLines, sizeColorMatrix } from '../shared/planning.js'
import { SUPPLIER_CATEGORIES, buildMrp, rankForCategory, DEFAULT_CRITERIA, type PlanningData } from '../shared/scenario.js'
import { buildSeed } from '../src/seedState.js'
import { hashPassword, issueToken, requireAuth, verifyPassword } from './auth.js'
import { LruCache, singleFlight } from './cache.js'
import { buildCatalog, type PublicCatalog } from './catalog.js'
import { config } from './config.js'
import type { Db } from './db.js'
import { applySync, currentRev, loadAll, replaceAll } from './repo.js'
import { applyTemplate, isErpPath, renderRoute, robotsTxt, sitemapXml } from './seo.js'

const sha = (x: unknown) => createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 16)
const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost', 'converted'] as const

const num = z.number().finite()
const SyncSchema = z.object({
  changes: z.record(z.string(), z.object({ upsert: z.array(z.record(z.string(), z.any())).max(5000), remove: z.array(z.string().max(120)).max(5000) })),
  order: z.record(z.string(), z.array(z.string().max(120)).max(20000)).optional(),
  kv: z.record(z.string(), z.unknown()),
})
const InquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  company: z.string().trim().max(160).optional().default(''),
  country: z.string().trim().max(80).optional().default(''),
  interest: z.string().trim().max(120).optional().default(''),
  quantity: z.number().int().min(0).max(10_000_000).nullable().optional(),
  message: z.string().trim().min(10).max(3000),
  website: z.string().max(300).optional().default(''), // honeypot
})
const MrpSchema = z.object({ qty: z.record(z.string(), num.min(0).max(10_000_000)), includeOnOrder: z.boolean().optional(), withWaste: z.boolean().optional() })
const SuppliersSchema = z.object({ category: z.enum(SUPPLIER_CATEGORIES), weights: z.record(z.string(), num.min(0).max(100)).optional() })
const AssignSchema = z.object({
  lines: z.array(z.object({ id: z.string(), name: z.string(), operators: num.min(1).max(500), efficiency: num.min(0.05).max(1), hoursPerDay: num.min(1).max(24), specialty: z.array(z.string()) })).min(1).max(30),
  jobs: z.array(z.object({ id: z.string(), label: z.string(), qty: num.min(1).max(10_000_000), sam: num.min(0.1).max(500), category: z.string(), dueInDays: num.min(0).max(365) })).min(1).max(60),
  changeoverDays: num.min(0).max(30).optional(), latePenalty: num.min(0).max(100).optional(),
})
const SizeSchema = z.object({
  total: z.number().int().min(1).max(10_000_000), sizes: z.array(z.string().min(1).max(8)).min(1).max(12), ratio: z.array(num.min(0).max(1000)).min(1).max(12),
  colors: z.array(z.string().min(1).max(30)).min(1).max(20), colorShare: z.array(num.min(0).max(1000)).min(1).max(20), consumptionKg: z.array(num.min(0).max(50)).min(1).max(12),
  piecesPerCarton: z.number().int().min(1).max(1000), cuttingAllowancePct: num.min(0).max(30),
})

export interface AppOptions { db: Db; distDir?: string; quiet?: boolean; mode?: 'all' | 'site' | 'erp' }

export async function createApp({ db, distDir = resolve(process.cwd(), config.distDir), quiet = false, mode = config.appMode }: AppOptions) {
  const hasSite = mode !== 'erp'
  const hasErp = mode !== 'site'
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'"],
        'upgrade-insecure-requests': config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }))
  app.use(compression({ threshold: 1024 }))
  app.use(express.json({ limit: '6mb' }))

  if (!quiet) {
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api/')) return next()
      const t = process.hrtime.bigint()
      res.on('finish', () => console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${(Number(process.hrtime.bigint() - t) / 1e6).toFixed(1)}ms`))
      next()
    })
  }

  // ---------- caches ----------
  type Boot = { rev: number; json: string; gz: Buffer }
  let boot: Boot | null = null
  const bootFlight = singleFlight<Boot>()
  const computeCache = new LruCache<unknown>(300, 10 * 60_000)
  const catalogCache = new LruCache<{ rev: number; catalog: PublicCatalog }>(1, 10 * 60_000)
  const planCache = new LruCache<{ rev: number; data: PlanningData }>(1, 60_000)

  async function getBoot(): Promise<Boot> {
    const rev = await currentRev(db.query)
    if (boot && boot.rev === rev) return boot
    return bootFlight('boot', async () => {
      const b: Bootstrap = await loadAll(db.query)
      const json = JSON.stringify(b)
      boot = { rev: b.rev, json, gz: gzipSync(json, { level: 6 }) } // compressed once, reused for every client
      return boot
    })
  }
  async function getCatalog(): Promise<PublicCatalog> {
    const rev = await currentRev(db.query)
    const hit = catalogCache.get('c')
    if (hit && hit.rev === rev) return hit.catalog
    const catalog = await buildCatalog(db)
    catalogCache.set('c', { rev, catalog })
    return catalog
  }
  async function getPlanning(): Promise<{ rev: number; data: PlanningData }> {
    const rev = await currentRev(db.query)
    const hit = planCache.get('p')
    if (hit && hit.rev === rev) return hit
    const b = await getBoot()
    const c = JSON.parse(b.json) as Bootstrap
    const bom = Object.fromEntries((c.collections.bom ?? []).map((d: any) => [d.id, d.lines]))
    const entry = { rev: b.rev, data: { products: c.collections.products, materials: c.collections.materials, bom, pos: c.collections.pos, suppliers: c.collections.suppliers } as PlanningData }
    planCache.set('p', entry)
    return entry
  }

  // ---------- rate limits ----------
  const limiter = (windowMs: number, limit: number, message: string) => rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: message }, skip: () => config.isProd === false && process.env.RATE_LIMIT !== 'on' })
  const loginLimit = limiter(15 * 60_000, 10, 'Too many sign-in attempts. Try again in a few minutes.')
  const inquiryLimit = limiter(60 * 60_000, 6, 'Too many requests from this network. Please try again later or email us directly.')

  const api = express.Router()
  const authed = requireAuth()

  api.get('/health', async (_req, res) => {
    await db.query('select 1')
    res.set('Cache-Control', 'no-store').json({ ok: true, db: db.kind, demo: db.kind === 'memory' && hasErp, version: config.version, mode })
  })

  if (hasErp) {
  // ---------- auth ----------
  api.post('/auth/login', loginLimit, async (req, res) => {
    const p = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) }).safeParse(req.body)
    if (!p.success) return res.status(400).json({ error: 'Enter a valid email and password' })
    const r = await db.query<{ email: string; name: string; role: string; password_hash: string }>('select email, name, role, password_hash from users where email = $1', [p.data.email])
    const u = r.rows[0]
    const ok = u ? await verifyPassword(p.data.password, u.password_hash) : (await hashPassword(p.data.password), false) // equalise timing
    if (!u || !ok) return res.status(401).json({ error: 'Email or password is incorrect' })
    res.json({ token: issueToken(u), user: { email: u.email, name: u.name, role: u.role } })
  })
  api.get('/auth/me', authed, (req, res) => res.json({ email: req.session!.sub, name: req.session!.name, role: req.session!.role }))

  // ---------- data sync ----------
  api.get('/bootstrap', authed, async (req, res) => {
    const rev = await currentRev(db.query)
    const etag = `W/"rev-${rev}"`
    res.set({ ETag: etag, 'Cache-Control': 'private, no-cache', Vary: 'Authorization, Accept-Encoding' })
    if (req.headers['if-none-match'] === etag) return res.status(304).end()
    const b = await getBoot()
    res.type('application/json')
    if (/\bgzip\b/.test(String(req.headers['accept-encoding']))) return res.set({ 'Content-Encoding': 'gzip', 'Content-Length': String(b.gz.length) }).end(b.gz)
    res.send(b.json)
  })

  api.post('/sync', authed, async (req, res) => {
    const p = SyncSchema.safeParse(req.body)
    if (!p.success) return res.status(400).json({ error: 'Invalid sync payload', details: p.error.issues.slice(0, 5) })
    const known = new Set<string>(COLLECTIONS)
    for (const [name, ch] of Object.entries(p.data.changes)) {
      if (!known.has(name)) return res.status(400).json({ error: `Unknown collection "${name}"` })
      if (ch.upsert.some((d) => d == null || idOf(name, d) === 'undefined' || idOf(name, d).length > 120)) return res.status(400).json({ error: `A ${name} document is missing its id` })
    }
    for (const name of Object.keys(p.data.order ?? {})) if (!known.has(name)) return res.status(400).json({ error: `Unknown collection "${name}"` })
    for (const k of Object.keys(p.data.kv)) if (!(KV_KEYS as readonly string[]).includes(k)) return res.status(400).json({ error: `Unknown setting "${k}"` })
    const out = await applySync(db, p.data)
    boot = null; catalogCache.clear(); planCache.clear()
    res.json(out)
  })

  api.post('/admin/reset', requireAuth('admin'), async (_req, res) => {
    await replaceAll(db, buildSeed() as unknown as Record<string, any>)
    boot = null; catalogCache.clear(); planCache.clear(); computeCache.clear()
    res.json({ rev: await currentRev(db.query) })
  })

  }

  if (hasSite) {
  // ---------- public website ----------
  api.get('/public/catalog', async (req, res) => {
    const rev = await currentRev(db.query)
    const etag = `W/"cat-${rev}"`
    res.set({ ETag: etag, 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' })
    if (req.headers['if-none-match'] === etag) return res.status(304).end()
    res.json(await getCatalog())
  })

  api.post('/public/inquiries', inquiryLimit, async (req, res) => {
    const p = InquirySchema.safeParse(req.body)
    if (!p.success) return res.status(400).json({ error: 'Please check the form and try again', details: p.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) })
    if (p.data.website) return res.status(201).json({ id: 0 }) // bots fill the hidden field; pretend success
    const ipHash = createHash('sha256').update(`${req.ip}|${config.authSecret}`).digest('hex').slice(0, 24)
    const r = await db.query<{ id: string | number }>(
      'insert into inquiries (name, email, company, country, interest, quantity, message, ip_hash) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id',
      [p.data.name, p.data.email, p.data.company, p.data.country, p.data.interest, p.data.quantity ?? null, p.data.message, ipHash],
    )
    res.status(201).json({ id: Number(r.rows[0].id) })
  })

  }

  if (hasErp) {
  // ---------- inquiries (admin) ----------
  api.get('/inquiries', authed, async (req, res) => {
    const q = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(15), search: z.string().trim().max(100).default(''), status: z.string().max(20).default('') }).parse(req.query)
    const where: string[] = []
    const params: unknown[] = []
    if (q.status) { params.push(q.status); where.push(`status = $${params.length}`) }
    if (q.search) { params.push(`%${q.search.toLowerCase()}%`); const n = params.length; where.push(`(lower(name) like $${n} or lower(email) like $${n} or lower(company) like $${n} or lower(message) like $${n})`) }
    const w = where.length ? `where ${where.join(' and ')}` : ''
    const total = Number((await db.query<{ c: string | number }>(`select count(*) as c from inquiries ${w}`, params)).rows[0].c)
    const rows = (await db.query(`select id, name, email, company, country, interest, quantity, message, status, created_at from inquiries ${w} order by created_at desc, id desc limit ${q.limit} offset ${(q.page - 1) * q.limit}`, params)).rows
    res.json({ items: rows.map((r: any) => ({ ...r, id: Number(r.id), created_at: new Date(r.created_at).toISOString() })), total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) })
  })
  api.patch('/inquiries/:id', authed, async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id)
    const { status } = z.object({ status: z.enum(STATUSES) }).parse(req.body)
    const r = await db.query('update inquiries set status = $1 where id = $2', [status, id])
    if (!r.rowCount) return res.status(404).json({ error: 'Inquiry not found' })
    res.json({ ok: true })
  })

  // ---------- planning engine (matrix mathematics) ----------
  const cached = async <T>(kind: string, body: unknown, rev: number, run: () => T | Promise<T>): Promise<T> => {
    const key = `${kind}:${rev}:${sha(body)}`
    const hit = computeCache.get(key) as T | undefined
    if (hit !== undefined) return hit
    const out = await run()
    computeCache.set(key, out)
    return out
  }
  const compute = (handler: (body: any, req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
    try { res.set('Cache-Control', 'no-store').json(await handler(req.body, req)) }
    catch (e) { if (e instanceof z.ZodError) throw e; res.status(422).json({ error: e instanceof Error ? e.message : 'Could not compute' }) }
  }
  api.post('/compute/mrp', authed, compute(async (raw) => {
    const body = MrpSchema.parse(raw)
    const { rev, data } = await getPlanning()
    return cached('mrp', body, rev, () => { const r = buildMrp(data, body.qty, body); return { input: r.input, result: r.result, rev } })
  }))
  api.post('/compute/suppliers', authed, compute(async (raw) => {
    const body = SuppliersSchema.parse(raw)
    const { rev, data } = await getPlanning()
    const criteria = DEFAULT_CRITERIA.map((c) => ({ ...c, weight: body.weights?.[c.key] ?? c.weight }))
    return cached('sup', body, rev, () => rankForCategory(data.suppliers, body.category, criteria))
  }))
  api.post('/compute/assignment', authed, compute(async (raw) => { const body = AssignSchema.parse(raw); return cached('asg', body, 0, () => assignLines(body)) }))
  api.post('/compute/size-matrix', authed, compute(async (raw) => {
    const body = SizeSchema.parse(raw)
    return cached('size', body, 0, () => sizeColorMatrix(body))
  }))

  }

  api.use((_req, res) => res.status(404).json({ error: 'Not found' }))
  app.use('/api', api)

  // ---------- SEO files ----------
  app.get('/robots.txt', (_req, res) => res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(robotsTxt(mode)))
  if (hasSite) app.get('/sitemap.xml', async (_req, res) => res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(sitemapXml(await getCatalog())))

  // ---------- static frontend ----------
  // Vercel serves dist/ statically, so the HTML shell is stored under another name to force '/' through this server
  const indexFile = existsSync(join(distDir, 'app-shell.html')) ? join(distDir, 'app-shell.html') : join(distDir, 'index.html')
  const hasDist = existsSync(indexFile)
  if (hasDist) {
    const template = readFileSync(indexFile, 'utf8')
    app.use(express.static(distDir, {
      index: false,
      setHeaders(res, file) {
        if (/[\\/]assets[\\/]/.test(file)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable') // fingerprinted by Vite
        else if (/\.(webp|avif|png|jpe?g|svg|ico|woff2?)$/.test(file)) res.setHeader('Cache-Control', 'public, max-age=2592000')
        else res.setHeader('Cache-Control', 'public, max-age=3600')
      },
    }))
    app.use(async (req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || /\.[a-z0-9]{2,5}$/i.test(req.path)) return next()
      const r = renderRoute(req.path, hasSite ? await getCatalog() : { products: [], countries: [] }, mode)
      res.status(r.status).type('html').set('Cache-Control', (hasErp && isErpPath(req.path)) || !r.meta.index ? 'no-cache' : 'public, max-age=60, stale-while-revalidate=300').send(applyTemplate(template, r))
    })
  } else {
    app.use((_req, res) => res.status(404).type('text').send('Frontend is not built yet. Run "npm run build" or use "npm run dev" and open the Vite URL.'))
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: err.issues.slice(0, 5).map((i) => ({ field: i.path.join('.'), message: i.message })) })
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' })
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large' })
    console.error('[error]', err)
    res.status(500).json({ error: 'Something went wrong on our side' })
  })

  return app
}
