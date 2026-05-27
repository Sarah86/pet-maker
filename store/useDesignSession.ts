import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DesignSession {
  previewUrl: string | null;
  printfulFileUrl: string | null;
  selectedProductId: number | null;
  selectedVariantId: number | null;
  selectedProductName: string | null;
  mockupUrl: string | null;
  setFile: (previewUrl: string, printfulFileUrl: string) => void;
  setVariant: (productId: number, variantId: number, productName: string) => void;
  setMockup: (mockupUrl: string) => void;
  clearVariant: () => void;
  reset: () => void;
}

const initialState = {
  previewUrl: null,
  printfulFileUrl: null,
  selectedProductId: null,
  selectedVariantId: null,
  selectedProductName: null,
  mockupUrl: null,
};

export const useDesignSession = create<DesignSession>()(
  persist(
    (set) => ({
      ...initialState,
      setFile: (previewUrl, printfulFileUrl) => set({ previewUrl, printfulFileUrl, mockupUrl: null }),
      setVariant: (selectedProductId, selectedVariantId, selectedProductName) =>
        set({ selectedProductId, selectedVariantId, selectedProductName }),
      setMockup: (mockupUrl) => set({ mockupUrl }),
      clearVariant: () => set({ selectedProductId: null, selectedVariantId: null, selectedProductName: null }),
      reset: () => set(initialState),
    }),
    {
      name: "pet-maker-design-session",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ previewUrl, printfulFileUrl, selectedProductId, selectedVariantId, selectedProductName, mockupUrl }) => ({
        previewUrl,
        printfulFileUrl,
        selectedProductId,
        selectedVariantId,
        selectedProductName,
        mockupUrl,
      }),
    }
  )
);
