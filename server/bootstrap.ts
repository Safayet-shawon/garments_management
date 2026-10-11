import { buildSeed } from '../src/seedState.js'
import { ensureAdmin } from './auth.js'
import { config } from './config.js'
import { connect, migrate, type Db } from './db.js'
import { isSeeded, replaceAll } from './repo.js'

/** Connects, applies migrations, creates the admin and (on an empty database) loads the demo data set. */
export async function prepareDatabase(url = config.databaseUrl, opts: { seed?: boolean } = {}): Promise<Db> {
  const db = await connect(url)
  const applied = await migrate(db)
  if (applied.length) console.log(`[db] applied migrations: ${applied.join(', ')}`)
  await ensureAdmin(db)
  const wantSeed = opts.seed ?? (process.env.SEED_DEMO ?? 'true') !== 'false'
  if (wantSeed && !(await isSeeded(db.query))) {
    await replaceAll(db, buildSeed() as unknown as Record<string, any>)
    console.log('[db] empty database: loaded the Winner Apparels demo data set')
  }
  return db
}
