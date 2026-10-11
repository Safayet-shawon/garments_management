import { buildSeed } from '../src/seedState.js'
import { ensureAdmin } from './auth.js'
import { connect, migrate } from './db.js'
import { replaceAll } from './repo.js'

const db = await connect()
await migrate(db)
await ensureAdmin(db)
await replaceAll(db, buildSeed() as unknown as Record<string, any>)
console.log('Seeded the Winner Apparels demo data set.')
await db.close()
