import { useState } from "react";
import { useI18n } from "../hooks/useI18n";
import { useScan } from "../hooks/useScan";
import { importFromPath, listLibrary, readSkillMdAt } from "../lib/tauri";
import type { AgentScan, SkillInfo } from "../lib/tauri";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { SkillPreview } from "../components/SkillPreview";

function skillKey(agent: string, skill: string) {
  return `${agent}/${skill}`;
}

export function AgentsPage() {
  const { t } = useI18n();
  const { data, loading, error, refresh } = useScan();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"import" | "update" | null>(null);
  const [notice, setNotice] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ name: string; content: string | null } | null>(null);

  const agents = data?.agents ?? [];

  const loadInstalled = async () => {
    try {
      const lib = await listLibrary();
      setInstalledNames(new Set(lib.map((s) => s.name)));
    } catch {
      /* ignore */
    }
  };

  const installedAgents = agents.filter((a) => a.installed);

  const toggleSkill = (agent: AgentScan, skill: SkillInfo) =>
    setSelected((s) => {
      const next = new Set(s);
      const key = skillKey(agent.key, skill.name);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const agentAllSelected = (agent: AgentScan) =>
    agent.skills.length > 0 &&
    agent.skills.every((sk) => selected.has(skillKey(agent.key, sk.name)));

  const toggleAgent = (agent: AgentScan) =>
    setSelected((s) => {
      const next = new Set(s);
      const all = agentAllSelected(agent);
      for (const sk of agent.skills) {
        const key = skillKey(agent.key, sk.name);
        if (all) next.delete(key);
        else next.add(key);
      }
      return next;
    });

  const allSelected = installedAgents.length > 0 && installedAgents.every((a) => agentAllSelected(a));
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      for (const a of agents) {
        if (!a.installed) continue;
        for (const sk of a.skills) {
          const key = skillKey(a.key, sk.name);
          if (allSelected) next.delete(key);
          else next.add(key);
        }
      }
      return next;
    });

  const selectedSkills: { agent: AgentScan; skill: SkillInfo }[] = [];
  for (const a of agents) {
    for (const sk of a.skills) {
      if (selected.has(skillKey(a.key, sk.name))) selectedSkills.push({ agent: a, skill: sk });
    }
  }
  const selInLib = selectedSkills.filter((s) => installedNames.has(s.skill.name));
  const selNotInLib = selectedSkills.filter((s) => !installedNames.has(s.skill.name));

  const doImport = async (list: { agent: AgentScan; skill: SkillInfo }[], resetBusy: () => void) => {
    setNotice([]);
    const results: string[] = [];
    for (const { agent, skill } of list) {
      try {
        const r = await importFromPath(skill.path, skill.name);
        results.push(...r.imported.map((n) => `${agent.display}: ✅ ${n}`));
        results.push(...r.skipped.map((n) => `${agent.display}: ⏭ ${n}`));
      } catch (e) {
        results.push(`${agent.display}: ❌ ${skill.name} — ${String(e)}`);
      }
    }
    await loadInstalled();
    setNotice(results);
    resetBusy();
  };

  const runImport = () => {
    if (selNotInLib.length === 0) return;
    setBusy("import");
    void doImport(selNotInLib, () => setBusy(null));
  };

  const runUpdate = () => {
    if (selInLib.length === 0) return;
    setBusy("update");
    void doImport(selInLib, () => setBusy(null));
  };

  const openPreview = async (name: string, path: string) => {
    setPreview({ name, content: null });
    try {
      const content = await readSkillMdAt(path);
      setPreview({ name, content });
    } catch (e) {
      setPreview({ name, content: String(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t.agents.title}</h1>
          <p className="text-sm text-zinc-500">{agents.length} agents</p>
        </div>
        <div className="flex gap-2">
          {installedAgents.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {t.agents.selectAll}
            </Button>
          )}
          <Button size="sm" onClick={() => { void loadInstalled(); void refresh(); }} disabled={loading}>
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
        {agents.map((agent) => (
          <AgentCard
            key={agent.key}
            agent={agent}
            checked={agentAllSelected(agent)}
            expanded={!!expanded[agent.key]}
            onToggleAgent={() => toggleAgent(agent)}
            onToggleExpand={() => setExpanded((e) => ({ ...e, [agent.key]: !e[agent.key] }))}
            selected={selected}
            onToggleSkill={(skill) => toggleSkill(agent, skill)}
            onPreview={openPreview}
            installedNames={installedNames}
            onImport={async (skill) => {
              await importFromPath(skill.path, skill.name);
              await loadInstalled();
            }}
            t={t}
          />
        ))}
      </div>

      {agents.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-zinc-500">{t.common.empty}</CardContent>
        </Card>
      )}

      {selectedSkills.length > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <Card className="flex items-center gap-4 px-4 py-2 shadow-lg">
            <span className="text-xs text-zinc-500">{selectedSkills.length} selected</span>
            <Button variant="outline" size="sm" disabled={busy !== null || selInLib.length === 0} onClick={runUpdate}>
              {busy === "update" ? t.common.loading : t.agents.update}
            </Button>
            <Button variant="accent" size="sm" disabled={busy !== null || selNotInLib.length === 0} onClick={runImport}>
              {busy === "import" ? t.common.loading : t.agents.import}
            </Button>
          </Card>
        </div>
      )}

      {notice.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">{notice.join("\n")}</pre>
          </CardContent>
        </Card>
      )}

      {preview && (
        <SkillPreview name={preview.name} content={preview.content} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function statusBadge(status: string, t: any): { label: string; cls: string } {
  if (status === "installed")
    return { label: t.agents.installed, cls: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" };
  if (status === "remnant")
    return { label: t.agents.remnant, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" };
  return { label: t.agents.notInstalled, cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" };
}

function SkillRow({
  agent,
  skill,
  selected,
  installedNames,
  onToggle,
  onPreview,
  onImport,
  t,
}: {
  agent: AgentScan;
  skill: SkillInfo;
  selected: Set<string>;
  installedNames: Set<string>;
  onToggle: (skill: SkillInfo) => void;
  onPreview: (name: string, path: string) => void;
  onImport: (skill: SkillInfo) => void;
  t: any;
}) {
  const checked = selected.has(skillKey(agent.key, skill.name));
  const inLib = installedNames.has(skill.name);
  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-2 transition-colors ${
        checked
          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
          : "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <Checkbox checked={checked} onChange={() => onToggle(skill)} aria-label={skill.name} />
      <button
        onClick={() => onPreview(skill.name, skill.path)}
        className="min-w-0 flex-1 text-left"
        title={t.agents.viewSkills}
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-medium underline-offset-2 hover:underline">{skill.name}</span>
          {skill.is_link && (
            <span className="shrink-0 rounded bg-blue-100 px-1 text-[10px] text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
              link
            </span>
          )}
          {inLib && (
            <span
              className="shrink-0 rounded bg-green-100 px-1 text-[10px] text-green-700 dark:bg-green-900/50 dark:text-green-300"
              title={t.library.title}
            >
              lib
            </span>
          )}
        </div>
        {skill.description && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">{skill.description}</p>
        )}
      </button>
      <Button variant={inLib ? "outline" : "ghost"} size="sm" onClick={() => onImport(skill)}>
        {inLib ? t.agents.update : "+"}
      </Button>
    </div>
  );
}

function AgentCard({
  agent,
  checked,
  expanded,
  onToggleAgent,
  onToggleExpand,
  selected,
  onToggleSkill,
  onPreview,
  installedNames,
  onImport,
  t,
}: {
  agent: AgentScan;
  checked: boolean;
  expanded: boolean;
  onToggleAgent: () => void;
  onToggleExpand: () => void;
  selected: Set<string>;
  onToggleSkill: (skill: SkillInfo) => void;
  onPreview: (name: string, path: string) => void;
  installedNames: Set<string>;
  onImport: (skill: SkillInfo) => void;
  t: any;
}) {
  const badge = statusBadge(agent.status, t);
  return (
    <Card className={checked ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox checked={checked} onChange={onToggleAgent} aria-label={agent.display} />
            <CardTitle>{agent.display}</CardTitle>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${badge.cls}`}>{badge.label}</span>
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
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {agent.skills.map((s) => (
                  <SkillRow
                    key={s.name}
                    agent={agent}
                    skill={s}
                    selected={selected}
                    installedNames={installedNames}
                    onToggle={onToggleSkill}
                    onPreview={onPreview}
                    onImport={onImport}
                    t={t}
                  />
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