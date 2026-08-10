use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// 支持的 Agent 类型（覆盖主流 + 社区新兴）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "lowercase")]
pub enum AgentKind {
    Claude,
    ClaudeCode,
    Codex,
    Qoder,
    QoderWork,
    CodeWhale,
    Trae,
    Reasonix,
    OpenCode,
    OpenClaw,
    Cursor,
    Gemini,
}

impl AgentKind {
    /// agent 的唯一 key（用于数据库、链接名）
    pub fn key(&self) -> &'static str {
        match self {
            AgentKind::Claude => "claude",
            AgentKind::ClaudeCode => "claude-code",
            AgentKind::Codex => "codex",
            AgentKind::Qoder => "qoder",
            AgentKind::QoderWork => "qoderwork",
            AgentKind::CodeWhale => "codewhale",
            AgentKind::Trae => "trae",
            AgentKind::Reasonix => "reasonix",
            AgentKind::OpenCode => "opencode",
            AgentKind::OpenClaw => "openclaw",
            AgentKind::Cursor => "cursor",
            AgentKind::Gemini => "gemini",
        }
    }

    /// 展示名（默认英文，渲染时按 i18n 覆盖）
    pub fn display(&self) -> &'static str {
        match self {
            AgentKind::Claude => "Claude",
            AgentKind::ClaudeCode => "Claude Code",
            AgentKind::Codex => "Codex",
            AgentKind::Qoder => "Qoder",
            AgentKind::QoderWork => "Qoder Work",
            AgentKind::CodeWhale => "CodeWhale",
            AgentKind::Trae => "Trae",
            AgentKind::Reasonix => "Reasonix",
            AgentKind::OpenCode => "OpenCode",
            AgentKind::OpenClaw => "OpenClaw",
            AgentKind::Cursor => "Cursor",
            AgentKind::Gemini => "Gemini",
        }
    }

    /// 该 agent 的 skills 目录（相对用户主目录）。多候选路径按优先级排列。
    pub fn skill_dir_candidates(&self) -> Vec<PathBuf> {
        let home = home_dir();
        let p = |rel: &str| home.join(rel);
        match self {
            AgentKind::Claude => vec![
                p(".claude/skills"),
                p(".config/claude/skills"),
            ],
            AgentKind::ClaudeCode => vec![p(".claude/skills")],
            AgentKind::Codex => vec![
                p(".codex/skills"),
                p(".config/codex/skills"),
            ],
            AgentKind::Qoder => vec![
                p(".qoder/skills"),
                p(".config/qoder/skills"),
            ],
            AgentKind::QoderWork => vec![
                p(".qoderworkcn/skills"),
                p(".qoder-work/skills"),
            ],
            AgentKind::CodeWhale => vec![
                p(".codewhale/skills"),
                p(".config/codewhale/skills"),
            ],
            AgentKind::Trae => vec![
                p(".trae/skills"),
                p(".config/trae/skills"),
            ],
            AgentKind::Reasonix => vec![
                p(".reasonix/skills"),
                p(".config/reasonix/skills"),
            ],
            AgentKind::OpenCode => vec![p(".config/opencode/skills")],
            AgentKind::OpenClaw => vec![p(".openclaw/skills")],
            AgentKind::Cursor => vec![
                p(".cursor/skills"),
                p(".cursor/skills-cursor"),
            ],
            AgentKind::Gemini => vec![
                p(".gemini/skills"),
                p(".config/gemini/skills"),
            ],
        }
    }

    /// 探测 agent 是否安装（任一 skills 目录存在或其配置主目录存在）
    pub fn detect(&self) -> Option<PathBuf> {
        self.skill_dir_candidates()
            .into_iter()
            .find(|d| d.exists())
            .or_else(|| {
                // 退化：配置主目录存在但无 skills 目录（如 claude 目录存在）
                let home = home_dir();
                let cfg = match self {
                    AgentKind::Claude => home.join(".claude"),
                    AgentKind::ClaudeCode => home.join(".claude"),
                    AgentKind::Codex => home.join(".codex"),
                    AgentKind::Qoder => home.join(".qoder"),
                    AgentKind::QoderWork => home.join(".qoderworkcn"),
                    AgentKind::CodeWhale => home.join(".codewhale"),
                    AgentKind::Trae => home.join(".trae"),
                    AgentKind::Reasonix => home.join(".reasonix"),
                    AgentKind::OpenCode => home.join(".config/opencode"),
                    AgentKind::OpenClaw => home.join(".openclaw"),
                    AgentKind::Cursor => home.join(".cursor"),
                    AgentKind::Gemini => home.join(".gemini"),
                };
                cfg.exists().then_some(cfg)
            })
    }
}

