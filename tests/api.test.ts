import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../server/app'
import { prepareDatabase } from '../server/bootstrap'
import { config } from '../server/config'
import type { Db } from '../server/db'
import type { Express } from 'express'
import { REGISTRY } from '../server/registry'
import { readFileSync } from 'node:fs'
import { COLLECTIONS } from '../shared/collections'

let db: Db
let app: Express
let token = ''
const auth = () => ({ Authorization: `Bearer ${token}` })

beforeAll(async () => {
  db = await prepareDatabase('', { seed: true })
  const dist = mkdtempSync(join(tmpdir(), 'wa-dist-'))
  writeFileSync(join(dist, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><title>x</title><!--SEO_HEAD--></head><body><div id="root"><!--SEO_BODY--></div></body></html>')
  app = await createApp({ db, distDir: dist, quiet: true })
  const r = await request(app).post('/api/auth/login').send({ email: config.adminEmail, password: config.adminPassword })
  token = r.body.token
}, 60000)
afterAll(async () => { await db.close() })

describe('schema', () => {
  it('migration file defines every registry table and column', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/0001_init.sql'), 'utf8').toLowerCase()
    for (const name of COLLECTIONS) {
      const { table, cols } = REGISTRY[name]
      const m = new RegExp(`create table if not exists ${table}\\s*\\(([^;]*)\\)`).exec(sql)
      expect(m, `table ${table}`).toBeTruthy()
      for (const c of cols) expect(m![1], `${table}.${c.name}`).toContain(c.name)
    }
  })
})

describe('auth', () => {
  it('reports health without credentials', async () => {
    const r = await request(app).get('/api/health')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ ok: true, db: 'memory' })
  })
  it('rejects wrong passwords and unauthenticated reads', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: config.adminEmail, password: 'nope' })).status).toBe(401)
    expect((await request(app).post('/api/auth/login').send({ email: 'bad', password: 'x' })).status).toBe(400)
    expect((await request(app).get('/api/bootstrap')).status).toBe(401)
    expect((await request(app).get('/api/bootstrap').set('Authorization', 'Bearer abc.def')).status).toBe(401)
  })
  it('returns the signed-in user', async () => {
    const r = await request(app).get('/api/auth/me').set(auth())
    expect(r.body.email).toBe(config.adminEmail)
  })
})

describe('bootstrap + sync', () => {
  it('serves the seeded data set with ETag revalidation and gzip', async () => {
    const r = await request(app).get('/api/bootstrap').set(auth())
    expect(r.status).toBe(200)
    expect(r.body.collections.products).toHaveLength(6)
    expect(r.body.collections.employees).toHaveLength(126)
    expect(r.body.collections.bom.find((b: any) => b.id === 'p1').lines).toHaveLength(6)
    expect(r.body.collections.countries.map((c: any) => c.code)).toContain('DE')
    expect(r.body.kv.payrollStage).toBe(2)
    const again = await request(app).get('/api/bootstrap').set(auth()).set('If-None-Match', r.headers.etag)
    expect(again.status).toBe(304)
    const gz = await request(app).get('/api/bootstrap').set(auth()).set('Accept-Encoding', 'gzip')
    expect(gz.headers['content-encoding']).toBe('gzip')
    expect(gz.body.collections.products).toHaveLength(6)
  })

  it('persists upserts, removals, ordering and settings, then bumps the revision', async () => {
    const before = (await request(app).get('/api/bootstrap').set(auth())).body
    const newBuyer = { id: 'B-900', name: 'Test Buyer AB', type: 'Brand', country: 'SE', contact: 'A', email: 'a@b.se', merchandiser: 'EMP-001', term: 'TT 30 days', status: 'Active' }
    const ids = ['B-900', ...before.collections.buyers.map((b: any) => b.id).filter((id: string) => id !== 'B-008')]
    const r = await request(app).post('/api/sync').set(auth()).send({
      changes: { buyers: { upsert: [newBuyer], remove: ['B-008'] }, countries: { upsert: [{ code: 'DK', name: 'Denmark', region: 'Europe', currency: 'DKK', port: 'Aarhus' }], remove: [] } },
      order: { buyers: ids }, kv: { salesAdj: 1234 },
    })
    expect(r.status).toBe(200)
    expect(r.body.rev).toBeGreaterThan(before.rev)
    const after = (await request(app).get('/api/bootstrap').set(auth())).body
    expect(after.collections.buyers.map((b: any) => b.id)).toEqual(ids)
    expect(after.collections.buyers.some((b: any) => b.id === 'B-008')).toBe(false)
    expect(after.collections.countries.some((c: any) => c.code === 'DK')).toBe(true)
    expect(after.kv.salesAdj).toBe(1234)
    // the indexed column was filled from the document
    const row = await db.query('select country from buyers where id = $1', ['B-900'])
    expect(row.rows[0].country).toBe('SE')
  })

  it('validates payloads', async () => {
    expect((await request(app).post('/api/sync').set(auth()).send({ changes: { hacked: { upsert: [], remove: [] } }, kv: {} })).status).toBe(400)
    expect((await request(app).post('/api/sync').set(auth()).send({ changes: { buyers: { upsert: [{ name: 'no id' }], remove: [] } }, kv: {} })).status).toBe(400)
    expect((await request(app).post('/api/sync').set(auth()).send({ changes: {}, kv: { nope: 1 } })).status).toBe(400)
    expect((await request(app).post('/api/sync').set(auth()).send('{bad json').set('Content-Type', 'application/json')).status).toBe(400)
  })

  it('resets to the demo data set', async () => {
    const r = await request(app).post('/api/admin/reset').set(auth())
    expect(r.status).toBe(200)
    const b = (await request(app).get('/api/bootstrap').set(auth())).body
    expect(b.collections.buyers).toHaveLength(8)
    expect(b.kv.salesAdj).toBe(0)
  })
})

