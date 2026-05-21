"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUpload } from "@/hooks/useUpload";
import { useDesignSession } from "@/store/useDesignSession";
import { ACCEPTED_TYPES } from "@/lib/validations/upload";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const { upload, uploading, error, progress } = useUpload();
  const { previewUrl, selectedVariantId } = useDesignSession();
  const router = useRouter();

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const ok = await upload(files[0]);
      if (ok && selectedVariantId) router.push("/mockup");
    },
    [upload, selectedVariantId, router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="space-y-3">
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors text-center",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/40"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          className="sr-only"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />
        {previewUrl ? (
          <div className="relative w-full aspect-square max-w-[180px]">
            <Image
              src={previewUrl}
              alt="Design enviado"
              fill
              className="object-contain rounded-md"
              sizes="180px"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="rounded-full bg-muted p-3">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Arraste sua imagem aqui</p>
              <p className="text-xs">ou clique para selecionar</p>
              <p className="text-xs mt-1">PNG, JPG, SVG · máx. 50 MB</p>
            </div>
          </div>
        )}
      </label>

      {uploading && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">Enviando... {progress}%</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {previewUrl && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          Trocar imagem
        </Button>
      )}
    </div>
  );
}
