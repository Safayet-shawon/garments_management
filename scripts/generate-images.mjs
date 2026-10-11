// Generates the brand icons and web manifest from the vector logo (photographs are handled by process-photos.mjs).
//   node scripts/generate-images.mjs
// Outputs: public/img/garments/<type>-<colour>-<320|640>.webp, public/img/hero-*.{avif,webp}, og-image.jpg, app icons.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const COLORS = { black: '#252833', white: '#f1f2f5', navy: '#22336b', grey: '#8d95a3', green: '#2f7d54', blue: '#3a6fcf', khaki: '#bba87f', maroon: '#7d2a3b', olive: '#6e7838', indigo: '#33407f', red: '#c4372d' }
const TYPES = ['tee', 'polo', 'hoodie', 'shirt', 'chino', 'sweatshirt']

const mix = (hex, amt) => { // amt<0 darken, >0 lighten
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))))
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(ch).map((v) => v.toString(16).padStart(2, '0')).join('')
}
const isLight = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 170 }

function garment(type, base) {
  const dark = mix(base, -0.22), darker = mix(base, -0.38), light = mix(base, 0.18)
  const stitch = isLight(base) ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.45)'
  const rib = mix(base, isLight(base) ? -0.12 : 0.1)
  const shapes = {
    tee: `<path id="body" d="M128 62 L88 72 L36 124 L70 172 L108 150 L108 424 L292 424 L292 150 L330 172 L364 124 L312 72 L272 62 Q200 112 128 62 Z"/>`,
    polo: `<path id="body" d="M128 62 L88 72 L36 124 L70 172 L108 150 L108 424 L292 424 L292 150 L330 172 L364 124 L312 72 L272 62 Q200 100 128 62 Z"/>`,
    hoodie: `<path id="body" d="M126 84 L66 120 L38 330 L84 338 L108 214 L108 436 L292 436 L292 214 L316 338 L362 330 L334 120 L274 84 Q200 118 126 84 Z"/>`,
    sweatshirt: `<path id="body" d="M128 66 L84 80 L34 130 L52 340 L98 346 L108 200 L108 432 L292 432 L292 200 L302 346 L348 340 L366 130 L316 80 L272 66 Q200 108 128 66 Z"/>`,
    shirt: `<path id="body" d="M132 70 L84 84 L34 134 L52 350 L98 356 L108 210 L108 432 L292 432 L292 210 L302 356 L348 350 L366 134 L316 84 L268 70 L200 96 Z"/>`,
    chino: `<path id="body" d="M112 44 L288 44 L300 104 L316 444 L214 444 L200 168 L186 444 L84 444 L100 104 Z"/>`,
  }
  const details = {
    tee: `<path d="M128 62 Q200 112 272 62 L264 52 Q200 94 136 52 Z" fill="${rib}"/>
          <path d="M108 410 H292 M70 160 L108 138 M330 160 L292 138" stroke="${stitch}" stroke-width="2" stroke-dasharray="5 4" fill="none"/>`,
    polo: `<path d="M128 62 L170 78 L196 118 L158 124 Z M272 62 L230 78 L204 118 L242 124 Z" fill="${light}" stroke="${dark}" stroke-width="1.5"/>
           <rect x="193" y="104" width="14" height="96" rx="3" fill="${dark}" fill-opacity=".35"/>
           <circle cx="200" cy="124" r="3.4" fill="${darker}"/><circle cx="200" cy="150" r="3.4" fill="${darker}"/><circle cx="200" cy="176" r="3.4" fill="${darker}"/>
           <path d="M108 410 H292 M70 160 L108 138 M330 160 L292 138" stroke="${stitch}" stroke-width="2" stroke-dasharray="5 4" fill="none"/>`,
    hoodie: `<path d="M126 84 Q112 20 200 18 Q288 20 274 84 Q256 128 200 134 Q144 128 126 84 Z" fill="${dark}" stroke="${darker}" stroke-width="1.5"/>
             <path d="M150 90 Q200 128 250 90 Q240 60 200 56 Q160 60 150 90 Z" fill="${darker}" fill-opacity=".55"/>
             <path d="M180 124 V184 M220 124 V184" stroke="${isLight(base) ? '#555' : '#f1f2f5'}" stroke-width="4" stroke-linecap="round"/>
             <path d="M132 318 H268 L292 410 H108 Z" fill="${dark}" fill-opacity=".3" stroke="${stitch}" stroke-width="2" stroke-dasharray="5 4"/>
             <rect x="108" y="412" width="184" height="24" fill="${rib}"/><rect x="38" y="316" width="46" height="22" fill="${rib}" transform="rotate(8 61 327)"/><rect x="316" y="316" width="46" height="22" fill="${rib}" transform="rotate(-8 339 327)"/>`,
    sweatshirt: `<path d="M128 66 Q200 108 272 66 L264 54 Q200 92 136 54 Z" fill="${rib}"/>
             <path d="M170 70 L200 118 L230 70" fill="none" stroke="${stitch}" stroke-width="2.5"/>
             <rect x="108" y="408" width="184" height="24" fill="${rib}"/><rect x="50" y="326" width="48" height="22" fill="${rib}" transform="rotate(8 74 337)"/><rect x="302" y="326" width="48" height="22" fill="${rib}" transform="rotate(-8 326 337)"/>`,
    shirt: `<path d="M132 70 L168 62 L200 98 L232 62 L268 70 L236 112 L200 100 L164 112 Z" fill="${light}" stroke="${dark}" stroke-width="1.5"/>
            <path d="M200 98 V430" stroke="${dark}" stroke-width="2"/>
            ${[130, 170, 210, 250, 290, 330, 370, 410].map((y) => `<circle cx="206" cy="${y}" r="3" fill="${darker}"/>`).join('')}
            <rect x="124" y="160" width="52" height="56" rx="3" fill="none" stroke="${stitch}" stroke-width="2" stroke-dasharray="5 4"/><rect x="224" y="160" width="52" height="56" rx="3" fill="none" stroke="${stitch}" stroke-width="2" stroke-dasharray="5 4"/>
            <path d="M52 340 L98 346 M348 340 L302 346" stroke="${darker}" stroke-width="6"/><path d="M108 420 H292" stroke="${stitch}" stroke-width="2" stroke-dasharray="5 4"/>`,
    chino: `<rect x="112" y="44" width="176" height="22" fill="${dark}" fill-opacity=".45"/>
            ${[128, 168, 200, 232, 272].map((x) => `<rect x="${x - 3}" y="40" width="6" height="30" fill="${darker}" fill-opacity=".5"/>`).join('')}
            <path d="M200 66 V170 M200 100 Q216 100 220 122" stroke="${stitch}" stroke-width="2" stroke-dasharray="5 4" fill="none"/>
            <path d="M114 78 Q150 100 160 140 M286 78 Q250 100 240 140" stroke="${stitch}" stroke-width="2" fill="none"/>
            <circle cx="200" cy="56" r="5" fill="${darker}"/>
            <path d="M88 424 H186 M214 424 H312" stroke="${stitch}" stroke-width="2" stroke-dasharray="5 4"/>`,
  }
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
    <defs>
      <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4e7ee"/></radialGradient>
      <linearGradient id="vol" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
      <pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0L4 4M4 0L0 4" stroke="#000" stroke-opacity=".07" stroke-width=".8"/></pattern>
      <filter id="sh" x="-20%" y="-10%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
      <clipPath id="clip">${shapes[type].replace(' id="body"', '')}</clipPath>
    </defs>
    <rect width="400" height="480" fill="url(#bg)"/>
    <ellipse cx="200" cy="452" rx="130" ry="13" fill="#1b2442" opacity=".22" filter="url(#sh)"/>
    ${shapes[type].replace('id="body"', `fill="${base}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"`)}
    <g clip-path="url(#clip)"><rect width="400" height="480" fill="url(#vol)"/><rect width="400" height="480" fill="url(#weave)"/></g>
    ${details[type]}
  </svg>`
}

async function webp(svg, width, file, quality = 78) {
  await sharp(Buffer.from(svg)).resize({ width }).webp({ quality, effort: 5 }).toFile(file)
}

async function main() {
  // ---- logo mark + icons + OG image
  const mark = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d779"/><stop offset=".55" stop-color="#d9a62e"/><stop offset="1" stop-color="#b8801a"/></linearGradient><linearGradient id="n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f3a8a"/><stop offset="1" stop-color="#0b1432"/></linearGradient></defs><path d="M32 2L58 17V47L32 62L6 47V17Z" fill="url(#n)" stroke="url(#g)" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 21L23 45L32 29L41 45L50 21" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 52H48" stroke="#f3e3b0" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="3.2 3.2"/><path d="M32 9L33.6 13.4L38 15L33.6 16.6L32 21L30.4 16.6L26 15L30.4 13.4Z" fill="url(#g)"/></svg>`
  const icon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0b1432"/><g transform="translate(${size * 0.15} ${size * 0.15}) scale(${(size * 0.7) / 64})">${mark(64).replace(/<svg[^>]*>/, '').replace('</svg>', '')}</g></svg>`
  for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) await sharp(Buffer.from(icon(size))).png({ compressionLevel: 9 }).toFile(join(root, name))
  await writeFile(join(root, 'manifest.webmanifest'), JSON.stringify({
    name: 'Winner Apparels', short_name: 'Winner', description: 'Export garment manufacturer and business management system', start_url: '/', display: 'standalone', background_color: '#0b1432', theme_color: '#0b1432',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
  }, null, 2))
  console.log('icons and manifest written')
}
main().catch((e) => { console.error(e); process.exit(1) })
