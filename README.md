# Daily Holidays website

Tour website and admin panel for Daily Holidays Sdn Bhd (Batu Caves, Selangor).

- **Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage) · Vercel
- **Region:** Supabase `ap-southeast-1` (Singapore), Vercel functions `sin1` (Singapore, set in `vercel.json`)

## What's where

| Path | What |
|---|---|
| `src/app/(site)` | Public website: home, `/tours` (filters), `/tours/[slug]` (itinerary + route map + dates + enquiry), `/about`, `/contact` |
| `src/app/admin` | Admin panel: dashboard, tours editor, AI PDF import, enquiries, destinations |
| `src/app/admin/actions.ts` | All admin server actions (every one checks `requireAdmin()`) |
| `src/lib/queries.ts` | Public read queries (anon key, cacheable) |
| `src/lib/extract.ts` | PDF → structured tour via OpenAI (`gpt-5.4-mini`) |
| `supabase/migrations` | Database schema; apply with `supabase db push` |
| `scripts/import` | One-off import of the old website + Google Drive PDFs |
| `scripts/create-admin.mjs` | Create an admin login |

## Local development

```bash
npm install
npm run dev          # http://localhost:3000, admin at /admin
```

`.env.local` (never commit). The web app needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`OPENAI_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`. Scripts and the Supabase CLI
additionally use `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`.

## Common tasks

```bash
# add a staff login (prints a generated password once)
node --env-file=.env.local scripts/create-admin.mjs staff@example.com

# homepage "Where to next?" map: country outlines (public/geo, from Natural Earth) and
# one AI-generated hero image per country via Kie.ai (needs KIE_API_KEY; GPT Image-2 at 1K, 6 credits each)
node scripts/build-geo.mjs
node --env-file=.env.local scripts/generate-country-images.mjs --only japan,thailand

# change the database: create a migration, edit it, push it, refresh the TS types
supabase migration new <name>
supabase db push
supabase gen types typescript --linked --schema public > src/lib/database.types.ts
```

## How content flows

1. Staff open **Admin → Tours → New tour** and upload the operator's itinerary PDF.
2. AI reads it into a **draft**: dates & fares, day-by-day plan, places, inclusions.
3. Staff check it, add photos, click **Locate places** (OpenStreetMap geocoding) so the route map works, then set **Published**.
4. Public pages refresh within seconds of saving (on-demand revalidation; 5-minute fallback).
5. Customer enquiries land in **Admin → Enquiries** with a one-click WhatsApp reply.

Security model: Row Level Security on every table. The public (anon key) can only read published
tours and insert enquiries. Admins are users listed in `public.admins`; the service-role key is only
used by the CLI scripts, never by the web app.

## Deploy (Vercel)

1. Import the repo in Vercel (framework: Next.js). `vercel.json` pins functions to `sin1`.
2. Add only the web-app env vars listed above (not the service-role key, access token or DB password).
   Set `NEXT_PUBLIC_SITE_URL` to the real domain.
3. In Supabase → Authentication → URL Configuration, set the Site URL to the same domain.
