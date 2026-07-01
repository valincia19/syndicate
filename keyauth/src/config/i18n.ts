import en from "./locales/en.json";
import id from "./locales/id.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";

export type Language = "EN" | "ID" | "FR" | "JA";

export type Dictionary = typeof en;
export type DictionaryKey = keyof typeof en;

export const dictionaries: Record<Language, Dictionary> = {
  EN: en,
  ID: id,
  FR: fr,
  JA: ja,
};

export const languageNames: Record<Language, string> = {
  EN: "English",
  ID: "Bahasa",
  FR: "Français",
  JA: "日本語",
};
