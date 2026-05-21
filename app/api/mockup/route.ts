import { NextResponse } from "next/server";
import { z } from "zod";
import { printful } from "@/lib/printful";
import { errorMessage, hasAllowedHostname } from "@/lib/utils";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import type { MockupTask } from "@/lib/printful";

export const maxDuration = 30;

const mockupSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  imageUrl: z
    .string()
    .url()
    .superRefine((val, ctx) => {
      if (!hasAllowedHostname(val, ".printful.com", ".supabase.co")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `imageUrl hostname not allowed: ${new URL(val).hostname}`,
        });
      }
    }),
});

interface Printfile {
  printfile_id: number;
  width: number;
  height: number;
  dpi: number;
  fill_mode: string;
}

interface PrintfilesResult {
  available_placements: Record<string, string>;
  printfiles: Printfile[];
  variant_printfiles: Array<{
    variant_id: number;
    placements: Record<string, number>;
  }>;
}

async function pollMockupTask(
  taskKey: string,
  attempts = 10
): Promise<MockupTask> {
  for (let i = 0; i < attempts; i++) {
    const data = await printful.get<{ result: MockupTask }>(
      `/mockup-generator/task?task_key=${taskKey}`
    );
    if (data.result.status === "completed") return data.result;
    if (data.result.status === "failed")
      throw new Error("Mockup generation failed");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Mockup task timed out");
}

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 5, 60_000)) return tooManyRequests();

  const body = await req.json();
  const parsed = mockupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { productId, variantId, imageUrl } = parsed.data;

  try {
    const { result: pf } = await printful.get<{ result: PrintfilesResult }>(
      `/mockup-generator/printfiles/${productId}`
    );

    const placement = Object.keys(pf.available_placements)[0] ?? "default";

    const variantPf = pf.variant_printfiles.find(
      (v) => v.variant_id === variantId
    );
    const printfileId =
      variantPf?.placements[placement] ?? pf.printfiles[0]?.printfile_id;
    const printfile =
      pf.printfiles.find((p) => p.printfile_id === printfileId) ??
      pf.printfiles[0];

    const position = printfile
      ? {
          area_width: printfile.width,
          area_height: printfile.height,
          width: printfile.width,
          height: printfile.height,
          top: 0,
          left: 0,
        }
      : undefined;

    const task = await printful.post<{ result: MockupTask }>(
      `/mockup-generator/create-task/${productId}`,
      {
        variant_ids: [variantId],
        files: [{ placement, image_url: imageUrl, position }],
        format: "jpg",
      }
    );

    const completed = await pollMockupTask(task.result.task_key);
    return NextResponse.json({ result: completed });
  } catch (err) {
    return NextResponse.json(
      { error: errorMessage(err, "Erro ao gerar mockup") },
      { status: 500 }
    );
  }
}
