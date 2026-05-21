import { ptBR, type Dictionary } from "@/messages/pt-BR";

export type { Dictionary };

export type Locale = "pt-BR";

const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": ptBR,
};

export function getDictionary(locale: Locale = "pt-BR"): Dictionary {
  return dictionaries[locale];
}