describe('public website API', () => {
  it('exposes a price-free catalogue with images and caching headers', async () => {
    const r = await request(app).get('/api/public/catalog')
    expect(r.status).toBe(200)
    expect(r.headers['cache-control']).toContain('max-age=300')
    expect(r.body.products.length).toBeGreaterThanOrEqual(6)
    const tee = r.body.products.find((p: any) => p.slug === 'premium-cotton-t-shirt')
    expect(tee.image).toMatch(/\/img\/products\/tee-/)
    expect(JSON.stringify(r.body)).not.toMatch(/purchase|selling|stock/)
    const again = await request(app).get('/api/public/catalog').set('If-None-Match', r.headers.etag)
    expect(again.status).toBe(304)
  })

  it('stores a valid inquiry, ignores bots, and rejects bad input', async () => {
    const good = { name: 'Anna Berg', email: 'ANNA@Berg.se', company: 'Berg AB', country: 'Sweden', interest: 'Premium Cotton T-Shirt', quantity: 3000, message: 'We need 3000 organic tees for spring.' }
    const r = await request(app).post('/api/public/inquiries').send(good)
    expect(r.status).toBe(201)
    expect(r.body.id).toBeGreaterThan(0)
    expect((await request(app).post('/api/public/inquiries').send({ ...good, website: 'http://spam' })).body.id).toBe(0)
    const bad = await request(app).post('/api/public/inquiries').send({ ...good, email: 'nope', message: 'hi' })
    expect(bad.status).toBe(400)
    expect(bad.body.details.map((d: any) => d.field)).toEqual(expect.arrayContaining(['email', 'message']))
    const stored = await db.query('select email from inquiries where company = $1', ['Berg AB'])
    expect(stored.rows).toHaveLength(1)
    expect(stored.rows[0].email).toBe('anna@berg.se')
  })

  it('lists inquiries with search, status filter, pagination and status updates (admin only)', async () => {
    for (let i = 0; i < 17; i++) await request(app).post('/api/public/inquiries').send({ name: `Buyer ${i}`, email: `b${i}@x.com`, company: i % 2 ? 'Odd Retail' : 'Even Retail', message: `Inquiry number ${i} about hoodies` })
    expect((await request(app).get('/api/inquiries')).status).toBe(401)
    const p1 = await request(app).get('/api/inquiries?limit=10&page=1').set(auth())
    expect(p1.body.total).toBeGreaterThanOrEqual(18)
    expect(p1.body.items).toHaveLength(10)
    const p2 = await request(app).get('/api/inquiries?limit=10&page=2').set(auth())
    expect(p2.body.items[0].id).not.toBe(p1.body.items[0].id)
    const odd = await request(app).get('/api/inquiries?search=odd%20retail').set(auth())
    expect(odd.body.total).toBe(8)
    const id = p1.body.items[0].id
    expect((await request(app).patch(`/api/inquiries/${id}`).set(auth()).send({ status: 'quoted' })).status).toBe(200)
    expect((await request(app).get('/api/inquiries?status=quoted').set(auth())).body.total).toBe(1)
    expect((await request(app).patch(`/api/inquiries/${id}`).set(auth()).send({ status: 'weird' })).status).toBe(400)
    expect((await request(app).patch('/api/inquiries/99999').set(auth()).send({ status: 'won' })).status).toBe(404)
  })
})

