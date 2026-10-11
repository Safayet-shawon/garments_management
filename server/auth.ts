import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { NextFunction, Request, Response } from 'express'
import { config } from './config.js'
import type { Db } from './db.js'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(pw, salt, 64)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltHex, keyHex] = stored.split('$')
  if (alg !== 'scrypt' || !saltHex || !keyHex) return false
  const key = await scrypt(pw, Buffer.from(saltHex, 'hex'), 64)
  const want = Buffer.from(keyHex, 'hex')
  return key.length === want.length && timingSafeEqual(key, want)
}

export interface Session { sub: string; name: string; role: string; exp: number }
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const sign = (data: string) => createHmac('sha256', config.authSecret).update(data).digest('base64url')

export function issueToken(user: { email: string; name: string; role: string }): string {
  const body = b64(JSON.stringify({ sub: user.email, name: user.name, role: user.role, exp: Math.floor(Date.now() / 1000) + config.tokenTtlHours * 3600 } satisfies Session))
  return `${body}.${sign(body)}`
}
export function readToken(token: string | undefined): Session | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const want = Buffer.from(sign(body))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session
    return s.exp > Date.now() / 1000 ? s : null
  } catch { return null }
}

declare module 'express-serve-static-core' { interface Request { session?: Session } }

export function requireAuth(role?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const h = req.headers.authorization
    const s = readToken(h?.startsWith('Bearer ') ? h.slice(7) : undefined)
    if (!s) return res.status(401).json({ error: 'Please sign in again' })
    if (role && s.role !== role) return res.status(403).json({ error: 'You do not have permission to do that' })
    req.session = s
    next()
  }
}

/** Creates the administrator on first start (credentials come from ADMIN_EMAIL / ADMIN_PASSWORD). */
export async function ensureAdmin(db: Db) {
  const r = await db.query('select id from users where email = $1', [config.adminEmail])
  if (r.rows.length) return
  await db.query('insert into users (email, name, role, password_hash) values ($1, $2, $3, $4)', [config.adminEmail, 'Safayet Shawon', 'admin', await hashPassword(config.adminPassword)])
}
