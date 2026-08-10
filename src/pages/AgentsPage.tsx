import { useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { useScan } from "../hooks/useScan";
import { importFromPath } from "../lib/tauri";
import type { AgentScan } from "../lib/tauri";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";

export function AgentsPage() {
  const { t } = useI18n();
  const { data, loading, error, refresh } = useScan();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const toggleAgent = (key: string) =>
    setSelected((s) => ({ ...s, [key]: !s[key] }));

  const allInstalled = data?.agents.filter((a) => a.installed) ?? [];
  const allSelected = allInstalled.length > 0 && allInstalled.every((a) => selected[a.key]);
  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      allInstalled.forEach((a) => (next[a.key] = true));
      setSelected(next);
    }
  };

  const importSelected = async () => {
    if (!data) return;
    setBusy("import");
    const results: string[] = [];
    for (const agent of data.agents) {
      if (!selected[agent.key]) continue;
      for (const skill of agent.skills) {
        try {
          const r = await importFromPath(skill.path, skill.name);
          results.push(...r.imported.map((n) => `✅ ${n}`));
          results.push(...r.skipped.map((n) => `⏭ ${n}`));
        } catch (e) {
          results.push(`❌ ${skill.name}: ${e}`);
        }
      }
    }
    setNotice(results.join("\n") || t.common.empty);
    setBusy(null);
  };

  const visibleAgents = data?.agents.filter((a) => a.installed || a.skills.length > 0) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t.agents.title}</h1>
          <p className="text-sm text-zinc-500">{data?.agents.length ?? 0} agents detected</p>
        </div>
        <div className="flex gap-2">
          {visibleAgents.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {t.agents.selectAll}
            </Button>
          )}
          <Button size="sm" onClick={refresh} disabled={loading}>
            {loading ? t.agents.scanning : t.agents.scan}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="p-4 text-sm text-red-600 dark:text-red-300">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {visibleAgents.map((agent) => (
          <AgentCard
            key={agent.key}
            agent={agent}
            checked={!!selected[agent.key]}
            expanded={!!expanded[agent.key]}
            onToggleAgent={() => toggleAgent(agent.key)}
            onToggleExpand={() => setExpanded((e) => ({ ...e, [agent.key]: !e[agent.key] }))}
          />
        ))}
      </div>

      {visibleAgents.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-zinc-500">
            {t.common.empty}
          </CardContent>
        </Card>
      )}

      {visibleAgents.length > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <Button onClick={importSelected} disabled={busy === "import" || Object.keys(selected).length === 0}>
            {busy === "import" ? t.common.loading : t.agents.import}
          </Button>
        </div>
      )}

      {notice && (
        <Card>
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">{notice}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  checked,
  expanded,
  onToggleAgent,
  onToggleExpand,
}: {
  agent: AgentScan;
  checked: boolean;
  expanded: boolean;
  onToggleAgent: () => void;
  onToggleExpand: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card className={checked ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox checked={checked} onChange={onToggleAgent} aria-label={agent.display} />
            <CardTitle>{agent.display}</CardTitle>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                agent.installed
                  ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {agent.installed ? t.agents.installed : t.agents.notInstalled}
            </span>
          </div>
          <span className="text-xs text-zinc-400">{agent.skills.length} {t.agents.skills}</span>
        </div>
        {agent.skills_dir && (
          <CardDescription className="truncate" title={agent.skills_dir}>
            {agent.skills_dir}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {agent.skills.length > 0 ? (
          <>
            <button
              onClick={onToggleExpand}
              className="mb-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {expanded ? "▾" : "▸"} {t.agents.viewSkills}
            </button>
            {expanded && (
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {agent.skills.map((s) => (
                  <div
                    key={s.name}
                    className="rounded-md border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{s.name}</span>
                      {s.is_link && (
                        <span className="rounded bg-blue-100 px-1 text-[10px] text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                          link
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {s.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-zinc-400">{t.agents.empty}</p>
        )}
      </CardContent>
    </Card>
  );
}