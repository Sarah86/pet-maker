import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { printful } from "@/lib/printful/printful";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

const checkoutSchema = z.object({
  fileId: z.string().min(1),
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  productName: z.string().min(1),
  mockupUrl: z.string().url().optional(),
});

const CHECKOUT_TTL_SECONDS = 30 * 60;
const PRICE_MARKUP = 1; // e.g. 1.5 = 50% margin over Printful base cost

async function getUnitAmount(variantId: number) {
  const priceData = await printful.get<{
    data: {
      currency: string;
      variant: {
        techniques: Array<{ price: string; discounted_price: string }>;
      };
    };
  }>(
    `/v2/catalog-variants/${variantId}/prices?selling_region_name=brazil&currency=BRL`
  );
  const price = priceData.data?.variant?.techniques?.[0]?.discounted_price;
  if (!price) return 0;
  return Math.round(parseFloat(price) * PRICE_MARKUP * 100);
}

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 10, 60_000)) return tooManyRequests();

  const supabase = await createClient();

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { fileId, productId, variantId, productName, mockupUrl } = parsed.data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");

  try {
    const [
      {
        data: { user },
      },
      unitAmount,
    ] = await Promise.all([supabase.auth.getUser(), getUnitAmount(variantId)]);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "brl",
      payment_method_types: ["card", "pix"],
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
      shipping_address_collection: { allowed_countries: ["BR"] },
      custom_fields: [
        {
          key: "tax_number",
          label: { type: "custom", custom: "CPF / CNPJ" },
          type: "text",
          text: { minimum_length: 11, maximum_length: 18 },
        },
      ],
      metadata: {
        printful_file_id: fileId,
        product_id: String(productId),
        variant_id: String(variantId),
        user_id: user?.id ?? "",
        product_name: productName,
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/mockup`,
      locale: "pt-BR",
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
    });

    if (!session.url) throw new Error("Stripe não retornou URL de checkout");

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: errorMessage(err, "Erro ao criar sessão") },
      { status: 500 }
    );
  }
}
