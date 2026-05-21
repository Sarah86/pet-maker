import { NextResponse } from "next/server";
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
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: order } = await supabase
    .from("orders")
    .select("id, printful_order_id, status, tracking_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!order.printful_order_id)
    return NextResponse.json({ status: order.status });

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
    const admin = createAdminClient();
    await admin
      .from("orders")
      .update({
        status: newStatus,
        ...(trackingUrl ? { tracking_url: trackingUrl } : {}),
      })
      .eq("id", order.id);
  }

  return NextResponse.json({ status: newStatus });
}
