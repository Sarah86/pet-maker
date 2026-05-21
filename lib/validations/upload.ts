import { z } from "zod";
import { hasAllowedHostname } from "@/lib/utils";

export const uploadSchema = z.object({
  url: z
    .string()
    .url({ message: "URL inválida" })
    .refine(
      (raw) => hasAllowedHostname(raw, ".supabase.co", ".amazonaws.com"),
      { message: "URL deve ser do Supabase Storage" }
    ),
  filename: z
    .string()
    .min(1, "Nome do arquivo é obrigatório")
    .max(255)
    .regex(/^[\w\-. ]+$/, "Nome de arquivo inválido"),
});

export type UploadInput = z.infer<typeof uploadSchema>;

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
