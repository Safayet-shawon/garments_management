// Compresses the real photographs in photos-src/ into responsive WebP/AVIF files for the website.
//   node scripts/process-photos.mjs
// photos-src/*.png are the original studio and factory photographs (kept out of the bundle).
// Outputs: public/img/products/<type>-<320|640>.webp, public/img/hero-<800|1600>.{avif,webp}, public/img/about-<480|960>.webp, public/og-image.jpg
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (n) => join(root, 'photos-src', `${n}.png`)
const out = (...p) => join(root, 'public', ...p)
const TYPES = ['tee', 'polo', 'hoodie', 'shirt', 'chino', 'sweatshirt']

await mkdir(out('img', 'products'), { recursive: true })
for (const t of TYPES) for (const w of [320, 640]) {
  await sharp(src(t)).resize(w, Math.round(w * 1.25), { fit: 'cover', position: 'centre' }).webp({ quality: 80, effort: 6 }).toFile(out('img', 'products', `${t}-${w}.webp`))
}
for (const w of [800, 1600]) {
  const h = Math.round((w * 9) / 16)
  await sharp(src('hero')).resize(w, h, { fit: 'cover', position: 'centre' }).avif({ quality: 50, effort: 5 }).toFile(out('img', `hero-${w}.avif`))
  await sharp(src('hero')).resize(w, h, { fit: 'cover', position: 'centre' }).webp({ quality: 74, effort: 6 }).toFile(out('img', `hero-${w}.webp`))
}
for (const w of [480, 960]) await sharp(src('about')).resize(w, Math.round((w * 2) / 3), { fit: 'cover' }).webp({ quality: 76, effort: 6 }).toFile(out('img', `about-${w}.webp`))

// social preview: the factory photo under a navy gradient with the brand name
const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b1432" stop-opacity=".94"/><stop offset=".62" stop-color="#0b1432" stop-opacity=".62"/><stop offset="1" stop-color="#0b1432" stop-opacity=".1"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/>
<text x="70" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="82" font-weight="700" fill="#fff" letter-spacing="6">WINNER APPARELS</text>
<text x="74" y="396" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="#e6bd4a" letter-spacing="2">Export-quality garments, made in Bangladesh</text></svg>`)
await sharp(src('hero')).resize(1200, 630, { fit: 'cover' }).composite([{ input: overlay }]).jpeg({ quality: 82, mozjpeg: true }).toFile(out('og-image.jpg'))
console.log('photos processed')
