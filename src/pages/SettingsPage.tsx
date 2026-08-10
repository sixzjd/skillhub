import { useEffect, useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { appInfo } from "../lib/tauri";
import type { VersionInfo } from "../lib/tauri";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { localeNames, type Locale } from "../i18n";

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    appInfo().then(setInfo).catch(() => setInfo(null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t.settings.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.language}</CardTitle>
          <CardDescription>简体中文 / 繁體中文 / English / 日本語</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(localeNames) as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  locale === l
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {localeNames[l]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.ssot}</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="rounded bg-zinc-100 px-2 py-1 text-sm dark:bg-zinc-800">
            {info?.ssot ?? "~/.agents/skills"}
          </code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.about}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            SkillHub {info?.version ?? "0.1.0"} — {t.app.tagline}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}