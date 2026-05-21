import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { printful } from "@/lib/printful";
import { createAdminClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";

export const maxDuration = 30;

async function fulfillSession(session: Stripe.Checkout.Session) {
  const { printful_file_id, variant_id, user_id, product_name } =
    session.metadata ?? {};

  if (!printful_file_id || !variant_id) return;

  // In Stripe SDK v22, shipping address lives under collected_information
  const shipping = session.collected_information?.shipping_details;
  const customer = session.customer_details;

  const created = await printful.post<{ result: { id: number } }>("/v2/orders", {
    recipient: {
      name: shipping?.name ?? customer?.name ?? "",
      email: customer?.email ?? "",
      address1: shipping?.address?.line1 ?? "",
      address2: shipping?.address?.line2 ?? "",
      city: shipping?.address?.city ?? "",
      state_code: shipping?.address?.state ?? "",
      country_code: shipping?.address?.country ?? "BR",
      zip: shipping?.address?.postal_code ?? "",
    },
    items: [
      {
        variant_id: parseInt(variant_id),
        quantity: 1,
        files: [{ type: "default", url: printful_file_id }],
      },
    ],
    retail_costs: {
      currency: "BRL",
      total: String((session.amount_total ?? 0) / 100),
    },
  });

  const printfulOrderId = created.result.id;
  const admin = createAdminClient();

  const [{ data: order, error: orderError }] = await Promise.all([
    admin
      .from("orders")
      .insert({
        user_id: user_id || null,
        printful_order_id: printfulOrderId,
        product_name: product_name ?? `Variante #${variant_id}`,
        variant_id: parseInt(variant_id),
        status: "pending",
        currency: "BRL",
        retail_price: (session.amount_total ?? 0) / 100,
        recipient_name: shipping?.name ?? customer?.name ?? "",
        recipient_address: [
          shipping?.address?.line1,
          shipping?.address?.city,
          `${shipping?.address?.state} ${shipping?.address?.postal_code}`,
        ]
          .filter(Boolean)
          .join(", "),
      })
      .select()
      .single(),
    printful.post(`/v2/orders/${printfulOrderId}/confirm`, {}),
  ]);

  if (orderError || !order) throw new Error("Falha ao salvar pedido");

  await admin
    .from("orders")
    .update({ status: "in_production" })
    .eq("id", order.id);
}

export async function POST(req: Request) {
  const body = await req.text(); // raw body required for signature verification
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Card / PIX: payment confirmed immediately
    if (event.type === "checkout.session.completed") {
      if (event.data.object.payment_status === "paid") {
        await fulfillSession(event.data.object);
      }
    }

    // Boleto: payment confirmed async (up to 3 days after checkout)
    if (event.type === "checkout.session.async_payment_succeeded") {
      await fulfillSession(event.data.object);
    }
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, "Fulfillment error") }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
