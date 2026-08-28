use crate::agent::ssot_skills_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// 本地库（SSOT）中的技能条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibrarySkill {
    pub name: String,
    pub path: String,
    pub description: String,
    pub has_skill_md: bool,
    pub size_bytes: u64,
    /// 是否存在更新的源（某个已安装 agent 的同名真实目录比库新）
    pub has_newer: bool,
    /// 更新的源来自哪个 agent（display 名）
    pub source: String,
}

/// 导入结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: Vec<String>,
    pub skipped: Vec<String>,
}

/// 列出本地库技能（~/.agents/skills/ 下的目录，排除隐藏项/.backup）
pub fn list_library() -> Vec<LibrarySkill> {
    let ssot = ssot_skills_dir();
    let mut out = Vec::new();
    if let Ok(entries) = fs::read_dir(&ssot) {
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let p = e.path();
            if !p.is_dir() {
                continue;
            }
            let has_md = p.join("SKILL.md").exists();
            let desc = read_desc(&p.join("SKILL.md"));
            let size = dir_size(&p);
            let (has_newer, source) = newer_source(&p, &name);
            out.push(LibrarySkill {
                name,
                path: p.to_string_lossy().to_string(),
                description: desc,
                has_skill_md: has_md,
                size_bytes: size,
                has_newer,
                source,
            });
        }
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

fn read_desc(skill_md: &Path) -> String {
    let Ok(c) = fs::read_to_string(skill_md) else { return String::new() };
    let mut in_fm = false;
    let mut fm_lines = Vec::new();
    let mut fm_end = 0usize;
    let lines: Vec<&str> = c.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        let t = line.trim();
        if i == 0 && t == "---" {
            in_fm = true;
            continue;
        }
        if in_fm && t == "---" {
            fm_end = i + 1;
            break;
        }
        if in_fm {
            fm_lines.push(t);
        }
    }
    for l in &fm_lines {
        if let Some(v) = l.strip_prefix("description:").or_else(|| l.strip_prefix("desc:")) {
            return v.trim().trim_matches('"').to_string();
        }
    }
    for line in lines.iter().skip(fm_end) {
        let t = line.trim();
        if !t.is_empty() && !t.starts_with('#') && !t.starts_with("---") {
            return t.chars().take(200).collect();
        }
    }
    String::new()
}

/// 判断库技能是否有更新的源：扫描已安装 agent 的 skills 目录里同名真实目录，
/// 若任一新于库目录本身，则返回 (true, agent display)。
/// 新旧比较用递归的"最新内容修改时间"（目录 mtime 对深层文件改动不敏感）。
fn newer_source(lib_dir: &Path, name: &str) -> (bool, String) {
    let lib_time = crate::agent::newest_mtime(lib_dir);
    let mut best: Option<(String, std::time::SystemTime)> = None;
    for kind in crate::agent::all_agents() {
        let Some(skills_dir) = kind.skills_dir() else { continue };
        let p = skills_dir.join(name);
        if !p.is_symlink() && p.is_dir() {
            if let Some(t) = crate::agent::newest_mtime(&p) {
                if best.as_ref().map(|(_, bt)| t > *bt).unwrap_or(true) {
                    best = Some((kind.display().to_string(), t));
                }
            }
        }
    }
    match (lib_time, best) {
        (Some(lt), Some((disp, st))) => (st > lt, disp),
        _ => (false, String::new()),
    }
}

fn dir_size(p: &Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(p) {
        for e in entries.flatten() {
            let ep = e.path();
            if ep.is_dir() {
                total += dir_size(&ep);
            } else if let Ok(md) = ep.metadata() {
                total += md.len();
            }
        }
    }
    total
}

