import Link from "next/link";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { printful } from "@/lib/printful/printful";
import { createAdminClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";
import { ptBR } from "@/messages/pt-BR";

const t = ptBR.checkoutSuccess;

interface PrintfilesResult {
  available_placements: Record<string, string>;
}

interface VariantAvailabilityResult {
  data: {
    catalog_variant_id: number;
    techniques: Array<{ technique: string }>;
  };
}

async function resolvePrintPlacement(
  productId: string,
  variantId: string
): Promise<{ placement: string; technique: string }> {
  const [pf, availability] = await Promise.all([
    printful.get<{ result: PrintfilesResult }>(
      `/mockup-generator/printfiles/${productId}`
    ),
    printful.get<VariantAvailabilityResult>(
      `/v2/catalog-variants/${variantId}/availability`
    ),
  ]);

  const placement = Object.keys(pf.result.available_placements)[0] ?? "front";
  const technique = availability.data.techniques[0]?.technique ?? "dtg";

  return { placement, technique };
}

async function confirmPrintfulOrder(orderId: number): Promise<void> {
  const maxAttempts = 8;
  const delayMs = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await printful.post(`/v2/orders/${orderId}/confirmation`, {});
      return;
    } catch (err) {
      const isCostPending =
        err instanceof Error && err.message.includes("Cost calculations");
      if (!isCostPending || attempt === maxAttempts) throw err;
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function fulfillCheckoutSession(
  sessionId: string
): Promise<string | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return t.errorNotPaid;
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (existing) return null;

  const { printful_file_id, product_id, variant_id, user_id, product_name } =
    session.metadata ?? {};

  if (!printful_file_id || !product_id || !variant_id) {
    return t.errorMissingData;
  }

  const shipping = session.collected_information?.shipping_details;
  const customer = session.customer_details;
  const taxDetails = session.custom_fields.find((c) => c.key === "tax_number")
    ?.text?.value;

  const { placement, technique } = await resolvePrintPlacement(
    product_id,
    variant_id
  );

  const created = await printful.post<{ data: { id: number } }>("/v2/orders", {
    recipient: {
      name: shipping?.name ?? customer?.name ?? "",
      email: customer?.email ?? "",
      address1: shipping?.address?.line1 ?? "",
      address2: shipping?.address?.line2 ?? "",
      city: shipping?.address?.city ?? "",
      state_code: shipping?.address?.state ?? "",
      country_code: shipping?.address?.country ?? "BR",
      zip: shipping?.address?.postal_code ?? "",
      tax_number: taxDetails ?? "",
    },
    order_items: [
      {
        source: "catalog",
        catalog_variant_id: parseInt(variant_id),
        quantity: 1,
        placements: [
          {
            placement,
            technique,
            layers: [{ type: "file", url: printful_file_id }],
          },
        ],
      },
    ],
  });

  const printfulOrderId = created.data.id;

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user_id || null,
      printful_order_id: printfulOrderId,
      stripe_session_id: sessionId,
      stripe_payment_status: "paid",
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
    .single();

  if (orderError || !order) return t.errorSaveOrder;

  await confirmPrintfulOrder(printfulOrderId);
  await admin
    .from("orders")
    .update({ status: "in_production" })
    .eq("id", order.id);

  return null;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) redirect("/mockup");

  let fulfillmentError: string | null = null;
  try {
    fulfillmentError = await fulfillCheckoutSession(session_id);
  } catch (err) {
    fulfillmentError = errorMessage(err, t.errorUnknown);
  }

  if (!fulfillmentError) redirect("/orders");

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
      <p className="text-destructive">{fulfillmentError}</p>
      <Link href="/mockup" className="text-sm underline underline-offset-4">
        {t.backToMockup}
      </Link>
    </div>
  );
}
