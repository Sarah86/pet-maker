"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCatalog } from "@/hooks/useCatalog";
import { useDesignSession } from "@/store/useDesignSession";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductPicker({ showContinue = true }: { showContinue?: boolean }) {
  const { products, loading, error } = useCatalog();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fetchingVariant, setFetchingVariant] = useState(false);
  const { previewUrl, setVariant, clearVariant } = useDesignSession();
  const router = useRouter();

  async function handleSelect(productId: number, productTitle: string) {
    setSelectedId(productId);
    setFetchingVariant(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar variante");
      setVariant(productId, data.variantId, productTitle);
    } catch {
      setSelectedId(null);
      clearVariant();
    } finally {
      setFetchingVariant(false);
    }
  }

  function handleContinue() {
    router.push("/mockup");
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))
          : products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelect(product.id, product.title)}
                disabled={fetchingVariant}
                className={cn(
                  "rounded-lg border-2 overflow-hidden text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  selectedId === product.id
                    ? "border-primary"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="aspect-square relative bg-muted">
                  {fetchingVariant && selectedId === product.id ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : null}
                  {product.image && (
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 640px) 45vw, 180px"
                    />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium line-clamp-1">
                    {product.title}
                  </p>
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {product.type_name}
                  </Badge>
                </div>
              </button>
            ))}
      </div>

      {showContinue && (
        <Button
          className="w-full"
          disabled={!selectedId || !previewUrl || fetchingVariant}
          onClick={handleContinue}
        >
          {!previewUrl
            ? "Envie uma imagem primeiro"
            : !selectedId
              ? "Selecione um produto"
              : "Ver mockup"}
        </Button>
      )}
    </div>
  );
}
