# Project Context Prompt

You are helping build a **print-on-demand e-commerce platform** where customers upload an image from their website and receive it printed on physical products (t-shirts, mugs, posters, etc.), fulfilled and shipped directly by Printful.

---

## Business Model

- Customer visits the app, uploads an image (screenshot or asset from their website)
- Selects a product from the catalog (t-shirt, mug, poster, etc.)
- A mockup is generated showing their image on the product
- Order is placed and fulfilled automatically by Printful
- Printful produces and ships directly to the end customer (dropshipping, white-label)
- Storefront and checkout are handled by **Nuvemshop** (Phase 1)
- This Next.js app handles: image upload, catalog browsing, mockup preview, and order handoff to Printful API

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Runtime / Toolchain | Bun (package manager + task runner; Bun runtime on Vercel in prod) |
| UI | React 18+ with TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (user image uploads) |
| State | Zustand (cart, design session) |
| Validation | Zod + react-hook-form |
| Email | Resend + React Email |
| POD / Fulfillment | Printful API v2 |
| Storefront (Phase 1) | Nuvemshop (native Printful integration) |
| Deploy | Vercel |

---

## Environment Variables

```env
# Printful
PRINTFUL_TOKEN=             # Private token from Printful Developer Portal
PRINTFUL_STORE_ID=          # Store ID (required for account-level token requests)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Server-side only, never exposed to client

# Resend (transactional email)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=        # e.g. https://yourdomain.com (used for webhook URLs)
WEBHOOK_SECRET=             # HMAC secret for validating Printful webhook signatures
```

---

## Bun Setup

This project uses **Bun** as the primary toolchain. Never use `npm` or `npx` — always use `bun`.

### Bootstrapping

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Create project
bunx create-next-app@latest my-app --typescript --tailwind --app
cd my-app

# Install dependencies
bun install
```

### package.json scripts

```json
{
  "scripts": {
    "dev":   "bun --bun next dev",
    "build": "bun --bun next build",
    "start": "bun --bun next start",
    "lint":  "bun --bun next lint"
  }
}
```

The `--bun` flag ensures Bun's runtime (not Node.js) executes the Next.js CLI.

### Vercel deployment (Bun runtime)

Add to `vercel.json` to run the app on the Bun runtime in production (~28% lower latency on CPU-bound routes):

```json
{
  "bunVersion": "1.x"
}
```

### Bun-specific rules

- Use `bunx` instead of `npx` for one-off CLI commands (e.g. `bunx shadcn@latest add button`)
- Never use `bcrypt` — it uses native Node bindings incompatible with Bun. Use `Bun.password` or `bcryptjs` instead
- `bun:sqlite` is available natively if needed for local dev/scripts — no extra package required
- Supabase, Zod, Zustand, react-hook-form, and all project dependencies are fully compatible with Bun

---

## Project Structure

```
app/
├── (store)/                  # Public-facing store routes
│   ├── page.tsx              # Homepage / product catalog
│   ├── upload/page.tsx       # Image upload + product picker
│   ├── mockup/page.tsx       # Mockup preview before checkout
│   └── orders/page.tsx       # Order history (authenticated)
├── api/
│   ├── catalog/route.ts      # GET catalog filtered for Brazil (selling_region_name=brazil)
│   ├── upload-design/route.ts# POST image → Printful Files API → returns file_id
│   ├── mockup/route.ts       # POST variant + file_id → Printful Mockup Generator
│   ├── order/route.ts        # POST create + confirm order in Printful
│   └── webhook/route.ts      # POST receive Printful events (shipped, delivered, etc.)
├── layout.tsx
└── globals.css

components/
├── ProductCatalog.tsx         # Catalog grid with filters (category, technique, search)
├── UploadZone.tsx             # Drag-and-drop image upload with preview
├── MockupViewer.tsx           # Displays mockup returned by Printful
├── ProductPicker.tsx          # Variant selector (color, size)
└── OrderStatus.tsx            # Real-time order status via Supabase Realtime

hooks/
├── useCatalog.ts              # Fetch + filter catalog from /api/catalog
├── useUpload.ts               # Upload image to Supabase Storage + Printful Files
├── useMockup.ts               # Generate mockup from variant + file_id
└── useOrder.ts                # Create and track orders

lib/
├── printful.ts                # Printful API client (typed fetch wrapper)
├── supabase/
│   ├── client.ts              # Browser client
│   └── server.ts              # Server client (uses service role key)
└── validations/
    ├── order.ts               # Zod schema for order payload
    └── upload.ts              # Zod schema for file upload (type, size limits)

