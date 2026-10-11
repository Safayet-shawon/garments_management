// Builds the site into Vercel's Build Output API format (.vercel/output):
//   static/            the Vite build (hashed assets, images, icons), served by Vercel's CDN
//   functions/api.func the Express server bundled into one file; handles /api/*, sitemap, robots and every HTML page
//                      (so each URL gets its own title, canonical and structured data)
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { build } from 'esbuild'

const run = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' }); if (r.status !== 0) process.exit(r.status ?? 1) }
rmSync('.vercel/output', { recursive: true, force: true })
run('npx', ['vite', 'build'])

const out = '.vercel/output'
const fn = `${out}/functions/api.func`
mkdirSync(`${fn}/dist`, { recursive: true })
cpSync('dist', `${out}/static`, { recursive: true })
renameSync(`${out}/static/index.html`, `${fn}/dist/app-shell.html`) // keep '/' out of the static layer
cpSync('supabase/migrations', `${fn}/supabase/migrations`, { recursive: true })

await build({
  entryPoints: ['server/vercel.ts'], outfile: `${fn}/index.js`, bundle: true, platform: 'node', format: 'esm', target: 'node22', minify: true,
  external: ['pg-native'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
})
writeFileSync(`${fn}/package.json`, JSON.stringify({ type: 'module' }))
writeFileSync(`${fn}/.vc-config.json`, JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 30, memory: 1024 }, null, 2))

writeFileSync(`${out}/config.json`, JSON.stringify({
  version: 3,
  routes: [
    { src: '/assets/(.*)', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '/img/(.*)', headers: { 'cache-control': 'public, max-age=2592000' }, continue: true },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/api' },
  ],
}, null, 2))
console.log(existsSync(`${fn}/index.js`) ? 'Vercel output ready in .vercel/output' : 'build failed')
