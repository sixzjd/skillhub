mod agent;
mod library;
mod market;
mod sync;
mod trash;

use serde::Serialize;

// ---------- Tauri commands ----------

/// 扫描所有 agent 及技能
#[tauri::command]
fn scan_all() -> agent::ScanResult {
    agent::scan_all()
}

/// 列出本地库（SSOT ~/.agents/skills）技能
#[tauri::command]
fn list_library() -> Vec<library::LibrarySkill> {
    library::list_library()
}

/// 把某个目录导入本地库
#[tauri::command]
fn import_from_path(src: String, name: String) -> library::ImportResult {
    library::import_from_path(&src, &name)
}

/// 读取本地库技能的 SKILL.md（预览）
#[tauri::command]
fn read_skill_md(name: String) -> Result<String, String> {
    library::read_skill_md(&name)
}

/// 读取任意技能目录的 SKILL.md（预览 agent/市场侧技能）
#[tauri::command]
fn read_skill_md_at(path: String) -> Result<String, String> {
    library::read_skill_md_at(&path)
}

/// 从本地库移除技能（移入废纸篓）
#[tauri::command]
fn remove_from_library(name: String) -> Result<(), String> {
    library::remove_from_library(&name).map_err(|e| e.to_string())
}

/// 同步 SSOT 到指定 agent（skills 为空则同步全部）
#[tauri::command]
fn run_sync(target_keys: Vec<String>, skills: Vec<String>) -> sync::SyncReport {
    sync::run_sync(&target_keys, &skills)
}

/// 列出某 agent 的 skills 目录
#[tauri::command]
fn agent_skills_dir(key: String) -> Option<String> {
    sync::agent_skills_dir(&key)
}

/// 默认市场列表
#[tauri::command]
fn default_marketplaces() -> Vec<market::Marketplace> {
    market::default_marketplaces()
}

/// 全部市场（默认 + 自定义）
#[tauri::command]
fn list_all_markets() -> Vec<market::Marketplace> {
    market::list_all_markets()
}

/// 添加自定义市场
#[tauri::command]
fn add_market(owner: String, repo: String) -> Result<market::Marketplace, String> {
    market::add_market(&owner, &repo)
}

/// 删除自定义市场
#[tauri::command]
fn remove_market(id: String) -> Result<(), String> {
    market::remove_market(&id)
}

/// 拉取市场技能
#[tauri::command]
async fn fetch_market_skills(market: market::Marketplace) -> Result<Vec<market::MarketSkill>, String> {
    market::fetch_market_skills(&market).await
}

/// 安装市场技能到本地库
#[tauri::command]
async fn install_market_skill(
    market: market::Marketplace,
    skill_source: String,
    target_dir: String,
) -> Result<(), String> {
    market::install_market_skill(&market, &skill_source, &target_dir).await
}

/// 回收站：列出全部条目
#[tauri::command]
fn list_trash() -> Vec<trash::TrashItem> {
    trash::list_trash()
}

/// 回收站：恢复指定条目
#[tauri::command]
fn restore_trash_item(id: String) -> Result<(), String> {
    trash::restore_trash(&id)
}

/// 回收站：清空（物理删除）
#[tauri::command]
fn empty_trash() -> Result<(), String> {
    trash::empty_trash()
}

/// 删除某 agent 里的技能（指针→unlink，真实目录→回收站）
#[tauri::command]
fn delete_agent_skill(agent_key: String, name: String) -> Result<String, String> {
    crate::sync::delete_agent_skill(&agent_key, &name)
}

/// 版本信息
#[derive(Serialize)]
struct VersionInfo {
    version: String,
    ssot: String,
}

#[tauri::command]
fn app_info() -> VersionInfo {
    VersionInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        ssot: agent::ssot_skills_dir().to_string_lossy().to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_all,
            list_library,
            import_from_path,
            read_skill_md,
            read_skill_md_at,
            remove_from_library,
            run_sync,
            agent_skills_dir,
            default_marketplaces,
            list_all_markets,
            add_market,
            remove_market,
            fetch_market_skills,
            install_market_skill,
            list_trash,
            restore_trash_item,
            empty_trash,
            delete_agent_skill,
            app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}