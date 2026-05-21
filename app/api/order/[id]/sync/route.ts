import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { printful } from "@/lib/printful/printful";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Order } from "@/hooks/useOrder";

const PRINTFUL_STATUS: Record<string, Order["status"]> = {
  draft: "pending",
  pending: "pending",
  onhold: "pending",
  inprocess: "in_production",
  partial: "in_production",
  fulfilled: "shipped",
  canceled: "cancelled",
  returned: "cancelled",
};

function resolvePaymentStatus(
  charge: Stripe.Charge
): Order["stripe_payment_status"] {
  if (charge.disputed) return "disputed";
  if (charge.refunded) return "refunded";
  if (charge.amount_refunded > 0) return "partially_refunded";
  return "paid";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, printful_order_id, stripe_session_id, stripe_payment_status, status, tracking_url"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (order.status === "cancelled" || order.status === "delivered") {
    return NextResponse.json({
      status: order.status,
      stripe_payment_status: order.stripe_payment_status,
    });
  }

  const admin = createAdminClient();

  if (order.stripe_session_id) {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripe_session_id,
      { expand: ["payment_intent.latest_charge"] }
    );
    const pi = session.payment_intent;
    if (typeof pi === "object" && pi !== null) {
      const charge = pi.latest_charge;
      if (typeof charge === "object" && charge !== null) {
        const newPaymentStatus = resolvePaymentStatus(charge);
        if (newPaymentStatus !== order.stripe_payment_status) {
          await admin
            .from("orders")
            .update({ stripe_payment_status: newPaymentStatus })
            .eq("id", order.id);
        }
      }
    }
  }

  if (!order.printful_order_id) {
    return NextResponse.json({
      status: order.status,
      stripe_payment_status: order.stripe_payment_status,
    });
  }

  const pfData = await printful.get<{
    data: {
      status: string;
      shipments?: Array<{ tracking_url?: string }>;
    };
  }>(`/v2/orders/${order.printful_order_id}`);

  const newStatus = PRINTFUL_STATUS[pfData.data.status] ?? order.status;
  const trackingUrl = pfData.data.shipments?.[0]?.tracking_url ?? null;

  const statusChanged = newStatus !== order.status;
  const trackingChanged = trackingUrl && trackingUrl !== order.tracking_url;

  if (statusChanged || trackingChanged) {
    await admin
      .from("orders")
      .update({
        status: newStatus,
        ...(trackingUrl ? { tracking_url: trackingUrl } : {}),
      })
      .eq("id", order.id);
  }

  return NextResponse.json({
    status: newStatus,
    stripe_payment_status: order.stripe_payment_status,
  });
}
