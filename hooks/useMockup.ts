"use client";

import { useCallback, useState } from "react";
import { useDesignSession } from "@/store/useDesignSession";

export function useMockup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { printfulFileUrl, selectedProductId, selectedVariantId, setMockup } =
    useDesignSession();

  const generateMockup = useCallback(async () => {
    if (!printfulFileUrl || !selectedVariantId || !selectedProductId) {
      setError("Selecione uma imagem e um produto primeiro");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          variantId: selectedVariantId,
          imageUrl: printfulFileUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao gerar mockup");
      }

      const { result } = data;
      const url = result.mockups?.[0]?.mockup_url ?? null;
      if (!url) throw new Error("Mockup não retornou imagem");

      setMockup(url);
      return url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar mockup");
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedProductId, selectedVariantId, setMockup, printfulFileUrl]);

  return { loading, error, generateMockup };
}
