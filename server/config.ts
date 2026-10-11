import 'dotenv/config'

const env = process.env
export const isProd = env.NODE_ENV === 'production'

export const config = {
  isProd,
  port: Number(env.PORT ?? 8080),
  siteUrl: (env.SITE_URL ?? `http://localhost:${env.PORT ?? 8080}`).replace(/\/$/, ''),
  /** Supabase Postgres connection string (use the pooled "Transaction" URL on port 6543). Empty = in-memory demo database. */
  databaseUrl: env.DATABASE_URL ?? '',
  poolMax: Number(env.DB_POOL_MAX ?? 10),
  authSecret: env.AUTH_SECRET ?? (isProd ? '' : 'dev-only-secret-change-me'),
  adminEmail: (env.ADMIN_EMAIL ?? 'admin@winnerapparels.com').toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD ?? (isProd ? '' : 'Winner@2026'),
  tokenTtlHours: Number(env.TOKEN_TTL_HOURS ?? 12),
  distDir: env.DIST_DIR ?? 'dist',
  trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) : isProd ? 1 : 0,
  version: env.npm_package_version ?? '1.0.0',
}

export function assertProductionConfig() {
  if (!isProd) return
  const missing: string[] = []
  if (!config.authSecret || config.authSecret.length < 32) missing.push('AUTH_SECRET (min 32 chars)')
  if (!config.adminPassword || config.adminPassword.length < 10) missing.push('ADMIN_PASSWORD (min 10 chars)')
  if (missing.length) throw new Error(`Missing or weak production settings: ${missing.join(', ')}`)
}
