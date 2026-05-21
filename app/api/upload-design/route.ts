import { NextResponse } from "next/server";
import { uploadSchema } from "@/lib/validations/upload";
import { printful } from "@/lib/printful";
import { errorMessage } from "@/lib/utils";
import type { PrintfulFile } from "@/lib/printful";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = uploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  try {
    const data = await printful.post<{ result: PrintfulFile }>("/files", {
      type: "default",
      url: parsed.data.url,
      filename: parsed.data.filename,
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, "Erro ao enviar arquivo") }, { status: 500 });
  }
}
