use crate::agent::{home_dir, ssot_skills_dir, AgentKind};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

/// 同步结果汇总
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SyncReport {
    pub ssot: String,
    pub targets: Vec<AgentSyncReport>,
    pub orphaned: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AgentSyncReport {
    pub key: String,
    pub linked: usize,
    pub copied: usize,
    pub skipped_builtin: usize,
    pub failed: usize,
    pub errors: Vec<String>,
    pub orphaned: Vec<String>,
}

/// 内部技能黑名单：各 agent skills 目录下的真实目录（非链接）名并集。
/// 这些是 agent 自带/内置技能，绝不外传、绝不覆盖。
fn builtin_skill_names(agent: AgentKind) -> HashSet<String> {
    let mut set = HashSet::new();
    let skills_dir = agent.detect();
    if let Some(dir) = skills_dir {
        if let Ok(entries) = fs::read_dir(&dir) {
            for e in entries.flatten() {
                let p = e.path();
                if p.is_symlink() {
                    continue; // 链接不算内置
                }
                if p.is_dir() {
                    if let Some(name) = p.file_name() {
                        set.insert(name.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    set
}

/// 获知 SSOT 里有哪些技能（目录名）
fn ssot_skill_names(ssot: &Path) -> Vec<String> {
    let mut names = Vec::new();
    if let Ok(entries) = fs::read_dir(ssot) {
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            if e.path().is_dir() {
                names.push(name);
            }
        }
    }
    names
}

/// 把一个目录复制为另一个目录（递归，跟随 symlink 安全处理）
fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&from, &to)?;
        } else if ty.is_symlink() {
            let target = fs::read_link(&from)?;
            #[cfg(unix)]
            std::os::unix::fs::symlink(&target, &to)?;
            #[cfg(windows)]
            std::os::windows::fs::symlink_dir(&target, &to).or_else(|_| std::os::windows::fs::symlink_file(&target, &to))?;
        } else {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

/// 把 SSOT 技能同步到单个 agent。
/// 策略：
///  - 跳过内置技能（agent 自带目录，绝不动）
///  - 优先 symlink，失败回退 copy
///  - 已存在同名目录/链接 → 备份到 ssot/.backup/ 后替换（内置除外）
///  - SSOT 里已删除、但 agent 里残留指向 ssot 的链接 → 移入废纸篓
///  - skills 非空时只同步指定的技能
pub fn sync_to_agent(agent: AgentKind, ssot: &Path, trash: &Path, skills: &[String], report: &mut AgentSyncReport) {
    let Some(skills_dir) = agent.detect() else {
        report.errors.push("agent 未安装或缺少 skills 目录".into());
        return;
    };
    let builtin = builtin_skill_names(agent);
    let mut ssot_names = ssot_skill_names(ssot);
    // 如果指定了技能列表，只同步这些
    if !skills.is_empty() {
        let filter: std::collections::HashSet<&str> = skills.iter().map(|s| s.as_str()).collect();
        ssot_names.retain(|n| filter.contains(n.as_str()));
    }

    fs::create_dir_all(&skills_dir).ok();

    // 1) 孤儿回收：agent 中指向 ssot 的链接，但源技能已从 ssot 删除 → 废纸篓
    if let Ok(entries) = fs::read_dir(&skills_dir) {
        for e in entries.flatten() {
            let path = e.path();
            if !path.is_symlink() {
                continue;
            }
            let Ok(target) = fs::read_link(&path) else { continue };
            let target = target.to_string_lossy().to_string();
            let canonical_ssot = ssot
                .canonicalize()
                .unwrap_or_else(|_| ssot.to_path_buf());
            let Ok(canonical_target) = PathBuf::from(&target).canonicalize() else {
                // 悬空链接（目标已不存在）→ 也是孤儿
                report.orphaned.push(path.to_string_lossy().to_string());
                move_to_trash(&path, trash, &format!("orphan-{}", agent.key()));
                continue;
            };
            if canonical_target.starts_with(&canonical_ssot) {
                let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if !ssot_names.contains(&name) {
                    report.orphaned.push(name.clone());
                    move_to_trash(&path, trash, &format!("orphan-{}", agent.key()));
                }
            }
        }
    }

    // 2) 同步 SSOT 技能
    for name in &ssot_names {
        // 内置技能：跳过（含 agent 里已存在的同名真实目录，绝不覆盖）
        if builtin.contains(name) {
            report.skipped_builtin += 1;
            continue;
        }

        let item = skills_dir.join(name);
        let src = ssot.join(name);

        // 已是指向 ssot 的正确链接 → 幂等
        if item.is_symlink() {
            if let Ok(t) = fs::read_link(&item) {
                if t == src || t == src.clone().canonicalize().unwrap_or(src.clone()) {
                    report.linked += 1;
                    continue;
                }
            }
        }

        // 已存在同名目录/链接 → 备份后移除
        if item.exists() || item.is_symlink() {
            let backup = ssot.join(format!(".backup/{}-{}-{}", agent.key(), name, now_stamp()));
            fs::create_dir_all(backup.parent().unwrap()).ok();
            let _ = fs::rename(&item, &backup);
        }

        // 创建链接（优先）→ 失败回退复制
        if symlink_dir(&src, &item).is_ok() {
            report.linked += 1;
        } else if copy_dir_all(&src, &item).is_ok() {
            report.copied += 1;
        } else {
            report.failed += 1;
            report.errors.push(format!("无法同步 {name}: 链接与复制均失败"));
        }
    }
}

/// 创建指向目录的符号链接（跨平台）
fn symlink_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(src, dst)
    }
    #[cfg(windows)]
    {
        // Windows 需要目录链接或用 junction
        std::os::windows::fs::symlink_dir(src, dst)
    }
}

/// 移动到废纸篓（macOS ~/.Trash；Windows 用回收站 API 的 fallback 是改名 .trash）
fn move_to_trash(path: &Path, trash: &Path, prefix: &str) {
    if let Some(name) = path.file_name() {
        let dest = trash.join(format!("{}-{}-{}", prefix, name.to_string_lossy(), now_stamp()));
        fs::create_dir_all(trash).ok();
        let _ = fs::rename(path, &dest);
    }
}

fn now_stamp() -> String {
    chrono::Local::now().format("%Y%m%d%H%M%S").to_string()
}

/// 主同步入口：把 SSOT 同步到指定的 agent 集合
/// skills: 如果非空，只同步这些技能；如果为空，同步全部
pub fn run_sync(target_keys: &[String], skills: &[String]) -> SyncReport {
    let ssot = ssot_skills_dir();
    let trash = home_dir().join(".Trash");
    let mut report = SyncReport {
        ssot: ssot.to_string_lossy().to_string(),
        ..Default::default()
    };

    if !ssot.exists() {
        report
            .targets
            .push(AgentSyncReport {
                key: "ssot".into(),
                errors: vec!["~/.agents/skills 不存在，请先扫描或导入技能".into()],
                ..Default::default()
            });
        return report;
    }

    for key in target_keys {
        if let Some(kind) = agent_from_key(key) {
            let mut agent_report = AgentSyncReport {
                key: key.clone(),
                ..Default::default()
            };
            sync_to_agent(kind, &ssot, &trash, skills, &mut agent_report);
            report.orphaned.extend(agent_report.orphaned.iter().cloned());
            report.targets.push(agent_report);
        }
    }
    report
}

/// key → AgentKind
pub fn agent_from_key(key: &str) -> Option<AgentKind> {
    crate::agent::all_agents()
        .into_iter()
        .find(|a| a.key() == key)
}

/// 列出某个 agent 可写的 skills 目录（用于前端展示当前生效目录）
pub fn agent_skills_dir(key: &str) -> Option<String> {
    agent_from_key(key)?.detect().map(|p| p.to_string_lossy().to_string())
}

/// 删除某 agent 里的技能：
///  - 若是指针（符号链接）→ 取消指针（unlink）
///  - 若是真实目录 → 移入 app 回收站（记录归属）
/// 返回 "unlinked" 或 "trashed:<id>"
pub fn delete_agent_skill(agent_key: &str, name: &str) -> Result<String, String> {
    let kind = agent_from_key(agent_key).ok_or_else(|| "未知 agent".to_string())?;
    let skills_dir = kind.detect().ok_or_else(|| "agent 未安装或缺少 skills 目录".to_string())?;
    let path = skills_dir.join(name);
    if !path.exists() && !path.is_symlink() {
        return Err(format!("技能不存在: {name}"));
    }
    if path.is_symlink() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        return Ok("unlinked".into());
    }
    let item = crate::trash::move_to_trash("agent", Some(agent_key), name, &path)
        .map_err(|e| e.to_string())?;
    Ok(format!("trashed:{}", item.id))
}