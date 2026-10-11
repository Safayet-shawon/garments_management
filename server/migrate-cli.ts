import { connect, migrate } from './db.js'
import { config } from './config.js'

const db = await connect()
if (db.kind === 'memory') console.warn('DATABASE_URL is not set: migrating a throw-away in-memory database.')
const applied = await migrate(db)
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date.')
await db.close()
void config
