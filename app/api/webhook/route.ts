import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const printfulEventSchema = z.object({
  type: z.string(),
  data: z.object({
    order: z.object({
      id: z.number(),
      status: z.string(),
      shipments: z.array(z.object({ tracking_url: z.string() })).optional(),
    }),
  }),
});

export async function POST(req: Request) {
  const signature = req.headers.get("x-printful-signature");
  const body = await req.text();

  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("WEBHOOK_SECRET is not set");

  const expected = createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = printfulEventSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { type, data } = parsed.data;
  const admin = createAdminClient();

  if (type === "package_shipped" || type === "shipment_sent") {
    const trackingUrl = data.order.shipments?.[0]?.tracking_url ?? null;
    await admin
      .from("orders")
      .update({ status: "shipped", tracking_url: trackingUrl, updated_at: new Date().toISOString() })
      .eq("printful_order_id", data.order.id);
  }

  if (type === "package_returned" || type === "shipment_delivered") {
    await admin
      .from("orders")
      .update({ status: "delivered", updated_at: new Date().toISOString() })
      .eq("printful_order_id", data.order.id);
  }

  return NextResponse.json({ received: true });
}
