import { NextResponse } from "next/server";

const store = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const raw = store.get(key) ?? [];
  const hits = raw.filter((t) => t > cutoff);

  if (hits.length >= limit) {
    if (hits.length < raw.length) store.set(key, hits);
    return false;
  }

  hits.push(now);
  store.set(key, hits);
  return true;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function tooManyRequests() {
  return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
}
