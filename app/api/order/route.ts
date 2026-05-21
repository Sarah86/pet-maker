import { NextResponse } from "next/server";
import { orderSchema } from "@/lib/validations/order";
import { printful } from "@/lib/printful";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";
import type { PrintfulOrder } from "@/lib/printful";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const {
    variantId,
    fileId,
    recipientName,
    recipientEmail,
    address1,
    address2,
    city,
    stateCode,
    zip,
    quantity,
  } = parsed.data;

  try {
    const created = await printful.post<{ result: PrintfulOrder }>("/v2/orders", {
      recipient: {
        name: recipientName,
        email: recipientEmail,
        address1,
        address2: address2 ?? "",
        city,
        state_code: stateCode,
        country_code: "BR",
        zip,
      },
      items: [
        {
          variant_id: variantId,
          quantity,
          files: [{ type: "default", id: fileId }],
        },
      ],
      retail_costs: { currency: "BRL" },
    });

    const printfulOrderId = created.result.id;
    const admin = createAdminClient();

    const [{ data: order, error: orderError }] = await Promise.all([
      admin
        .from("orders")
        .insert({
          user_id: user.id,
          printful_order_id: printfulOrderId,
          product_name: `Variante #${variantId}`,
          variant_id: variantId,
          status: "pending",
          currency: "BRL",
          recipient_name: recipientName,
          recipient_address: `${address1}, ${city} - ${stateCode}, ${zip}`,
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

    return NextResponse.json({ orderId: order.id, printfulOrderId });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, "Erro ao criar pedido") }, { status: 500 });
  }
}
