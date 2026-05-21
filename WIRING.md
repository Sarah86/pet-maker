# Wiring Checklist

Everything you need to connect before the app is live. Work top-to-bottom.

---

## 1. Environment Variables

Copy and fill in `.env.local`:

```bash
cp .env.example .env.local
```

| Variable                             | Where to get it                                            |
| ------------------------------------ | ---------------------------------------------------------- |
| `PRINTFUL_TOKEN`                     | Printful Dashboard → Developers → API → Generate token     |
| `PRINTFUL_STORE_ID`                  | Printful Dashboard → Stores → your store ID                |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase → Project Settings → API → Project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase → Project Settings → API → anon public            |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase → Project Settings → API → service_role (secret!) |
| `RESEND_API_KEY`                     | resend.com → API Keys → Create API Key                     |
| `NEXT_PUBLIC_APP_URL`                | Your production URL, e.g. `https://pet-maker.vercel.app`   |
| `WEBHOOK_SECRET`                     | Generate with: `openssl rand -hex 32`                      |
| `STRIPE_SECRET_KEY`                  | Stripe Dashboard → Developers → API keys → Secret key      |
| `STRIPE_WEBHOOK_SECRET`              | Stripe Dashboard → Developers → Webhooks → signing secret  |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → Publishable key |

---

## 2. Supabase

### Database schema

Run in Supabase → SQL Editor:

```bash
# Paste the contents of supabase/schema.sql
```

### Storage bucket

Supabase → Storage → New bucket:

- Name: `designs`
- Public: **off** (private)

### Auth

Supabase → Authentication → Providers:

- Enable **Email** (magic link / OTP)
- Set Site URL to `NEXT_PUBLIC_APP_URL`
- Add redirect URL: `<NEXT_PUBLIC_APP_URL>/orders`

---

## 3. Printful

### API store type

In Printful Dashboard → Stores, make sure the store connected to your token is an **API/Manual store** — not a platform integration (Shopify, Nuvemshop, etc.). This prevents duplicate order creation.

### Webhook (shipping updates)

Printful Dashboard → Developers → Webhooks → Add endpoint:

- URL: `<NEXT_PUBLIC_APP_URL>/api/webhook`
- Events: `package_shipped`, `package_returned`
- The `WEBHOOK_SECRET` you set here must match `.env.local`

---

## 4. Stripe

### Enable Brazilian payment methods

Stripe Dashboard → Settings → Payment methods:

- Enable **PIX** (instant, recommended)
- Enable **Boleto Bancário** (3-day window, already configured in checkout)
- Enable **Cards** (default)

### Register webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:

- URL: `<NEXT_PUBLIC_APP_URL>/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed` — card + PIX (paid immediately)
  - `checkout.session.async_payment_succeeded` — boleto (paid up to 3 days later)
  - `checkout.session.async_payment_failed` — optional, for failed boleto

Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET` in `.env.local`

### Local testing with Stripe CLI

```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret it prints → STRIPE_WEBHOOK_SECRET for local dev
```

---

## 5. Resend (transactional email)

resend.com → Domains → Add and verify your domain.

---

## 6. Vercel Deployment

```bash
bun add -g vercel
vercel link
vercel env pull .env.local
vercel --prod
```

Add all `.env.local` variables in Vercel → Project Settings → Environment Variables before deploying.

---

## 7. Supabase ↔ Vercel (optional but recommended)

Install the Supabase integration from Vercel Marketplace — it auto-syncs the three Supabase env vars to your Vercel project.

---

## 8. Smoke Test Checklist

- [ ] `/` loads product catalog (Printful catalog API + ISR cache)
- [ ] `/upload` — drag-and-drop image → appears in Supabase Storage bucket `designs`
- [ ] `/upload` — `supabaseFileUrl` appears in Zustand (check React DevTools)
- [ ] `/mockup` — mockup image renders from Printful Mockup Generator
- [ ] `/mockup` — "Finalizar compra" → redirects to Stripe Checkout with BRL price
- [ ] Stripe Checkout — pay with test card `4242 4242 4242 4242`
- [ ] After payment → Stripe webhook fires → Printful order created → Supabase order row inserted
- [ ] `/orders` — order appears with status `in_production`
- [ ] `/login` — magic link email arrives
- [ ] `/orders` — redirects to `/login` when unauthenticated
- [ ] Printful webhook → `package_shipped` → order status updates live via Supabase Realtime

---

## Code Connections Map

```
User uploads file
  → UploadZone (client)
  → Supabase Storage bucket "designs" (private)
  → signed URL (1h)
  → POST /api/upload-design
  → Printful POST /files
  → file_id → useDesignSession (Zustand)

User picks product
  → ProductPicker
  → useCatalog → GET /api/catalog → Printful /v2/catalog-products (ISR 600s)
  → selectedVariantId → useDesignSession (Zustand)

Mockup preview
  → MockupViewer
  → useMockup → POST /api/mockup
  → Printful POST /v2/mockup-generator/create-task
  → poll GET /v2/mockup-generator/task (≤10× / 2s, maxDuration 30s)
  → mockupUrl → useDesignSession (Zustand)

Checkout
  → MockupViewer "Finalizar compra" button
  → POST /api/stripe/checkout
      → GET Printful /v2/catalog-variants/{id}/prices (BRL price)
      → stripe.checkout.sessions.create
          metadata: { printful_file_id, variant_id, user_id, product_name }
          payment_method_types: card | pix | boleto
          shipping_address_collection: BR
  → redirect to Stripe hosted checkout

Payment confirmed
  → Stripe webhook → POST /api/stripe/webhook
  → checkout.session.completed (card/PIX)  OR
    checkout.session.async_payment_succeeded (boleto, up to 3 days)
  → POST Printful /v2/orders (with file_id from metadata)
  → POST Printful /v2/orders/{id}/confirm
  → INSERT Supabase orders (status: in_production)

Shipping update
  → Printful webhook → POST /api/webhook
  → HMAC-SHA256 validation
  → UPDATE Supabase orders (status, tracking_url)
  → Supabase Realtime → OrderStatus live badge update
```
