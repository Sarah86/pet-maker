import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { printful } from "@/lib/printful";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";

const checkoutSchema = z.object({
  fileId: z.string().min(1),
  variantId: z.number().int().positive(),
  productName: z.string().min(1),
  mockupUrl: z.string().url().optional(),
});

const CHECKOUT_TTL_SECONDS = 30 * 60;

async function getUnitAmount(variantId: number) {
  const priceData = await printful.get<{
    result: Array<{ price: string; currency: string }>;
  }>(`/v2/catalog-variants/${variantId}/prices?selling_region_name=brazil`);
  if (!priceData.result[0]) return 0;
  return Math.round(parseFloat(priceData.result[0].price) * 100);
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { fileId, variantId, productName, mockupUrl } = parsed.data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");

  try {
    const [{ data: { user } }, unitAmount] = await Promise.all([
      supabase.auth.getUser(),
      getUnitAmount(variantId),
    ]);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "brl",
      payment_method_types: ["card", "boleto", "pix"],
      payment_method_options: {
        boleto: { expires_after_days: 3 },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: unitAmount,
            product_data: {
              name: productName,
              ...(mockupUrl ? { images: [mockupUrl] } : {}),
            },
          },
        },
      ],
      // Collect shipping address — required to pass recipient to Printful
      shipping_address_collection: { allowed_countries: ["BR"] },
      // Embed design reference so the webhook can create the Printful order
      metadata: {
        printful_file_id: fileId,
        variant_id: String(variantId),
        user_id: user?.id ?? "",
        product_name: productName,
      },
      success_url: `${appUrl}/orders`,
      cancel_url: `${appUrl}/mockup`,
      locale: "pt-BR",
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
    });

    if (!session.url) throw new Error("Stripe não retornou URL de checkout");

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, "Erro ao criar sessão") }, { status: 500 });
  }
}
