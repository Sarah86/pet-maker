"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { useUpload } from "@/hooks/useUpload";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download } from "lucide-react";
import { PartSelector } from "@/components/CatBuilder/PartSelector";
import { CatCanvas, type CatCanvasHandle } from "@/components/CatBuilder/CatCanvas";

type Variant = 1 | 2 | 3 | 4 | 5;

const VARIANTS = [1, 2, 3, 4, 5] as const satisfies readonly Variant[];

interface Selections {
  tail: Variant;
  body: Variant;
  nose: Variant;
  eyes: Variant;
}

const DEFAULT_SELECTIONS: Selections = { tail: 1, body: 1, nose: 1, eyes: 1 };

export default function CatBuilderPage() {
  const { catBuilder } = getDictionary();
  const router = useRouter();
  const { upload, uploading, error } = useUpload();
  const canvasRef = useRef<CatCanvasHandle>(null);
  const [selections, setSelections] = useState<Selections>(DEFAULT_SELECTIONS);

  function selectPart(category: keyof Selections, variant: Variant) {
    setSelections((prev) => ({ ...prev, [category]: variant }));
  }

  async function handleDownload() {
    const handle = canvasRef.current;
    if (!handle) return;
    const blob = await handle.exportBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cat-design.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUseDesign() {
    const handle = canvasRef.current;
    if (!handle) return;
    const blob = await handle.exportBlob();
    const file = new File([blob], "cat-design.png", { type: "image/png" });
    const ok = await upload(file);
    if (ok) router.push("/mockup");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">{catBuilder.title}</h1>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 space-y-6">
          <PartSelector
            category="body"
            label={catBuilder.categories.body}
            selected={selections.body}
            onSelect={(v) => selectPart("body", v)}
            variants={VARIANTS}
          />
          <PartSelector
            category="eyes"
            label={catBuilder.categories.eyes}
            selected={selections.eyes}
            onSelect={(v) => selectPart("eyes", v)}
            variants={VARIANTS}
          />
          <PartSelector
            category="nose"
            label={catBuilder.categories.nose}
            selected={selections.nose}
            onSelect={(v) => selectPart("nose", v)}
            variants={VARIANTS}
          />
          <PartSelector
            category="tail"
            label={catBuilder.categories.tail}
            selected={selections.tail}
            onSelect={(v) => selectPart("tail", v)}
            variants={VARIANTS}
          />
        </div>

        <div className="w-full md:w-64 flex-shrink-0">
          <CatCanvas
            ref={canvasRef}
            selections={selections}
            alt={catBuilder.canvasAlt}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{catBuilder.errorUpload}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleDownload} disabled={uploading}>
          <Download className="h-4 w-4 mr-2" />
          {catBuilder.download}
        </Button>
        <Button className="flex-1" onClick={handleUseDesign} disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {catBuilder.uploading}
            </>
          ) : (
            catBuilder.useDesign
          )}
        </Button>
      </div>
    </div>
  );
}
