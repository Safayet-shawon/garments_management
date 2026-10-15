import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import { createApp } from '../server/app'
import { prepareDatabase } from '../server/bootstrap'
import { config } from '../server/config'
import type { Db } from '../server/db'

let db: Db
let site: Express
let erp: Express

beforeAll(async () => {
  db = await prepareDatabase('', { seed: true })
  const dist = mkdtempSync(join(tmpdir(), 'wa-modes-'))
  writeFileSync(join(dist, 'index.html'), '<!doctype html><html><head><title>x</title><!--SEO_HEAD--></head><body><div id="root"><!--SEO_BODY--></div></body></html>')
  site = await createApp({ db, distDir: dist, quiet: true, mode: 'site' })
  erp = await createApp({ db, distDir: dist, quiet: true, mode: 'erp' })
}, 60000)
afterAll(async () => { await db.close() })

describe('website-only deployment', () => {
  it('serves the catalogue, inquiries, sitemap and pages', async () => {
    expect((await request(site).get('/api/public/catalog')).status).toBe(200)
    expect((await request(site).get('/sitemap.xml')).status).toBe(200)
    const home = await request(site).get('/')
    expect(home.status).toBe(200)
    expect(home.text).toContain('Garment Manufacturer in Bangladesh')
    expect((await request(site).get('/api/health')).body).toMatchObject({ mode: 'site', demo: false })
  })
  it('has no business app: no sign-in, data sync or app pages', async () => {
    for (const path of ['/api/bootstrap', '/api/auth/login', '/api/sync', '/api/inquiries', '/api/compute/mrp']) expect([404, 405].includes((await request(site).get(path)).status), path).toBe(true)
    expect((await request(site).post('/api/auth/login').send({ email: config.adminEmail, password: config.adminPassword })).status).toBe(404)
    expect((await request(site).get('/dashboard')).status).toBe(404)
    expect((await request(site).get('/login')).status).toBe(404)
    expect((await request(site).get('/robots.txt')).text).not.toContain('Disallow: /dashboard')
  })
})

describe('business-app-only deployment', () => {
  it('signs in and syncs, but is not indexable', async () => {
    const login = await request(erp).post('/api/auth/login').send({ email: config.adminEmail, password: config.adminPassword })
    expect(login.status).toBe(200)
    expect((await request(erp).get('/api/bootstrap').set('Authorization', `Bearer ${login.body.token}`)).status).toBe(200)
    expect((await request(erp).get('/api/health')).body).toMatchObject({ mode: 'erp', demo: true })
    expect((await request(erp).get('/robots.txt')).text).toContain('Disallow: /')
    const page = await request(erp).get('/')
    expect(page.status).toBe(200)
    expect(page.text).toContain('noindex')
    expect(page.text).not.toContain('FAQPage')
  })
  it('has no public website API', async () => {
    expect((await request(erp).get('/api/public/catalog')).status).toBe(404)
    expect((await request(erp).post('/api/public/inquiries').send({})).status).toBe(404)
    expect((await request(erp).get('/sitemap.xml')).status).toBe(404)
  })
})
