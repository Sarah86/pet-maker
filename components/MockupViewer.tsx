"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMockup } from "@/hooks/useMockup";
import { useDesignSession } from "@/store/useDesignSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ShoppingCart, RefreshCw, Loader2 } from "lucide-react";

export default function MockupViewer() {
  const router = useRouter();
  const {
    mockupUrl,
    selectedProductName,
    selectedVariantId,
    printfulFileUrl,
    previewUrl,
  } = useDesignSession();
  const { loading, error, generateMockup } = useMockup();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!mockupUrl && selectedVariantId && previewUrl) {
      generateMockup();
    }
  }, [previewUrl, generateMockup, mockupUrl, selectedVariantId]);

  async function handleCheckout() {
    if (!printfulFileUrl || !selectedVariantId || !selectedProductName) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: printfulFileUrl,
          variantId: selectedVariantId,
          productName: selectedProductName,
          mockupUrl: mockupUrl ?? undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Erro ao iniciar checkout");

      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Erro desconhecido");
      setCheckoutLoading(false);
    }
  }

  if (!previewUrl || !selectedVariantId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Envie uma imagem e selecione um produto para ver o mockup.
          </p>
          <Button onClick={() => router.push("/upload")}>Ir para upload</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          {loading && !mockupUrl && (
            <div className="space-y-3">
              <Skeleton className="w-full aspect-square rounded-lg" />
              <p className="text-sm text-muted-foreground text-center animate-pulse">
                Gerando mockup...
              </p>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => generateMockup()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}

          {mockupUrl && (
            <div className="space-y-4">
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <Image
                  src={mockupUrl}
                  alt="Mockup do produto"
                  fill
                  className="object-contain rounded-lg"
                  sizes="(max-width: 768px) 100vw, 448px"
                  priority
                />
              </div>
              {selectedProductName && (
                <p className="text-center text-sm font-medium">
                  {selectedProductName}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {checkoutError && (
        <Alert variant="destructive">
          <AlertDescription>{checkoutError}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          className="flex-1"
          disabled={!mockupUrl || loading || checkoutLoading}
          onClick={handleCheckout}
        >
          {checkoutLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Redirecionando...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Finalizar compra
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
