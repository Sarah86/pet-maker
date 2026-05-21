import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function errorMessage(err: unknown, fallback = "Erro desconhecido"): string {
  return err instanceof Error ? err.message : fallback;
}
