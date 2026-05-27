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
import { getDictionary } from "@/lib/i18n";

export default function MockupViewer() {
  const { mockupViewer } = getDictionary();
  const router = useRouter();
  const {
    mockupUrl,
    selectedProductName,
    selectedProductId,
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
    if (!printfulFileUrl || !selectedProductId || !selectedVariantId || !selectedProductName) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: printfulFileUrl,
          productId: selectedProductId,
          variantId: selectedVariantId,
          productName: selectedProductName,
          mockupUrl: mockupUrl ?? undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? mockupViewer.errorCheckout);

      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(
        e instanceof Error ? e.message : mockupViewer.errorUnknown
      );
      setCheckoutLoading(false);
    }
  }

  if (!previewUrl || !selectedVariantId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            {mockupViewer.emptyState}
          </p>
          <Button onClick={() => router.push("/cat-builder")}>
            {mockupViewer.goToUpload}
          </Button>
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
                {mockupViewer.generating}
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
                {mockupViewer.retry}
              </Button>
            </div>
          )}

          {mockupUrl && (
            <div className="space-y-4">
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <Image
                  src={mockupUrl}
                  alt={mockupViewer.imageAlt}
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
        <Button variant="outline" onClick={() => router.push("/cat-builder")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {mockupViewer.back}
        </Button>
        <Button
          className="flex-1"
          disabled={!mockupUrl || loading || checkoutLoading}
          onClick={handleCheckout}
        >
          {checkoutLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {mockupViewer.redirecting}
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {mockupViewer.checkout}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
