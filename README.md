# pet-maker

Print-on-demand storefront. Users upload artwork, pick a Printful product, preview a mockup, pay via Stripe, and track their order.

## Stack

- **Next.js 16** · App Router · React 19 · TypeScript
- **Supabase** — Postgres, Storage, Auth (magic link), Realtime
- **Printful API v2** — catalog, mockup generator, order fulfillment
- **Stripe** — Checkout Sessions (card, PIX, Boleto BRL)
- **Zustand** · **shadcn/ui** · **Tailwind v4**

## Getting started

```bash
bun install
cp .env.example .env.local   # fill in all keys — see WIRING.md
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

All required keys are documented in `.env.example`. Setup instructions (Supabase buckets, Stripe webhooks, Printful store) are in [`WIRING.md`](./WIRING.md).

## Key flows

```
Upload  →  Supabase Storage  →  Printful Files API
Product →  Printful catalog (ISR 600s)
Mockup  →  Printful mockup-generator (poll ≤10×)
Pay     →  Stripe Checkout  →  webhook  →  Printful order + confirm
Ship    →  Printful webhook  →  Supabase Realtime  →  live order badge
```
