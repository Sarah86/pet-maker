"use client";

import { useState, useEffect } from "react";
import { errorMessage } from "@/lib/utils";
import type { PrintfulProduct } from "@/lib/printful/printful";

const MUG_PRODUCT_NUMBER = 19;

export function useCatalog() {
  const [products, setProducts] = useState<PrintfulProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/catalog");
        if (!res.ok) throw new Error("Falha ao carregar catálogo");
        const data: { result: PrintfulProduct[] } = await res.json();
        const filtered = data.result.filter((p) => p.id === MUG_PRODUCT_NUMBER);
        setProducts(filtered);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  return { products, loading, error };
}