/// 框架标准 SSOT 目录（supframework 倡导 + cc-switch 新版本支持）
pub fn ssot_skills_dir() -> PathBuf {
    home_dir().join(".agents/skills")
}

/// 所有受支持的 agent
pub fn all_agents() -> Vec<AgentKind> {
    use AgentKind::*;
    vec![
        Claude,
        ClaudeCode,
        Codex,
        Qoder,
        QoderWork,
        CodeWhale,
        Trae,
        Reasonix,
        OpenCode,
        OpenClaw,
        Cursor,
        Gemini,
    ]
}

/// 返回 home 目录
pub fn home_dir() -> PathBuf {
    dirs::home_dir().expect("无法获取用户主目录")
}

/// 扫描单个 agent 的 skills，返回已安装技能列表
pub fn scan_agent_skills(kind: AgentKind) -> Vec<SkillInfo> {
    let Some(skills_dir) = kind.detect() else {
        return Vec::new();
    };
    let mut out = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&skills_dir) {
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let path = e.path();
            if !path.is_dir() {
                continue;
            }
            let is_link = path.is_symlink();
            // 跟随链接判断最终目录
            let real = if is_link {
                std::fs::canonicalize(&path).unwrap_or(path.clone())
            } else {
                path.clone()
            };
            if !real.is_dir() {
                continue;
            }
            // 探测 SKILL.md（某些技能用 SKILL.md，插件可能是其他形式）
            let has_skill_md = real.join("SKILL.md").exists();
            let desc = read_frontmatter_desc(&real.join("SKILL.md"));
            out.push(SkillInfo {
                name,
                path: path.to_string_lossy().to_string(),
                is_link,
                has_skill_md,
                description: desc,
            });
        }
    }
    out
}

/// 从 SKILL.md frontmatter 读 description（首段 200 字）
fn read_frontmatter_desc(skill_md: &Path) -> String {
    let Ok(content) = std::fs::read_to_string(skill_md) else {
        return String::new();
    };
    // 取前 200 字符作为描述（frontmatter description 优先）
    let mut desc = String::new();
    let mut in_fm = true;
    let mut fm_end = 0;
    for (i, line) in content.lines().enumerate() {
        if i == 0 && line.trim() == "---" {
            continue;
        }
        if line.trim() == "---" {
            fm_end = i + 1;
            break;
        }
    }
    if fm_end > 0 {
        let fm = &content.lines().collect::<Vec<_>>()[0..fm_end - 1];
        // 找 description: / desc:
        for line in fm {
            let t = line.trim();
            if let Some(v) = t.strip_prefix("description:").or_else(|| t.strip_prefix("desc:")) {
                desc = v.trim().trim_matches('"').to_string();
                break;
            }
        }
    }
    if desc.is_empty() {
        // 回退：取正文第一段
        for line in content.lines().skip(fm_end) {
            let t = line.trim();
            if !t.is_empty() && !t.starts_with('#') {
                desc = t.chars().take(200).collect();
                break;
            }
        }
    }
    desc
}

/// warehouse 中一个技能的信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInfo {
    pub name: String,
    pub path: String,
    pub is_link: bool,
    pub has_skill_md: bool,
    pub description: String,
}

/// 扫描主目录下所有 agent 及技能（供前端一次拉取）
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScanResult {
    pub agents: Vec<AgentScan>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentScan {
    pub key: String,
    pub display: String,
    pub installed: bool,
    pub skills_dir: Option<String>,
    pub skills: Vec<SkillInfo>,
}

pub fn scan_all() -> ScanResult {
    let mut agents = Vec::new();
    for kind in all_agents() {
        let skills_dir = kind.detect().map(|p| p.to_string_lossy().to_string());
        let skills = scan_agent_skills(kind);
        agents.push(AgentScan {
            key: kind.key().to_string(),
            display: kind.display().to_string(),
            installed: skills_dir.is_some(),
            skills_dir,
            skills,
        });
    }
    // 附加一个特殊的 "Local library" 概念：~/.agents/skills 本来就列在扫描外，
    // 前端以独立面板展示。这里返回给前端即可。
    let _ = HashMap::<String, String>::new();
    ScanResult { agents }
}