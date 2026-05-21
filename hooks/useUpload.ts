"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDesignSession } from "@/store/useDesignSession";
import { ACCEPTED_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/validations/upload";
import { errorMessage } from "@/lib/utils";

interface UploadState {
  uploading: boolean;
  error: string | null;
  progress: number;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    error: null,
    progress: 0,
  });
  const { setFile } = useDesignSession();

  async function upload(file: File): Promise<boolean> {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setState((s) => ({ ...s, error: "Apenas PNG, JPG e SVG são aceitos" }));
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setState((s) => ({ ...s, error: "Arquivo muito grande (máx. 50 MB)" }));
      return false;
    }

    setState({ uploading: true, error: null, progress: 10 });

    try {
      const supabase = createClient();

      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("designs")
        .upload(path, file);

      if (uploadError) throw new Error(uploadError.message);

      setState((s) => ({ ...s, progress: 50 }));

      const { data: signed } = await supabase.storage
        .from("designs")
        .createSignedUrl(path, 3600);

      if (!signed?.signedUrl) throw new Error("Falha ao gerar URL do arquivo");

      setState((s) => ({ ...s, progress: 70 }));

      const res = await fetch("/api/upload-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: signed.signedUrl, filename: file.name }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Erro ao registrar arquivo no Printful");
      }

      const { result } = await res.json();
      setFile(signed.signedUrl, result.url);
      setState({ uploading: false, error: null, progress: 100 });
      return true;
    } catch (e) {
      setState({ uploading: false, error: errorMessage(e), progress: 0 });
      return false;
    }
  }

  return { ...state, upload };
}
