import { useState } from "react";
import { Bot } from "lucide-react";
import { useI18n } from "../hooks/useI18n";
import { useScan } from "../hooks/useScan";
import { importFromPath, listLibrary, readSkillMdAt, deleteAgentSkill } from "../lib/tauri";
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
  const { data, loading, error: scanError, refresh } = useScan();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"import" | "update" | null>(null);
  const [notice, setNotice] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ name: string; content: string | null } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = scanError || localError;

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

  const doDeleteSkill = async (agentKey: string, name: string) => {
    if (!confirm(t.agents.deleteConfirm)) return;
    try {
      await deleteAgentSkill(agentKey, name);
      await refresh();
      await loadInstalled();
    } catch (e) {
      setLocalError(String(e));
    }
  };

  const doDeleteSelected = async () => {
    if (!confirm(t.agents.deleteSelectedConfirm)) return;
    setBusy("import");
    const results: string[] = [];
    for (const { agent, skill } of selectedSkills) {
      try {
        await deleteAgentSkill(agent.key, skill.name);
        results.push(`${agent.display}: ✅ ${skill.name}`);
      } catch (e) {
        results.push(`${agent.display}: ❌ ${skill.name} — ${String(e)}`);
      }
    }
    await refresh();
    await loadInstalled();
    setSelected(new Set());
    setNotice(results);
    setBusy(null);
  };

  const openInstallUrl = (url: string | null) => {
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-balance">{t.agents.title}</h1>
          <p className="text-sm text-[#8a7b6c] tabular-nums">{agents.length} {t.agents.count}</p>
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
            onDeleteSkill={doDeleteSkill}
            onInstall={openInstallUrl}
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
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Bot className="size-8 text-[#c9bbae] dark:text-[#5a4c40]" aria-hidden />
            <p className="text-sm text-[#8a7b6c]">{t.common.empty}</p>
            <Button variant="outline" size="sm" onClick={() => { void loadInstalled(); void refresh(); }}>
              {t.agents.scan}
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedSkills.length > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <Card className="flex items-center gap-4 rounded-full px-5 py-2 shadow-lg animate-slide-up">
            <span className="text-xs text-[#8a7b6c] tabular-nums">
              {selectedSkills.length} {t.agents.selected}
            </span>
            <Button variant="outline" size="sm" disabled={busy !== null || selInLib.length === 0} onClick={runUpdate}>
              {busy === "update" ? t.common.loading : t.agents.update}
            </Button>
            <Button variant="accent" size="sm" disabled={busy !== null || selNotInLib.length === 0} onClick={runImport}>
              {busy === "import" ? t.common.loading : t.agents.import}
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" disabled={busy !== null} onClick={doDeleteSelected}>
              {t.agents.delete}
            </Button>
          </Card>
        </div>
      )}

      {notice.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <pre className="whitespace-pre-wrap text-xs text-[#6a5a4e] dark:text-[#c0b4a8]">{notice.join("\n")}</pre>
          </CardContent>
        </Card>
      )}

      {preview && (
        <SkillPreview name={preview.name} content={preview.content} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function statusBadge(status: string, t: any): { label: string; cls: string; dot: string } {
  if (status === "installed")
    return {
      label: t.agents.installed,
      cls: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
      dot: "bg-green-500",
    };
  if (status === "remnant")
    return {
      label: t.agents.remnant,
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  return {
    label: t.agents.notInstalled,
    cls: "bg-[#ebe3da] text-[#8a7b6c] dark:bg-[#2e2520] dark:text-[#7a6b5c]",
    dot: "bg-[#b0a498]",
  };
}

function SkillRow({
  agent,
  skill,
  selected,
  installedNames,
  onToggle,
  onPreview,
  onImport,
  onDeleteSkill,
  t,
}: {
  agent: AgentScan;
  skill: SkillInfo;
  selected: Set<string>;
  installedNames: Set<string>;
  onToggle: (skill: SkillInfo) => void;
  onPreview: (name: string, path: string) => void;
  onImport: (skill: SkillInfo) => void;
  onDeleteSkill: (agentKey: string, name: string) => void;
  t: any;
}) {
  const checked = selected.has(skillKey(agent.key, skill.name));
  const inLib = installedNames.has(skill.name);
  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-2 transition-colors ${
        checked
          ? "border-[#c0543e] bg-[#c0543e]/5 dark:border-[#e07a64] dark:bg-[#c0543e]/10"
          : "border-[#e8dfd5] bg-[#faf6f1] dark:border-[#2e2520] dark:bg-[#1c1714]"
      }`}
    >
      <Checkbox checked={checked} onChange={() => onToggle(skill)} aria-label={skill.name} />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPreview(skill.name, skill.path); }}
        className="min-w-0 flex-1 text-left"
        title={t.agents.viewSkills}
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-medium underline-offset-2 hover:underline">{skill.name}</span>
          {skill.has_newer && (
            <span className="shrink-0 rounded bg-amber-100 px-1 text-[10px] text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              {t.agents.hasNewer}
            </span>
          )}
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
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[#8a7b6c] dark:text-[#7a6b5c]">{skill.description}</p>
        )}
      </button>
      <Button variant={inLib ? (skill.has_newer ? "accent" : "outline") : "ghost"} size="sm" onClick={(e) => { e.stopPropagation(); onImport(skill); }}>
        {inLib ? t.agents.update : "+"}
      </Button>
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDeleteSkill(agent.key, skill.name); }} aria-label={t.agents.delete} title={t.agents.delete}>
        <svg className="h-3.5 w-3.5 text-[#9a8b7c] hover:text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
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
  onDeleteSkill,
  onInstall,
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
  onDeleteSkill: (agentKey: string, name: string) => void;
  onInstall: (url: string) => void;
  installedNames: Set<string>;
  onImport: (skill: SkillInfo) => void;
  t: any;
}) {
  const badge = statusBadge(agent.status, t);
  return (
    <Card className={`transition-shadow duration-200 hover:shadow-md ${checked ? "ring-2 ring-[#c0543e] dark:ring-[#e07a64]" : ""}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox checked={checked} onChange={onToggleAgent} aria-label={agent.display} />
            <CardTitle>{agent.display}</CardTitle>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${badge.cls}`}>
              <span className={`size-1.5 rounded-full ${badge.dot}`} aria-hidden />
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {agent.status !== "installed" && agent.install_url && (
              <Button variant="outline" size="sm" onClick={() => onInstall(agent.install_url!)}>
                {t.agents.install}
              </Button>
            )}
            <span className="text-xs text-[#9a8b7c] tabular-nums">{agent.skills.length} {t.agents.skills}</span>
          </div>
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
              className="mb-2 text-xs text-[#8a7b6c] hover:text-[#5a4a3e] dark:hover:text-[#b0a498]"
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
                    onDeleteSkill={onDeleteSkill}
                    t={t}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-[#9a8b7c]">{t.agents.empty}</p>
        )}
      </CardContent>
    </Card>
  );
}