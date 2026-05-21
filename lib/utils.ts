import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function errorMessage(err: unknown, fallback = "Erro desconhecido"): string {
  return err instanceof Error ? err.message : fallback;
}

export function hasAllowedHostname(raw: string, ...suffixes: string[]): boolean {
  try {
    const { hostname } = new URL(raw);
    return suffixes.some((s) => hostname.endsWith(s));
  } catch {
    return false;
  }
}
