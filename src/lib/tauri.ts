import { invoke } from "@tauri-apps/api/core";

// ---------- 类型（与 Rust 侧对应） ----------
export interface SkillInfo {
  name: string;
  path: string;
  is_link: boolean;
  has_skill_md: boolean;
  description: string;
}

export interface AgentScan {
  key: string;
  display: string;
  installed: boolean;
  skills_dir: string | null;
  skills: SkillInfo[];
}

export interface ScanResult {
  agents: AgentScan[];
}

export interface LibrarySkill {
  name: string;
  path: string;
  description: string;
  has_skill_md: boolean;
  size_bytes: number;
}

export interface SyncReport {
  ssot: string;
  targets: AgentSyncReport[];
  orphaned: string[];
}

export interface AgentSyncReport {
  key: string;
  linked: number;
  copied: number;
  skipped_builtin: number;
  failed: number;
  errors: string[];
}

export interface Marketplace {
  id: string;
  name: string;
  owner: string;
  repo: string;
  description: string;
  url: string;
  official: boolean;
}

export interface MarketSkill {
  name: string;
  description: string;
  source: string;
  repo: string;
  url: string;
  installed: boolean;
}

export interface VersionInfo {
  version: string;
  ssot: string;
}

// ---------- commands ----------
export const scanAll = () => invoke<ScanResult>("scan_all");
export const listLibrary = () => invoke<LibrarySkill[]>("list_library");
export const importFromPath = (src: string, name: string) =>
  invoke<{ imported: string[]; skipped: string[] }>("import_from_path", { src, name });
export const removeFromLibrary = (name: string) =>
  invoke<void>("remove_from_library", { name });
export const runSync = (targetKeys: string[]) =>
  invoke<SyncReport>("run_sync", { targetKeys });
export const agentSkillsDir = (key: string) =>
  invoke<string | null>("agent_skills_dir", { key });
export const defaultMarketplaces = () =>
  invoke<Marketplace[]>("default_marketplaces");
export const fetchMarketSkills = (market: Marketplace) =>
  invoke<MarketSkill[]>("fetch_market_skills", { market });
export const installMarketSkill = (market: Marketplace, skillSource: string, targetDir: string) =>
  invoke<void>("install_market_skill", { market, skillSource, targetDir });
export const appInfo = () => invoke<VersionInfo>("app_info");