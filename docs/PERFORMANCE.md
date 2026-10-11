# Performance

Measured with Lighthouse (desktop preset) against the live site, https://winner-apparels.vercel.app:

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 99 | 100 | 100 | 100 | 0.7 s | 0 | 0 ms |
| `/collections` | 99 | 100 | 100 | 100 | 0.6 s | 0.001 | 0 ms |
| `/collections/classic-polo-shirt` | 100 | 100 | 100 | 100 | 0.6 s | 0.001 | 0 ms |
| `/contact` | 100 | 100 | 100 | 100 | 0.6 s | 0.001 | 10 ms |

Run it yourself: `npm run lighthouse -- https://your-site`. Mobile throttling was not measured.

## Checklist

| Request | What was done |
|---|---|
| Compress images | Photographs converted to WebP (products, About) and AVIF + WebP (hero) at 320/640 and 800/1600 px; the whole image set is about 600 KB (`scripts/process-photos.mjs`) |
| Lazy loading | Native `loading="lazy"` and `decoding="async"` on all below-the-fold images; the hero and first cards load eagerly with `fetchpriority="high"`; width and height set to avoid layout shift |
| Split the code into chunks | Every page is a `React.lazy` chunk; vendor chunks for React, router, charts and icons cache across releases. The public site never downloads the 430 KB charts chunk |
| Cache API responses | Browser: stale-while-revalidate cache for public GETs, ETag revalidation for `/api/bootstrap`. Server: cached bootstrap payload (pre-gzipped), catalogue and compute results keyed by data revision |
| Add a CDN | Immutable cache headers for fingerprinted assets, `public, max-age` for images; Vercel serves `static/` from its CDN; `CDN_URL` build variable for a separate asset origin; nginx edge cache in `deploy/nginx.conf` |
| Minify JS and CSS | Vite production build (minified JS and CSS, tree-shaken Tailwind, per-icon imports) |
| Index the database | B-tree indexes on every filter and sort column (`0001_init.sql`), trigram and JSONB GIN indexes (`0002_search_indexes.sql`) |
| Reduce re-renders | Data, actions and UI state are three separate React contexts; memoised table filtering and leaf components; toasts and modals no longer re-render pages |
| Debounce input handlers | Table search, global search, collections search and the Planning Lab inputs (200–300 ms) |
| Paginate large lists | Tables paginate client-side; the inquiries list paginates and searches in SQL (`limit`/`offset`) |
| Remove unused dependencies | `depcheck` reports none; removed the old illustration pipeline and artificial loading delays |
| Defer non-critical scripts | One module script (deferred by default); fonts are self-hosted; no third-party scripts |
| Loading skeletons | Suspense fallbacks, shimmer skeletons for the catalogue, product page and ERP pages |
| Load balancer | `docker-compose.yml` + `deploy/nginx.conf`: nginx `least_conn` across two replicas with passive health checks and rate limiting; Vercel load-balances serverless instances |
| Compress API payloads | `compression` middleware plus a pre-gzipped bootstrap document (157 KB of JSON become 20 KB on the wire); gzip in nginx |
| Connection pooling | `pg.Pool` (max 10, idle timeout 30 s) and the Supabase transaction pooler URL |
| Cache expensive computations | LRU cache with TTL for matrix results, single-flight for the bootstrap build |
| Server-side caching | Revision-keyed caches (a revision counter in the database invalidates every replica) |
| Lighthouse audit | `scripts/lighthouse.mjs`, results above, also run in CI |
