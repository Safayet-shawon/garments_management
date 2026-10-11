import { GARMENT_TYPES, imageFor, slugify, typeForCategory, typeInfo } from '../shared/site.js'
import type { Db } from './db.js'

export interface PublicProduct {
  slug: string; name: string; category: string; type: string; description: string
  colors: string[]; sizes: string[]; variants: number; image: string; leadTimeDays: number; moq: number; updated: string
}
export interface PublicCatalog { products: PublicProduct[]; countries: { code: string; name: string }[] }

/** Public view of the catalogue: no prices, stock levels or buyer labels. */
export async function buildCatalog(db: Db): Promise<PublicCatalog> {
  const [p, c] = await Promise.all([
    db.query<{ data: any }>("select data from products where status = 'Active' order by name"),
    db.query<{ data: any }>('select data from countries order by name'),
  ])
  const products = p.rows.map(({ data: d }): PublicProduct => {
    const type = typeForCategory(String(d.category ?? ''))
    const colors = [...new Set<string>((d.variants ?? []).map((v: any) => v.combo?.Color).filter(Boolean))]
    const sizes = [...new Set<string>((d.variants ?? []).map((v: any) => v.combo?.Size).filter(Boolean))]
    return {
      slug: slugify(String(d.name)), name: String(d.name), category: String(d.category ?? ''), type, description: String(d.description ?? ''),
      colors, sizes, variants: (d.variants ?? []).length, image: imageFor(type, colors[0]), leadTimeDays: typeInfo[type].leadTimeDays, moq: typeInfo[type].moq, updated: String(d.updated ?? ''),
    }
  })
  return { products, countries: c.rows.map(({ data }) => ({ code: String(data.code), name: String(data.name) })) }
}
export { GARMENT_TYPES }
