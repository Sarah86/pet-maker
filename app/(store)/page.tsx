import { printful } from "@/lib/printful";
import type { PrintfulProduct } from "@/lib/printful";
import ProductCatalog from "@/components/ProductCatalog";

export const revalidate = 600;

async function getCatalog(): Promise<PrintfulProduct[]> {
  try {
    const data = await printful.get<{ result: PrintfulProduct[] }>(
      "/v2/catalog-products?selling_region_name=brazil&limit=100",
      600
    );
    return data.result ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const products = await getCatalog();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Transforme sua arte em produto
        </h1>
        <p className="text-muted-foreground text-lg">
          Envie sua imagem, escolha o produto e receba em casa — produzido e enviado pelo Printful.
        </p>
      </div>
      <ProductCatalog products={products} />
    </div>
  );
}
