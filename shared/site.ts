// Public website content, shared by the React pages and the server-side SEO injection so titles,
// descriptions, H1s and structured data can never drift apart.

export const SITE = {
  name: 'Winner Apparels',
  legalName: 'Winner Apparels Ltd.',
  tagline: 'Export-quality garments, made in Bangladesh',
  email: 'sales@winnerapparels.com',
  phone: '+880 1700-000000',
  founded: 2012,
  address: { street: 'Plot 21, BSCIC Industrial Estate', city: 'Gazipur', region: 'Dhaka Division', postalCode: '1700', country: 'BD' },
  social: ['https://www.linkedin.com/company/winner-apparels', 'https://www.facebook.com/winnerapparels'],
  stats: [
    { value: '126', label: 'Skilled team members' },
    { value: '5,000+', label: 'Pieces per line per day' },
    { value: '12', label: 'Export destinations' },
    { value: '98.4%', label: 'First-pass QC rate' },
  ],
} as const

export interface PageMeta { path: string; title: string; description: string; h1: string; keywords: string[]; index: boolean }

export const PAGES: Record<string, PageMeta> = {
  '/': {
    path: '/', index: true,
    title: 'Garment Manufacturer in Bangladesh | Winner Apparels',
    description: 'Winner Apparels is an export-oriented garment manufacturer in Gazipur, Bangladesh. T-shirts, polos, hoodies, denim shirts and chinos for global brands.',
    h1: 'Export-quality garments, made in Bangladesh',
    keywords: ['garment manufacturer Bangladesh', 'apparel factory Gazipur', 'OEM private label clothing', 'export garments'],
  },
  '/collections': {
    path: '/collections', index: true,
    title: 'Apparel Collections: Tees, Polos, Hoodies | Winner Apparels',
    description: 'Browse styles we manufacture: cotton T-shirts, polo shirts, hoodies, denim shirts, chino trousers and sweatshirts. Low MOQ and 35 to 60 day lead times.',
    h1: 'Apparel collections we manufacture',
    keywords: ['t-shirt manufacturer', 'polo shirt supplier', 'hoodie manufacturer Bangladesh', 'chino trousers factory'],
  },
  '/about': {
    path: '/about', index: true,
    title: 'About Winner Apparels | Export Garment Factory, Gazipur',
    description: 'Learn how Winner Apparels cuts, sews, finishes and inspects export garments in Gazipur with 126 trained staff, in-line quality control and on-time shipping.',
    h1: 'A garment factory built around on-time export delivery',
    keywords: ['garment factory Gazipur', 'RMG manufacturer', 'apparel quality control'],
  },
  '/contact': {
    path: '/contact', index: true,
    title: 'Request a Quote | Winner Apparels Garment Manufacturer',
    description: 'Send your tech pack or order idea to Winner Apparels. Tell us the style, quantity and destination country and our merchandisers reply within one business day.',
    h1: 'Request a quote from our merchandising team',
    keywords: ['garment quote Bangladesh', 'private label apparel inquiry', 'clothing manufacturer contact'],
  },
  '/login': {
    path: '/login', index: false,
    title: 'Sign in | Winner Apparels Business Management',
    description: 'Sign in to the Winner Apparels business management system.',
    h1: 'Sign in to Winner Apparels',
    keywords: [],
  },
}

export const FAQ = [
  { q: 'What is your minimum order quantity?', a: 'Most styles start at 500 pieces per colour. Basic tees and polos can start lower for repeat buyers.' },
  { q: 'How long does production take?', a: 'Typical lead time is 35 to 60 days from approved sample and confirmed trims, depending on the style and season.' },
  { q: 'Which countries do you ship to?', a: 'We export to the United States, Germany, the United Kingdom, France, Sweden, Spain, Canada, Japan and more, FOB Chattogram or Dhaka.' },
  { q: 'Do you offer private label and OEM production?', a: 'Yes. We manufacture to your tech pack with your labels, hang tags and packaging, and can develop patterns and samples in house.' },
  { q: 'How do you control quality?', a: 'Inline checks at cutting, sewing and finishing, then a final inspection against AQL 2.5 before packing, with a full defect report for every batch.' },
] as const

export const PROCESS = [
  { title: 'Merchandising & sampling', text: 'A dedicated merchandiser turns your tech pack into a costed, approved sample.' },
  { title: 'Fabric & trims', text: 'Fabric, thread, labels and packaging are booked against the order so nothing stalls the line.' },
  { title: 'Cut, sew, finish', text: 'Planned cutting, balanced sewing lines and a finishing hall for pressing, labelling and packing.' },
  { title: 'Quality control', text: 'Inline and final inspections with rejection tracking, then shipping documents and port booking.' },
] as const

export const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** category → garment type used for the product illustration */
export const GARMENT_TYPES = ['tee', 'polo', 'hoodie', 'shirt', 'chino', 'sweatshirt'] as const
export type GarmentType = (typeof GARMENT_TYPES)[number]
export const typeForCategory = (category: string): GarmentType => {
  const c = category.toLowerCase()
  if (c.includes('polo')) return 'polo'
  if (c.includes('hood')) return 'hoodie'
  if (c.includes('sweat')) return 'sweatshirt'
  if (c.includes('trouser') || c.includes('chino') || c.includes('pant')) return 'chino'
  if (c.includes('shirt') && !c.includes('t-shirt') && !c.includes('tee')) return 'shirt'
  return 'tee'
}
export const IMAGE_COLORS = ['black', 'white', 'navy', 'grey', 'green', 'blue', 'khaki', 'maroon', 'olive', 'indigo', 'red'] as const
export const imageFor = (type: GarmentType, color?: string, width: 320 | 640 = 640) => {
  const c = (color || '').toLowerCase()
  const col = (IMAGE_COLORS as readonly string[]).includes(c) ? c : 'navy'
  return `/img/garments/${type}-${col}-${width}.webp`
}
export const typeInfo: Record<GarmentType, { label: string; moq: number; leadTimeDays: number }> = {
  tee: { label: 'T-Shirts', moq: 500, leadTimeDays: 35 },
  polo: { label: 'Polo Shirts', moq: 600, leadTimeDays: 40 },
  hoodie: { label: 'Hoodies', moq: 500, leadTimeDays: 55 },
  shirt: { label: 'Woven & Denim Shirts', moq: 800, leadTimeDays: 50 },
  chino: { label: 'Chino Trousers', moq: 800, leadTimeDays: 55 },
  sweatshirt: { label: 'Sweatshirts', moq: 500, leadTimeDays: 50 },
}

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…')
export interface ProductMetaInput { name: string; category: string; colors: string[]; sizes: string[]; moq: number; leadTimeDays: number }
/** Title and description for a collection detail page (same text in the browser and in the server-rendered HTML). */
export const productMeta = (p: ProductMetaInput) => ({
  title: clip(`${p.name} Manufacturer | ${SITE.name}`, 60),
  description: clip(`${p.name} made to order in Bangladesh: ${p.colors.slice(0, 4).join(', ')} and more, sizes ${p.sizes[0] ?? 'S'} to ${p.sizes[p.sizes.length - 1] ?? 'XL'}. MOQ ${p.moq} pcs, ${p.leadTimeDays} day lead time.`, 158),
})
