import { z } from "zod";

export const orderSchema = z.object({
  variantId: z.number().int().positive(),
  fileId: z.string().min(1),
  recipientName: z.string().min(2, "Nome completo é obrigatório"),
  recipientEmail: z.string().email("E-mail inválido"),
  address1: z.string().min(5, "Endereço é obrigatório"),
  address2: z.string().optional(),
  city: z.string().min(2, "Cidade é obrigatória"),
  stateCode: z.string().length(2, "Estado deve ter 2 letras"),
  zip: z.string().min(8, "CEP inválido"),
  quantity: z.number().int().min(1).max(10).default(1),
});

export type OrderInput = z.infer<typeof orderSchema>;
