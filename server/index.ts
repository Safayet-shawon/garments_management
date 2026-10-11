import { createApp } from './app.js'
import { prepareDatabase } from './bootstrap.js'
import { assertProductionConfig, config } from './config.js'

async function main() {
  assertProductionConfig()
  const db = await prepareDatabase()
  const app = await createApp({ db })
  const server = app.listen(config.port, () => {
    console.log(`[api] Winner Apparels ${config.version} on http://localhost:${config.port} (${db.kind === 'postgres' ? 'Supabase/Postgres' : 'in-memory demo database'}${config.isProd ? ', production' : ''})`)
    if (db.kind === 'memory') console.log(`[api] demo login: ${config.adminEmail} / ${config.adminPassword}`)
  })
  server.keepAliveTimeout = 65_000 // longer than typical load-balancer idle timeouts
  server.headersTimeout = 66_000
  const stop = (sig: string) => {
    console.log(`[api] ${sig} received, shutting down`)
    server.close(async () => { await db.close().catch(() => undefined); process.exit(0) })
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('SIGINT', () => stop('SIGINT'))
}
main().catch((e) => { console.error('[api] failed to start:', e instanceof Error ? e.message : e); process.exit(1) })
