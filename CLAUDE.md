@AGENTS.md

# pet-maker

Print-on-demand storefront. Users upload artwork, pick a Printful product, preview a mockup, pay via Stripe, and track their order. Phase 1 scope: design capture and order flow only.

## Stack

- **Next.js 16** · App Router · React 19 · TypeScript
- **Supabase** — Postgres (orders, designs tables), Storage bucket `designs` (private), Auth (email+password), Realtime (live order status)
- **Printful API v2** — catalog, mockup generator, file hosting, order creation/confirmation
- **Stripe** — Checkout Sessions with card, PIX, and Boleto Bancário (BRL)
- **Zustand** — client-side design session state (`store/useDesignSession.ts`)
- **shadcn/ui** + **Tailwind v4** — UI components in `components/ui/`
- **Resend** — transactional email
- **Zod** — validation
- **bun** — package manager and runtime; always use `bun`/`bunx`, never npm/npx/pnpm

## Dev

```bash
bun install
bun dev
bun build
bun lint
```

## Setup (first run)

```bash
psql $DATABASE_URL < supabase/schema.sql
bun scripts/setup-storage.ts
```

## Key files

| File | Purpose |
|------|---------|
| `proxy.ts` | Middleware: session refresh, protects all routes except `/login`, enforces `ALLOWED_EMAILS` allowlist |
| `lib/supabase/server.ts` | Auth-aware Supabase client for Server Components / Route Handlers |
| `lib/supabase/client.ts` | Browser-side Supabase client |
| `app/actions/auth.ts` | Server Actions: `signOut`, `adminCreateUser` |
| `hooks/use*.ts` | Data-fetching hooks: `useCatalog`, `useMockup`, `useOrder`, `useUpload` |
| `lib/rate-limit.ts` | In-memory rate limiter for API routes |
| `messages/pt-BR.ts` | All UI strings — app is hardcoded to `pt-BR` locale |

## Code style

- Prefer simplicity — solve problems in the most direct way possible; avoid over-engineering
- Avoid adding external libraries when the same result can be achieved with plain TypeScript/React
- Functional style + immutability; avoid mutation
- Name every API call with a descriptive `async function` (not anonymous inline fetches)
- Avoid unnecessary `!` non-null assertions; narrow types properly instead
- Named exports preferred for hooks and utilities; default exports for pages and components
- Clean code and DRY principles — extract shared logic, avoid duplication
- No comments (including `// eslint-disable`); use meaningful names to make code self-documenting
- No `as` casts or `any`; narrow with type guards, generics, or Zod instead

```ts
async function getUnitAmount(variantId: number) {
  const priceData = await printful.get<{
    result: Array<{ price: string; currency: string }>;
  }>(`/v2/catalog-variants/${variantId}/prices?selling_region_name=brazil`);
  if (!priceData.result[0]) return 0;
  return Math.round(parseFloat(priceData.result[0].price) * 100);
}
```

## Key flows

```
Upload → Supabase Storage "designs" → POST /api/upload-design → Printful /files
       → fileUrl (signed URL) + supabaseFileUrl (Printful CDN URL) → Zustand

Product pick → GET /api/catalog (ISR 600s) → selectedVariantId → Zustand

Mockup → POST /api/mockup → Printful mockup-generator task (poll ≤10× / 2s) → mockupUrl → Zustand

Checkout → POST /api/stripe/checkout
         → Printful /v2/catalog-variants/{id}/prices (BRL)
         → stripe.checkout.sessions.create (metadata: printful_file_id, variant_id, user_id)
         → redirect to Stripe hosted checkout

Payment → Stripe webhook /api/stripe/webhook
        → checkout.session.completed (card/PIX) or async_payment_succeeded (boleto)
        → POST Printful /v2/orders + confirm
        → INSERT Supabase orders (status: in_production)

Shipping → Printful webhook /api/webhook (HMAC-SHA256 validated)
         → UPDATE Supabase orders (status, tracking_url)
         → Supabase Realtime → live badge in OrderStatus
```

## Zustand session state (`useDesignSession`)

| Field                                     | Purpose                                                      |
| ----------------------------------------- | ------------------------------------------------------------ |
| `fileUrl`                                 | Supabase signed URL — used for image preview only            |
| `supabaseFileUrl`                         | Printful CDN URL — passed as `image_url` to mockup generator |
| `selectedProductId` / `selectedVariantId` | Chosen product + variant                                     |
| `selectedProductName`                     | Display label                                                |
| `mockupUrl`                               | Generated mockup image URL                                   |

## Database tables

- `designs` — user uploads (`user_id` nullable, supports guests)
- `orders` — `status` enum: `pending | in_production | shipped | delivered`; RLS enabled; `service_role` key bypasses RLS for webhook handlers

## Environment variables

See `WIRING.md` for full setup. Key notes:
- Uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase's newer name — not `ANON_KEY`)
- `ALLOWED_EMAILS` — optional comma-separated list; when set, only those emails can log in
- Server-only vars (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `PRINTFUL_TOKEN`, etc.) must never be exposed to the client

## Printful client (`lib/printful.ts`)

Thin wrapper around `fetch`. Two methods:

```ts
printful.get<T>(path, revalidate?)   // GET with optional ISR revalidation
printful.post<T>(path, body)         // POST
```

Both include `Authorization` and `X-PF-Store-Id` headers automatically.
