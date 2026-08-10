mod agent;
mod library;
mod market;
mod sync;

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

/// 从本地库移除技能（移入废纸篓）
#[tauri::command]
fn remove_from_library(name: String) -> Result<(), String> {
    library::remove_from_library(&name).map_err(|e| e.to_string())
}

/// 同步 SSOT 到指定 agent
#[tauri::command]
fn run_sync(target_keys: Vec<String>) -> sync::SyncReport {
    sync::run_sync(&target_keys)
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

/// 拉取市场技能
#[tauri::command]
fn fetch_market_skills(market: market::Marketplace) -> Result<Vec<market::MarketSkill>, String> {
    market::fetch_market_skills(&market)
}

/// 安装市场技能到本地库
#[tauri::command]
fn install_market_skill(
    market: market::Marketplace,
    skill_source: String,
    target_dir: String,
) -> Result<(), String> {
    market::install_market_skill(&market, &skill_source, &target_dir)
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
            remove_from_library,
            run_sync,
            agent_skills_dir,
            default_marketplaces,
            fetch_market_skills,
            install_market_skill,
            app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}