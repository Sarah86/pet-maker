import { z } from "zod";

export const uploadSchema = z.object({
  url: z.string().url("URL inválida"),
  filename: z.string().min(1, "Nome do arquivo é obrigatório"),
});

export type UploadInput = z.infer<typeof uploadSchema>;

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
