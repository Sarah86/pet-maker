import { NextResponse } from "next/server";
import { printful } from "@/lib/printful/printful";
import { errorMessage } from "@/lib/utils";
import type { PrintfulProduct } from "@/lib/printful/printful";

export const revalidate = 600;

interface V2Product {
  id: number;
  name: string;
  type: string;
  image: string;
  variant_count: number;
}

function toTitleCase(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET() {
  try {
    const data = await printful.get<{ data: V2Product[] }>(
      "/v2/catalog-products?selling_region_name=brazil&limit=100",
      600
    );

    const products: PrintfulProduct[] = data.data.map((p) => ({
      id: p.id,
      title: p.name,
      description: "",
      type: p.type,
      type_name: toTitleCase(p.type),
      image: p.image,
      variant_count: p.variant_count,
    }));

    return NextResponse.json({ result: products });
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
