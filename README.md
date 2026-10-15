# Winner Apparels

Public website and business management system for an export garment manufacturer in Bangladesh.

- **Website** (`/`, `/collections`, `/about`, `/contact`): server-rendered SEO metadata, real photographs, quote request form.
- **Business app** (`/dashboard` and the rest, after sign-in): products and variants, inventory, manufacturing (cutting, sewing, finishing, QC), procurement, HR and payroll, merchandising (buyers, countries, buyer orders, shipments), reports and the **Planning Lab** (matrix mathematics).
- **API**: Express, Postgres (Supabase), cached and compressed.

Live demos (demo database, sign-in is pre-filled):

| | URL | What it is |
|---|---|---|
| Website | https://winner-apparels-site.vercel.app | public landing website only |
| Business app | https://winner-apparels-erp.vercel.app | ERP panel only (sign-in, noindex) |
| Combined | https://winner-apparels.vercel.app | both in one project |

## Quick start

```bash
npm install
npm run dev          # API on :8080 and Vite on :5173 (open http://localhost:5173)
npm test             # 26 tests: matrix maths, SQL, API, SEO
```

With no `DATABASE_URL` the API runs on an in-memory PostgreSQL (pg-mem) seeded with demo data, so everything works offline. Demo sign-in: `admin@winnerapparels.com` / `Winner@2026`.

## Use Supabase

1. Create a project at supabase.com.
2. Copy **Project Settings → Database → Connection string → Transaction pooler** (port 6543) into `DATABASE_URL`.
3. Start the server. It applies `supabase/migrations/*.sql` (tables, indexes, trigram search indexes, row level security) and loads the demo data into an empty database. Or run `npm run db:migrate && npm run db:seed` yourself.
4. Set `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SITE_URL` (see `.env.example`). Set `SEED_DEMO=false` for a clean production database.

How the app talks to the database: the browser keeps working state in memory, loads it once from `GET /api/bootstrap` (ETag + gzip, cached on the server) and writes only the changed documents back with `POST /api/sync` (debounced, one request at a time, transactional). Each collection is a Postgres table with indexed columns plus the full document as `jsonb`.

## Deploy

**Vercel** (what the live demo uses):

```bash
npx vercel link
npx vercel env add AUTH_SECRET production      # also ADMIN_EMAIL, ADMIN_PASSWORD, SITE_URL, NODE_ENV, DATABASE_URL
node scripts/vercel-build.mjs                  # writes .vercel/output (static CDN files + one serverless function)
npx vercel deploy --prebuilt --prod
```

Split deployments use the same code with `APP_MODE`:

```bash
# business app
APP_MODE=erp WEBSITE_URL=https://your-site.example node scripts/vercel-build.mjs   # env on the project: APP_MODE=erp
# website
APP_MODE=site ERP_URL=https://your-erp.example node scripts/vercel-build.mjs       # env on the project: APP_MODE=site
```

The build leaves the other half out of the bundle, and the API only exposes that half's endpoints. Point both at the same `DATABASE_URL` so quote requests from the website show up in the business app.

`vercel.json` also lets Vercel build it from Git. Without `DATABASE_URL` the function uses the in-memory demo database, which resets whenever a serverless instance restarts. Add the Supabase URL for permanent data.

**Docker** (VPS, Fly, Render, Railway…):

```bash
cp .env.example .env     # fill in
docker build -t winner-apparels . && docker run --env-file .env -p 8080:8080 winner-apparels
docker compose up --build   # nginx load balancer in front of two replicas, with an edge cache
```

## Planning Lab (matrix mathematics)

| Tool | Method |
|---|---|
| Material requirements | `r = qᵀ·B·diag(1+waste)`, shortage = `max(0, r − stock − on order)`, purchase cost, one-click purchase requirements |
| Line assignment | days matrix from SAM, operators and efficiency, cost = days + lateness penalty, solved with the Hungarian algorithm (checked against brute force in tests) |
| Supplier scoring | weighted TOPSIS decision matrix with live weight sliders |
| Size × colour matrix | exact apportionment (largest remainder), cut plan with allowance, fabric need, cartons, CSV export |

Code: `shared/matrix.ts`, `shared/planning.ts`, `shared/scenario.ts`. The server runs them (`/api/compute/*`, results cached); the browser falls back to the same code when offline.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | API + Vite with hot reload |
| `npm run build` | Type-check, build the web app, bundle the server |
| `npm start` | Run the production server |
| `npm test` | Vitest suite |
| `npm run seo:audit` | Technical SEO audit of a running site (`docs/SEO-AUDIT.md`) |
| `npm run lighthouse` | Lighthouse on four key pages with minimum scores |
| `npm run images` / `node scripts/process-photos.mjs` | Icons and manifest / compress the photographs in `photos-src/` |

## Documentation

- [docs/PERFORMANCE.md](docs/PERFORMANCE.md): every optimisation and its measured result
- [docs/SEO-AUDIT.md](docs/SEO-AUDIT.md): latest SEO audit
