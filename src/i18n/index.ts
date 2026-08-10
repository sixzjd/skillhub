import { zhCN, type Messages } from "./zh-CN";
import { zhTW } from "./zh-TW";
import { en } from "./en";
import { ja } from "./ja";

export type Locale = "zh-CN" | "zh-TW" | "en" | "ja";

export const messages: Record<Locale, Messages> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  en,
  ja,
};

export const localeNames: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
};

export const defaultLocale: Locale = "zh-CN";

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem("skillhub-locale") as Locale | null;
    if (saved && saved in messages) return saved;
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith("zh")) {
      if (nav.includes("tw") || nav.includes("hk") || nav.includes("hant")) {
        return "zh-TW";
      }
      return "zh-CN";
    }
    if (nav.startsWith("ja")) return "ja";
    return "en";
  } catch {
    return defaultLocale;
  }
}

export type { Messages };