use crate::agent::{home_dir, ssot_skills_dir, SkillInfo};
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
            out.push(LibrarySkill {
                name,
                path: p.to_string_lossy().to_string(),
                description: desc,
                has_skill_md: has_md,
                size_bytes: size,
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
    let mut body_started = false;
    let mut fm_end = 0usize;
    let lines: Vec<&str> = c.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        let t = line.trim();
        if i == 0 && t == "---" {
            in_fm = true;
            continue;
        }
        if in_fm && t == "---" {
            in_fm = false;
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
    let _ = body_started;
    for line in lines.iter().skip(fm_end) {
        let t = line.trim();
        if !t.is_empty() && !t.starts_with('#') && !t.starts_with("---") {
            return t.chars().take(200).collect();
        }
    }
    String::new()
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
    // 已有同名 → 跳过（避免误覆盖），提示用户
    if dst.exists() {
        result.skipped.push(format!("{name}: 本地库已存在同名技能"));
        return result;
    }
    copy_dir_all(src_p, &dst).ok();
    result.imported.push(name.to_string());
    result
}

/// 从本地库删除技能（移入废纸篓，不硬删）
pub fn remove_from_library(name: &str) -> std::io::Result<()> {
    let ssot = ssot_skills_dir();
    let item = ssot.join(name);
    if !item.exists() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("{name} 不存在"),
        ));
    }
    let trash = home_dir().join(".Trash");
    fs::create_dir_all(&trash).ok();
    let stamp = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();
    let dest = trash.join(format!("skillhub-{name}-{stamp}"));
    fs::rename(&item, &dest)?;
    Ok(())
}

/// 从本地库移除后，同步时会自动回收各 agent 的孤儿链接（在 sync 模块处理）
pub fn sync_after_remove() -> Vec<SkillInfo> {
    // 占位：实际孤儿回收在 run_sync 中完成
    Vec::new()
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