describe('planning API', () => {
  it('runs MRP from the database and reproduces the PP-2026-001 shortage', async () => {
    const r = await request(app).post('/api/compute/mrp').set(auth()).send({ qty: { p1: 5000 }, includeOnOrder: false, withWaste: false })
    expect(r.status).toBe(200)
    const rows = r.body.result.rows
    const cotton = rows.find((x: any) => x.name === 'Cotton Fabric')
    expect(cotton).toMatchObject({ required: 6000, shortage: 1200, status: 'Short' })
    expect(rows.find((x: any) => x.name === 'Neck Label')).toMatchObject({ required: 5000, shortage: 500 })
    expect(rows.find((x: any) => x.name === 'Black Thread').status).toBe('Ready')
    const cached = await request(app).post('/api/compute/mrp').set(auth()).send({ qty: { p1: 5000 }, includeOnOrder: false, withWaste: false })
    expect(cached.body).toEqual(r.body)
  })
  it('ranks suppliers and rejects categories without enough suppliers', async () => {
    const r = await request(app).post('/api/compute/suppliers').set(auth()).send({ category: 'Fabric' })
    expect(r.status).toBe(200)
    expect(r.body.result.ranking.map((x: any) => x.rank)).toEqual([1, 2, 3])
    expect((await request(app).post('/api/compute/suppliers').set(auth()).send({ category: 'Nope' })).status).toBe(400)
  })
  it('assigns lines and builds size matrices', async () => {
    const a = await request(app).post('/api/compute/assignment').set(auth()).send({
      lines: [{ id: 'A', name: 'A', operators: 40, efficiency: 0.8, hoursPerDay: 9, specialty: ['tee'] }, { id: 'B', name: 'B', operators: 40, efficiency: 0.8, hoursPerDay: 9, specialty: ['polo'] }],
      jobs: [{ id: 'J1', label: 'Polos', qty: 2000, sam: 11, category: 'polo', dueInDays: 15 }, { id: 'J2', label: 'Tees', qty: 3000, sam: 7.5, category: 'tee', dueInDays: 15 }],
    })
    expect(a.body.assignment).toEqual([1, 0])
    const s = await request(app).post('/api/compute/size-matrix').set(auth()).send({ total: 1000, sizes: ['S', 'M'], ratio: [1, 1], colors: ['Black', 'White'], colorShare: [50, 50], consumptionKg: [1, 1.2], piecesPerCarton: 50, cuttingAllowancePct: 2 })
    expect(s.body.matrix).toEqual([[250, 250], [250, 250]])
    expect(s.body.cartonsTotal).toBe(20)
    expect((await request(app).post('/api/compute/size-matrix').set(auth()).send({ total: -1 })).status).toBe(400)
    expect((await request(app).post('/api/compute/mrp').send({ qty: {} })).status).toBe(401)
  })
})

describe('SEO surface', () => {
  it('serves robots.txt and a sitemap listing every public page and product', async () => {
    const robots = await request(app).get('/robots.txt')
    expect(robots.text).toContain('Sitemap:')
    expect(robots.text).toContain('Disallow: /api/')
    expect(robots.text).toContain('Disallow: /dashboard')
    const map = await request(app).get('/sitemap.xml')
    expect(map.headers['content-type']).toContain('xml')
    expect(map.text).toContain('/collections/premium-cotton-t-shirt')
    expect(map.text).toContain('<loc>' + config.siteUrl + '/</loc>')
    expect(map.text).not.toContain('/dashboard')
  })
  it('injects title, canonical, robots, JSON-LD and an H1 into the HTML shell', async () => {
    const home = await request(app).get('/')
    expect(home.status).toBe(200)
    expect(home.text).toMatch(/<title>Garment Manufacturer in Bangladesh \| Winner Apparels<\/title>/)
    expect(home.text).toContain(`<link rel="canonical" href="${config.siteUrl}/"`)
    expect(home.text).toContain('application/ld+json')
    expect(home.text).toContain('"@type":"FAQPage"')
    expect((home.text.match(/<h1>/g) || []).length).toBe(1)
    const prod = await request(app).get('/collections/premium-cotton-t-shirt')
    expect(prod.text).toContain('"@type":"Product"')
    expect(prod.text).toContain('BreadcrumbList')
    const erp = await request(app).get('/dashboard')
    expect(erp.text).toContain('noindex')
    const missing = await request(app).get('/collections/does-not-exist')
    expect(missing.status).toBe(404)
    expect((await request(app).get('/nope/never')).status).toBe(404)
  })
})
