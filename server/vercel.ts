import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { createApp } from './app.js'
import { prepareDatabase } from './bootstrap.js'
import { assertProductionConfig } from './config.js'

// Serverless entry: the Express app is built once per warm instance and reused for every request.
let ready: Promise<(req: IncomingMessage, res: ServerResponse) => void> | null = null
const boot = () => (ready ??= (async () => {
  assertProductionConfig()
  const db = await prepareDatabase()
  const app = await createApp({ db, distDir: resolve(process.cwd(), 'dist'), quiet: true })
  return app as unknown as (req: IncomingMessage, res: ServerResponse) => void
})().catch((e) => { ready = null; throw e }))

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try { (await boot())(req, res) }
  catch (e) {
    console.error('[vercel] startup failed', e)
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Service is starting up. Please retry in a moment.' }))
  }
}
