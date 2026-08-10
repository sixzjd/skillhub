use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 插件/技能市场
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Marketplace {
    pub id: String,
    pub name: String,
    pub owner: String,
    pub repo: String,
    pub description: String,
    pub url: String,
    /// 是否官方/推荐
    #[serde(default)]
    pub official: bool,
}

/// 市场中的技能条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSkill {
    pub name: String,
    pub description: String,
    pub source: String,
    pub repo: String,
    pub url: String,
    /// 已安装标记（由调用方回填）
    #[serde(default)]
    pub installed: bool,
}

/// 默认内置市场列表（参考 cc-switch + Anthropic 官方 + 社区）
pub fn default_marketplaces() -> Vec<Marketplace> {
    vec![
        Marketplace {
            id: "anthropic-official".into(),
            name: "Anthropic Official".into(),
            owner: "anthropics".into(),
            repo: "skills".into(),
            description: "Anthropic 官方 Agent Skills".into(),
            url: "https://github.com/anthropics/skills".into(),
            official: true,
        },
        Marketplace {
            id: "awesome-claude-skills".into(),
            name: "Awesome Claude Skills".into(),
            owner: "ComposioHQ".into(),
            repo: "awesome-claude-skills".into(),
            description: "精选 Claude Code 技能合集".into(),
            url: "https://github.com/ComposioHQ/awesome-claude-skills".into(),
            official: false,
        },
        Marketplace {
            id: "baoyu-skills".into(),
            name: "Baoyu Skills".into(),
            owner: "JimLiu".into(),
            repo: "baoyu-skills".into(),
            description: "宝玉的 Claude Skills 合集".into(),
            url: "https://github.com/JimLiu/baoyu-skills".into(),
            official: false,
        },
        Marketplace {
            id: "myclaude".into(),
            name: "MyClaude".into(),
            owner: "cexll".into(),
            repo: "myclaude".into(),
            description: "Claude 实用技能集".into(),
            url: "https://github.com/cexll/myclaude".into(),
            official: false,
        },
        Marketplace {
            id: "superpowers".into(),
            name: "Superpowers".into(),
            owner: "obra".into(),
            repo: "superpowers".into(),
            description: "Jesse Vincent 的 agentic skills framework".into(),
            url: "https://github.com/obra/superpowers".into(),
            official: false,
        },
    ]
}

/// 用户自定义市场配置文件：~/.config/skillhub/markets.json
fn markets_config_path() -> PathBuf {
    let home = crate::agent::home_dir();
    home.join(".config").join("skillhub").join("markets.json")
}

/// 全部市场 = 内置默认 + 用户自定义
pub fn list_all_markets() -> Vec<Marketplace> {
    let mut all = default_marketplaces();
    if let Ok(content) = std::fs::read_to_string(markets_config_path()) {
        if let Ok(extra) = serde_json::from_str::<Vec<Marketplace>>(&content) {
            for m in extra {
                if !all.iter().any(|x| x.id == m.id) {
                    all.push(m);
                }
            }
        }
    }
    all
}

