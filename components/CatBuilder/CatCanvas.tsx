"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type Variant = 1 | 2 | 3 | 4 | 5;

interface Selections {
  tail: Variant;
  body: Variant;
  nose: Variant;
  eyes: Variant;
}

export interface CatCanvasHandle {
  exportBlob: () => Promise<Blob>;
}

interface CatCanvasProps {
  selections: Selections;
  alt: string;
}

const CANVAS_SIZE = 512;
const LAYER_ORDER: Array<keyof Selections> = ["tail", "body", "eyes", "nose"];

interface LayerConfig {
  scale: number;
  dx: number;
  dy: number;
}

const LAYER_CONFIG: Record<keyof Selections, LayerConfig> = {
  body: { scale: 1.0, dx: 0, dy: 0 },
  tail: { scale: 0.7, dx: 140, dy: 70 },
  eyes: { scale: 0.65, dx: 0, dy: -60 },
  nose: { scale: 0.4, dx: 0, dy: -10 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawLayers(
  ctx: CanvasRenderingContext2D,
  selections: Selections,
  isCancelled: () => boolean
): Promise<void> {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  for (const layer of LAYER_ORDER) {
    if (isCancelled()) return;
    const src = `/cat-parts/${layer}/${layer}_${selections[layer]}.png`;
    const img = await loadImage(src);
    if (isCancelled()) return;
    const { scale, dx, dy } = LAYER_CONFIG[layer];
    const size = Math.round(CANVAS_SIZE * scale);
    const x = Math.round((CANVAS_SIZE - size) / 2 + dx);
    const y = Math.round((CANVAS_SIZE - size) / 2 + dy);
    ctx.drawImage(img, x, y, size, size);
  }
}

export const CatCanvas = forwardRef<CatCanvasHandle, CatCanvasProps>(
  function CatCanvas({ selections, alt }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
      exportBlob(): Promise<Blob> {
        return new Promise((resolve, reject) => {
          const canvas = canvasRef.current;
          if (!canvas) {
            reject(new Error("Canvas not mounted"));
            return;
          }
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("toBlob returned null"));
              return;
            }
            resolve(blob);
          }, "image/png");
        });
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      let cancelled = false;
      drawLayers(ctx, selections, () => cancelled).catch(() => {});
      return () => { cancelled = true; };
    }, [selections]);

    return (
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        aria-label={alt}
        className="rounded-xl border border-border w-full max-w-[512px] aspect-square"
      />
    );
  }
);