store/
└── useDesignSession.ts        # Zustand store: uploaded image, selected product/variant
```

---

## Key Architectural Decisions

### API Routes are the only place Printful token is used
Never import `PRINTFUL_TOKEN` in client components. All Printful calls go through `/api/*` routes on the server.

### Image flow
1. User drops image → validated client-side (type: PNG/JPG/SVG, max 50MB)
2. Uploaded to **Supabase Storage** (bucket: `designs`, private)
3. Public URL passed to `POST /api/upload-design` → forwarded to `POST https://api.printful.com/files`
4. Printful returns `file_id` → stored in Zustand `useDesignSession`

### Catalog is cached with ISR
`/api/catalog` calls Printful with `next: { revalidate: 600 }` — catalog refreshes every 10 minutes, not on every request.

### Webhook validation
All incoming Printful webhooks are validated using HMAC-SHA256 before processing:
```ts
const signature = req.headers.get('x-printful-signature')
const body = await req.text()
const expected = createHmac('sha256', process.env.WEBHOOK_SECRET!).update(body).digest('hex')
if (signature !== expected) return new Response('Unauthorized', { status: 401 })
```

### Supabase Realtime for order status
When a Printful webhook arrives (`shipment_sent`, `shipment_delivered`):
1. `/api/webhook` updates the `orders` table in Supabase
2. Client subscribes to Supabase Realtime on `orders` table filtered by `user_id`
3. UI updates live without polling

---

## Supabase Schema

```sql
-- Users are managed by Supabase Auth (auth.users)

create table designs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  file_url    text not null,           -- Supabase Storage URL
  printful_file_id text,               -- file_id returned by Printful Files API
  created_at  timestamptz default now()
);

create table orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  printful_order_id   bigint unique,
  design_id           uuid references designs,
  product_name        text,
  variant_id          bigint,          -- Printful catalog variant ID
  status              text default 'pending',  -- pending | in_production | shipped | delivered
  tracking_url        text,
  retail_price        numeric(10,2),
  currency            text default 'BRL',
  recipient_name      text,
  recipient_address   text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- RLS: users only see their own data
alter table designs enable row level security;
alter table orders  enable row level security;

create policy "own designs" on designs for all using (auth.uid() = user_id);
create policy "own orders"  on orders  for all using (auth.uid() = user_id);
```

---

## Printful API Reference (v2)

Base URL: `https://api.printful.com`

| Action | Method | Endpoint |
|---|---|---|
| List catalog (Brazil) | GET | `/v2/catalog-products?selling_region_name=brazil` |
| Get variant details | GET | `/v2/catalog-variants/{id}` |
| Get product prices | GET | `/v2/catalog-variants/{id}/prices?selling_region_name=brazil` |
| Upload design file | POST | `/files` |
| Generate mockup | POST | `/v2/mockup-generator/create-task` |
| Get mockup result | GET | `/v2/mockup-generator/task?task_key={key}` |
| Create order | POST | `/v2/orders` |
| Confirm order | POST | `/v2/orders/{id}/confirm` |
| Get order status | GET | `/v2/orders/{id}` |
| Configure webhooks | POST | `/v2/webhooks` |

Auth header: `Authorization: Bearer ${PRINTFUL_TOKEN}`
Store header (when needed): `X-PF-Store-Id: ${PRINTFUL_STORE_ID}`
Rate limit: 120 req/min (leaky bucket algorithm in v2)

---

## Coding Conventions

- All API routes return `NextResponse.json(data)` or `NextResponse.json({ error }, { status })`
- Use `async/await`, never `.then()` chains
- All Printful responses are typed — define interfaces for every API response shape
- Zod schemas validate all incoming request bodies in API routes
- Never `console.log` sensitive data (tokens, user PII)
- Prefer `server components` for static/cached data, `client components` only when interactivity is needed
- Every Supabase server call uses the service role client from `lib/supabase/server.ts`
- Always use `bun` / `bunx` — never `npm`, `npx`, or `yarn`
- Never use `bcrypt` — use `Bun.password` (native) or `bcryptjs` (pure JS drop-in)

---

## Phase Roadmap

| Phase | Storefront | Checkout | Status |
|---|---|---|---|
| 1 | Nuvemshop | Nuvemshop (PIX, boleto, card) | Current |
| 2 | Custom Next.js | Gateway BR (Pagar.me or Mercado Pago) | Future |

In Phase 1, this Next.js app handles **design capture only** (upload + mockup preview). The actual product listing and checkout live on Nuvemshop with the native Printful integration.
