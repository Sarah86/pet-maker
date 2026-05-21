import { create } from "zustand";

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

export const useDesignSession = create<DesignSession>((set) => ({
  ...initialState,
  setFile: (previewUrl, printfulFileUrl) => set({ previewUrl, printfulFileUrl }),
  setVariant: (selectedProductId, selectedVariantId, selectedProductName) =>
    set({ selectedProductId, selectedVariantId, selectedProductName }),
  setMockup: (mockupUrl) => set({ mockupUrl }),
  reset: () => set(initialState),
}));