/// 把一个已存在的技能目录导入本地库（复制进 ~/.agents/skills/）
pub fn import_from_path(src: &str, name: &str) -> ImportResult {
    let ssot = ssot_skills_dir();
    fs::create_dir_all(&ssot).ok();
    let src_p = Path::new(src);
    let dst = ssot.join(name);
    let mut result = ImportResult {
        imported: Vec::new(),
        skipped: Vec::new(),
    };
    if !src_p.is_dir() {
        result.skipped.push(format!("{name}: 源目录不存在"));
        return result;
    }
    // 已有同名 → 覆盖（先移入备份目录再复制，保证"更新"语义）
    if dst.exists() {
        let backup = ssot.join(format!(".backup/{}-{}-{}", name, "import", chrono::Local::now().format("%Y%m%d%H%M%S")));
        fs::create_dir_all(backup.parent().unwrap()).ok();
        let _ = fs::rename(&dst, &backup);
    }
    copy_dir_all(src_p, &dst).ok();
    // 从 agent 导入会覆盖市场安装的内容：清掉可能残留的市场来源元数据
    let _ = std::fs::remove_file(dst.join(".skillhub-meta.json"));
    prune_old_backups(&ssot, 30);
    // 导入后把源 agent 的真实目录转成指向库的链接（省空间、统一管理）
    crate::agent::dedupe_agent_source(src_p, name);
    result.imported.push(name.to_string());
    result
}

/// 清理 .backup 里超过 keep_days 的旧备份，防止无限膨胀
fn prune_old_backups(ssot: &Path, keep_days: u64) {
    let backup_dir = ssot.join(".backup");
    let Ok(entries) = fs::read_dir(&backup_dir) else { return };
    let cutoff = std::time::SystemTime::now()
        .checked_sub(std::time::Duration::from_secs(keep_days * 86400));
    let Some(cutoff) = cutoff else { return };
    for e in entries.flatten() {
        let Ok(md) = e.metadata() else { continue };
        let Ok(m) = md.modified() else { continue };
        if m < cutoff {
            let _ = if md.is_dir() {
                fs::remove_dir_all(e.path())
            } else {
                fs::remove_file(e.path())
            };
        }
    }
}

/// 读取本地库技能的 SKILL.md 内容（供前端预览）
pub fn read_skill_md(name: &str) -> Result<String, String> {
    let ssot = ssot_skills_dir();
    let item = ssot.join(name);
    let md = item.join("SKILL.md");
    if !md.exists() {
        // 回退：列出目录里存在的 .md（如 README.md）
        if let Ok(entries) = fs::read_dir(&item) {
            for e in entries.flatten() {
                let p = e.path();
                if p.is_file() && p.extension().is_some_and(|e| e == "md") {
                    if let Ok(c) = fs::read_to_string(&p) {
                        return Ok(format!("⚠ 未找到 SKILL.md，展示 {}\n\n{}", p.file_name().unwrap_or_default().to_string_lossy(), c));
                    }
                }
            }
        }
        return Err(format!("{name} 目录下没有 SKILL.md"));
    }
    fs::read_to_string(&md).map_err(|e| e.to_string())
}

/// 读取任意技能目录的 SKILL.md（供前端预览 agent/市场侧技能，不限于本地库）
pub fn read_skill_md_at(skill_dir: &str) -> Result<String, String> {
    let dir = Path::new(skill_dir);
    if !dir.is_dir() {
        return Err(format!("目录不存在: {skill_dir}"));
    }
    let md = dir.join("SKILL.md");
    if md.is_file() {
        return fs::read_to_string(&md).map_err(|e| e.to_string());
    }
    // 回退：目录内第一个 .md（如 README.md）
    if let Ok(entries) = fs::read_dir(dir) {
        for e in entries.flatten() {
            let p = e.path();
            if p.is_file() && p.extension().is_some_and(|x| x == "md") {
                if let Ok(c) = fs::read_to_string(&p) {
                    return Ok(format!(
                        "⚠ 未找到 SKILL.md，展示 {}\n\n{}",
                        p.file_name().unwrap_or_default().to_string_lossy(),
                        c
                    ));
                }
            }
        }
    }
    Err(format!("{skill_dir} 下没有 SKILL.md 或 .md 文件"))
}

/// 从本地库删除技能（移入 app 回收站，不硬删）
pub fn remove_from_library(name: &str) -> std::io::Result<()> {
    let ssot = ssot_skills_dir();
    let item = ssot.join(name);
    if !item.exists() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("{name} 不存在"),
        ));
    }
    crate::trash::move_to_trash("library", None, name, &item)?;
    Ok(())
}

/// 复制目录（递归）
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
            std::os::windows::fs::symlink_dir(&target, &to)
                .or_else(|_| std::os::windows::fs::symlink_file(&target, &to))?;
        } else {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}