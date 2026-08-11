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
            // Claude Desktop 用 ~/Library/Application Support/Claude；Claude Code 才是 ~/.claude/skills
            AgentKind::Claude => vec![
                p("Library/Application Support/Claude/skills"),
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
                    AgentKind::Claude => home.join("Library/Application Support/Claude"),
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

    /// 区分安装状态：已安装 / 未安装 / 卸载残留
    /// - 已安装：App 存在、CLI 存在、或主配置目录里有运行时痕迹
    /// - 残留：只有 skills 目录或空壳配置，没有实际程序/运行时痕迹
    pub fn status(&self) -> AgentStatus {
        let home = home_dir();
        let has_app: bool;
        let has_cli: bool;
        let has_core: bool;
        match self {
            AgentKind::Claude => {
                // Claude 桌面版独立探测：~/.claude 是 Claude Code（CLI）的家目录，
                // 不能当作桌面版已安装的证据（否则装了 CLI 就误报桌面版）
                has_app = Path::new("/Applications/Claude.app").exists();
                has_cli = false; // `claude` CLI 属于 Claude Code，不是桌面版
                has_core = home.join("Library/Application Support/Claude").exists();
            }
            AgentKind::ClaudeCode => {
                has_app = false;
                has_cli = which_cli("claude");
                has_core = home.join(".claude/plugins").exists()
                    || home.join(".claude/settings.json").exists();
            }
            AgentKind::Codex => {
                has_app = false;
                has_cli = which_cli("codex");
                has_core = home.join(".codex/sessions").exists()
                    || home.join(".codex/logs_2.sqlite").exists()
                    || home.join(".codex/auth.json").exists();
            }
            AgentKind::Qoder => {
                has_app = Path::new("/Applications/Qoder.app").exists()
                    || Path::new("/Applications/Qoder CN.app").exists();
                has_cli = false;
                has_core = home.join(".qoderworkcn/state").exists()
                    || home.join(".qoderworkcn/logs").exists();
            }
            AgentKind::QoderWork => {
                has_app = Path::new("/Applications/QoderWork CN.app").exists()
                    || Path::new("/Applications/QoderWork.app").exists();
                has_cli = false;
                has_core = home.join(".qoderworkcn/state").exists()
                    || home.join(".qoderworkcn/logs").exists();
            }
            AgentKind::CodeWhale => {
                has_app = false;
                has_cli = which_cli("codewhale");
                has_core = home.join(".codewhale/state_5.sqlite").exists()
                    || home.join(".codewhale/sessions").exists()
                    || home.join(".codewhale/config.toml").exists();
            }
            AgentKind::Trae => {
                has_app = Path::new("/Applications/Trae.app").exists()
                    || Path::new("/Applications/Trae CN.app").exists();
                has_cli = false;
                has_core = home.join(".trae/workbench").exists()
                    || home.join(".trae/settings.json").exists();
            }
            AgentKind::Reasonix => {
                has_app = Path::new("/Applications/Reasonix.app").exists();
                has_cli = false;
                has_core = home.join(".reasonix/state").exists()
                    || home.join(".reasonix/logs").exists();
            }
            AgentKind::OpenCode => {
                has_app = false;
                has_cli = which_cli("opencode");
                has_core = home.join(".config/opencode/auth.json").exists()
                    || home.join(".local/share/opencode").exists();
            }
            AgentKind::OpenClaw => {
                has_app = false;
                has_cli = which_cli("openclaw");
                has_core = home.join(".openclaw/logs").exists()
                    || home.join(".openclaw/config.json").exists();
            }
            AgentKind::Cursor => {
                has_app = Path::new("/Applications/Cursor.app").exists()
                    || Path::new("~/Applications/Cursor.app").exists();
                has_cli = false;
                has_core = home.join(".cursor/projects").exists()
                    || home.join(".cursor/argv.json").exists();
            }
            AgentKind::Gemini => {
                has_app = Path::new("/Applications/Gemini.app").exists();
                has_cli = which_cli("gemini");
                has_core = home.join(".gemini/state").exists()
                    || home.join(".gemini/logs").exists();
            }
        }
        if has_app || has_cli || has_core {
            AgentStatus::Installed
        } else if self.skill_dir_candidates().iter().any(|d| d.exists())
            || home.join(self.main_cfg_name()).exists()
        {
            AgentStatus::Remnant
        } else {
            AgentStatus::NotInstalled
        }
    }

    /// 主配置目录名（相对 home），用于残留检测
    fn main_cfg_name(&self) -> &'static str {
        match self {
            AgentKind::Claude => "Library/Application Support/Claude",
            AgentKind::ClaudeCode => ".claude",
            AgentKind::Codex => ".codex",
            AgentKind::Qoder | AgentKind::QoderWork => ".qoderworkcn",
            AgentKind::CodeWhale => ".codewhale",
            AgentKind::Trae => ".trae",
            AgentKind::Reasonix => ".reasonix",
            AgentKind::OpenCode => ".config/opencode",
            AgentKind::OpenClaw => ".openclaw",
            AgentKind::Cursor => ".cursor",
            AgentKind::Gemini => ".gemini",
        }
    }

    /// 该 agent 的官网/安装指引（供"一键安装/更新"跳转）
    pub fn install_url(&self) -> &'static str {
        match self {
            AgentKind::Claude => "https://claude.ai/download",
            AgentKind::ClaudeCode => "https://docs.anthropic.com/en/docs/claude-code/setup",
            AgentKind::Codex => "https://github.com/openai/codex",
            AgentKind::Qoder => "https://qoder.com",
            AgentKind::QoderWork => "https://qoder.com",
            AgentKind::CodeWhale => "https://github.com/kingparks/codewhale",
            AgentKind::Trae => "https://www.trae.ai",
            AgentKind::Reasonix => "https://reasonix.ai",
            AgentKind::OpenCode => "https://opencode.ai",
            AgentKind::OpenClaw => "https://github.com/lem-project/openclaw",
            AgentKind::Cursor => "https://cursor.com",
            AgentKind::Gemini => "https://gemini.google.com",
        }
    }
}

/// Agent 安装状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AgentStatus {
    Installed,
    NotInstalled,
    /// 卸载残留（只有 skills 目录/空壳配置，无实际程序）
    Remnant,
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

/// 检测某个 CLI 命令是否在 PATH 中
pub fn which_cli(cmd: &str) -> bool {
    let path_env = std::env::var_os("PATH").unwrap_or_default();
    for dir in std::env::split_paths(&path_env) {
        let candidate = dir.join(cmd);
        if candidate.is_file() {
            return true;
        }
    }
    false
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
    /// installed / not_installed / remnant
    pub status: String,
    pub install_url: Option<String>,
    pub skills_dir: Option<String>,
    pub skills: Vec<SkillInfo>,
}

pub fn scan_all() -> ScanResult {
    let mut agents = Vec::new();
    for kind in all_agents() {
        let skills_dir = kind.detect().map(|p| p.to_string_lossy().to_string());
        let skills = scan_agent_skills(kind);
        let status = kind.status();
        let status_str = match status {
            AgentStatus::Installed => "installed",
            AgentStatus::NotInstalled => "not_installed",
            AgentStatus::Remnant => "remnant",
        }
        .to_string();
        agents.push(AgentScan {
            key: kind.key().to_string(),
            display: kind.display().to_string(),
            installed: matches!(status, AgentStatus::Installed),
            status: status_str,
            install_url: Some(kind.install_url().to_string()),
            skills_dir,
            skills,
        });
    }
    let _ = HashMap::<String, String>::new();
    ScanResult { agents }
}