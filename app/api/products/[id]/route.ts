import { NextResponse } from "next/server";
import { printful } from "@/lib/printful";
import { errorMessage } from "@/lib/utils";
import type { PrintfulVariant } from "@/lib/printful";

interface V1ProductDetail {
  product: { id: number; title: string; image: string };
  variants: PrintfulVariant[];
}

function pickDefaultVariant(
  variants: PrintfulVariant[]
): PrintfulVariant | null {
  const inStock = variants.filter((v) => v.in_stock);
  const pool = inStock.length ? inStock : variants;
  return (
    pool.find((v) => v.color === "White" && v.size === "M") ??
    pool.find((v) => v.color === "White") ??
    pool[0] ??
    null
  );
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await printful.get<{ result: V1ProductDetail }>(
      `/products/${id}`
    );
    const variant = pickDefaultVariant(data.result.variants);
    if (!variant) {
      return NextResponse.json(
        { error: "Nenhuma variante disponível" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      variantId: variant.id,
      variantName: variant.name,
      color: variant.color,
      size: variant.size,
    });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, "Erro ao buscar variantes") }, { status: 500 });
  }
}