/// 添加自定义市场（owner/repo），持久化到配置文件
pub fn add_market(owner: &str, repo: &str) -> Result<Marketplace, String> {
    let owner = owner.trim().trim_start_matches('@').to_string();
    let repo = repo.trim().trim_end_matches(".git").to_string();
    if owner.is_empty() || repo.is_empty() {
        return Err("owner 和 repo 不能为空".into());
    }
    let path = markets_config_path();
    let mut custom: Vec<Marketplace> = std::fs::read_to_string(&path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default();
    let id = format!("custom-{}-{}", owner.to_lowercase(), repo.to_lowercase());
    if custom.iter().any(|m| m.id == id) {
        return Err("该市场已存在".into());
    }
    let market = Marketplace {
        id,
        name: format!("{}/{}", owner, repo),
        owner: owner.clone(),
        repo: repo.clone(),
        description: "自定义市场".into(),
        url: format!("https://github.com/{}/{}", owner, repo),
        official: false,
    };
    custom.push(market.clone());
    save_markets(&path, &custom)?;
    Ok(market)
}

/// 删除自定义市场
pub fn remove_market(id: &str) -> Result<(), String> {
    let path = markets_config_path();
    if !path.exists() {
        return Ok(());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut custom: Vec<Marketplace> =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;
    custom.retain(|m| m.id != id);
    save_markets(&path, &custom)
}

fn save_markets(path: &PathBuf, markets: &[Marketplace]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(path, serde_json::to_string_pretty(markets).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

/// 通过 GitHub API 拉取仓库技能列表
/// 优先读 marketplace.json（Anthropic 协议），回退扫描 /skills 目录
pub fn fetch_market_skills(market: &Marketplace) -> Result<Vec<MarketSkill>, String> {
    let api_base = format!(
        "https://api.github.com/repos/{}/{}",
        market.owner, market.repo
    );
    let client = reqwest::blocking::Client::builder()
        .user_agent("SkillHub/0.1")
        .build()
        .map_err(|e| e.to_string())?;

    // 1) 尝试 marketplace.json
    let mkt_url = format!("{api_base}/contents/marketplace.json");
    let raw = fetch_raw(&client, &mkt_url).ok();
    if let Some(body) = raw {
        if let Ok(mkt) = serde_json::from_str::<MarketplaceFile>(&body) {
            let mut skills = Vec::new();
            for p in mkt.plugins {
                let mut desc = p.description.unwrap_or_default();
                let has_md = p.skills.as_ref().map(|s| s.len() > 0).unwrap_or(false);
                if !has_md {
                    if let Ok(full) = fetch_raw(&client, &format!("{api_base}/contents/{}", p.source)) {
                        desc = if desc.is_empty() { full } else { desc };
                    }
                }
                skills.push(MarketSkill {
                    name: p.name,
                    description: desc,
                    source: p.source.clone(),
                    repo: format!("{}/{}", market.owner, market.repo),
                    url: format!(
                        "https://github.com/{}/{}/tree/main/{}",
                        market.owner, market.repo, p.source
                    ),
                    installed: false,
                });
            }
            return Ok(skills);
        }
    }

    // 2) 回退：扫 /skills 目录
    let skills_url = format!("{api_base}/contents/skills");
    let body = fetch_raw(&client, &skills_url).map_err(|e| format!("无法读取市场仓库: {e}"))?;
    let entries: Vec<GHContent> = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    let mut skills = Vec::new();
    for e in entries.into_iter().filter(|e| e.type_ == "dir") {
        let name = e.name.clone();
        let desc = fetch_raw(&client, &format!("{}/SKILL.md", e.path))
            .ok()
            .map(|d| extract_desc(&d))
            .unwrap_or_default();
        skills.push(MarketSkill {
            name: name.clone(),
            description: desc,
            source: format!("skills/{}", e.name),
            repo: format!("{}/{}", market.owner, market.repo),
            url: format!(
                "https://github.com/{}/{}/tree/main/skills/{}",
                market.owner, market.repo, name
            ),
            installed: false,
        });
    }
    Ok(skills)
}

/// 下载并解压市场技能到本地库（~/.agents/skills）
pub fn install_market_skill(market: &Marketplace, skill_source: &str, target_dir: &str) -> Result<(), String> {
    // 通过 GitHub tarball 下载整个仓库，找对应技能目录
    let tarball_url = format!(
        "https://api.github.com/repos/{}/{}/tarball/main",
        market.owner, market.repo
    );
    let client = reqwest::blocking::Client::builder()
        .user_agent("SkillHub/0.1")
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(&tarball_url)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("下载失败: HTTP {}", resp.status()));
    }
    let bytes = resp
        .bytes()
        .map_err(|e| e.to_string())?;

    // 解压到临时目录
    let tmp = std::env::temp_dir().join(format!("skillhub-{}", chrono::Local::now().timestamp()));
    std::fs::create_dir_all(&tmp).map_err(|e| e.to_string())?;

    // tar.gz 解压
    let gz = flate2::read::GzDecoder::new(&bytes[..]);
    let mut ar = tar::Archive::new(gz);
    ar.unpack(&tmp).map_err(|e| format!("解压失败: {e}"))?;

    // 仓库根目录 = tmp 下唯一目录
    let mut repo_root: Option<PathBuf> = None;
    if let Ok(entries) = std::fs::read_dir(&tmp) {
        for e in entries.flatten() {
            if e.path().is_dir() {
                repo_root = Some(e.path());
                break;
            }
        }
    }
    let repo_root = repo_root.ok_or("tarball 结构异常")?;

    // 目标技能目录
    let src_dir = repo_root.join(skill_source.trim_start_matches('/'));
    if !src_dir.is_dir() {
        return Err(format!("技能目录不存在: {skill_source}"));
    }

    // 复制到本地库
    let ssot = crate::agent::ssot_skills_dir().join(target_dir);
    std::fs::create_dir_all(ssot.parent().unwrap()).map_err(|e| e.to_string())?;
    copy_dir_all(&src_dir, &ssot).map_err(|e| e.to_string())?;

    // 清理临时目录
    let _ = std::fs::remove_dir_all(&tmp);
    Ok(())
}

fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&from, &to)?;
        } else if ty.is_symlink() {
            let target = std::fs::read_link(&from)?;
            #[cfg(unix)]
            std::os::unix::fs::symlink(&target, &to)?;
            #[cfg(windows)]
            std::os::windows::fs::symlink_dir(&target, &to)
                .or_else(|_| std::os::windows::fs::symlink_file(&target, &to))?;
        } else {
            std::fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

/// 从 SKILL.md 提取描述
fn extract_desc(content: &str) -> String {
    let mut in_fm = false;
    let mut fm = Vec::new();
    for (i, line) in content.lines().enumerate() {
        let t = line.trim();
        if i == 0 && t == "---" {
            in_fm = true;
            continue;
        }
        if in_fm && t == "---" {
            break;
        }
        if in_fm {
            fm.push(t);
        }
    }
    for l in &fm {
        if let Some(v) = l.strip_prefix("description:").or_else(|| l.strip_prefix("desc:")) {
            return v.trim().trim_matches('"').to_string();
        }
    }
    content
        .lines()
        .find(|l| {
            let t = l.trim();
            !t.is_empty() && !t.starts_with('#') && !t.starts_with("---")
        })
        .map(|l| l.chars().take(200).collect())
        .unwrap_or_default()
}

/// GitHub API raw 内容拉取
fn fetch_raw(client: &reqwest::blocking::Client, url: &str) -> Result<String, String> {
    let resp = client
        .get(url)
        .header("Accept", "application/vnd.github.raw")
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    resp.text().map_err(|e| e.to_string())
}

// ---- API 结构 ----
#[derive(Debug, Deserialize)]
struct MarketplaceFile {
    plugins: Vec<MarketplacePlugin>,
}

#[derive(Debug, Deserialize)]
struct MarketplacePlugin {
    name: String,
    #[serde(default)]
    source: String,
    description: Option<String>,
    #[serde(default)]
    skills: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct GHContent {
    name: String,
    #[serde(rename = "type")]
    type_: String,
    path: String,
}