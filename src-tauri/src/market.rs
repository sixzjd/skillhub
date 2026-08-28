use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

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
    // owner/repo 会被拼进下载 URL，只允许 GitHub 命名空间字符
    let valid = |s: &str| {
        s.chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
    };
    if !valid(&owner) || !valid(&repo) {
        return Err("owner/repo 只能包含字母、数字和 . - _".into());
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

static TMP_COUNTER: AtomicU64 = AtomicU64::new(0);

/// 校验目标技能名：必须是单段路径，禁止穿越（恶意市场的 name 可能带 ../ 或绝对路径）
fn is_safe_target(name: &str) -> bool {
    !name.is_empty() && !name.contains(['/', '\\']) && name != "." && name != ".."
}

/// 校验仓库内来源路径：不允许 ".." 段（防止读取 tarball 之外的文件）；
/// 容忍 "./"、尾随斜杠（anthropics 官方市场的 source 就是 "./"）
fn is_safe_source(src: &str) -> bool {
    let src = src.trim_start_matches('/');
    let segs: Vec<&str> = src.split('/').filter(|s| !s.is_empty()).collect();
    !segs.is_empty() && segs.iter().all(|s| *s != "..")
}

/// 共享异步客户端：超时 + 读取环境变量代理（HTTP(S)/ALL_PROXY）
async fn build_client() -> Result<reqwest::Client, String> {
    let mut b = reqwest::Client::builder()
        .user_agent("SkillHub/0.1")
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(180));
    for v in [
        "HTTPS_PROXY",
        "https_proxy",
        "ALL_PROXY",
        "all_proxy",
        "HTTP_PROXY",
        "http_proxy",
    ] {
        if let Ok(p) = std::env::var(v) {
            if !p.trim().is_empty() {
                if let Ok(px) = reqwest::Proxy::all(p.trim()) {
                    b = b.proxy(px);
                }
                break;
            }
        }
    }
    b.build().map_err(|e| e.to_string())
}

/// 一次性下载整个仓库 tarball（默认分支），本地扫描即可拿到全部技能，
/// 避免对每个技能串行请求 GitHub API（慢且触发 60 次/时 限流）。
async fn fetch_tarball(client: &reqwest::Client, market: &Marketplace) -> Result<Vec<u8>, String> {
    let url = format!(
        "https://codeload.github.com/{}/{}/tar.gz/HEAD",
        market.owner, market.repo
    );
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("下载仓库失败: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("下载仓库失败: HTTP {}", resp.status()));
    }
    resp.bytes().await.map(|b| b.to_vec()).map_err(|e| e.to_string())
}

fn unpack_tarball(bytes: &[u8]) -> Result<PathBuf, String> {
    let uniq = TMP_COUNTER.fetch_add(1, Ordering::Relaxed);
    let tmp = std::env::temp_dir().join(format!("skillhub-{}-{uniq}", std::process::id()));
    let _ = std::fs::remove_dir_all(&tmp);
    std::fs::create_dir_all(&tmp).map_err(|e| e.to_string())?;
    let gz = flate2::read::GzDecoder::new(bytes);
    let mut ar = tar::Archive::new(gz);
    ar.unpack(&tmp).map_err(|e| format!("解压失败: {e}"))?;
    Ok(tmp)
}

fn find_repo_root(tmp: &Path) -> Result<PathBuf, String> {
    for e in std::fs::read_dir(tmp).map_err(|e| e.to_string())?.flatten() {
        if e.path().is_dir() {
            return Ok(e.path());
        }
    }
    Err("tarball 结构异常".into())
}

/// 拉取市场技能列表（全仓 tarball 本地扫描）
pub async fn fetch_market_skills(market: &Marketplace) -> Result<Vec<MarketSkill>, String> {
    let client = build_client().await?;
    let bytes = fetch_tarball(&client, market).await?;
    let tmp = unpack_tarball(&bytes)?;
    let repo_root = find_repo_root(&tmp)?;
    let skills = scan_repo(&repo_root, market);
    let _ = std::fs::remove_dir_all(&tmp);
    Ok(skills)
}

fn scan_repo(repo_root: &Path, market: &Marketplace) -> Vec<MarketSkill> {
    // 1) marketplace.json（Anthropic 插件协议；可能位于仓库根或 .claude-plugin/）
    for rel in ["marketplace.json", ".claude-plugin/marketplace.json"] {
        if let Ok(text) = std::fs::read_to_string(repo_root.join(rel)) {
            if let Ok(mkt) = serde_json::from_str::<MarketplaceFile>(&text) {
                return mkt
                    .plugins
                    .into_iter()
                    .map(|p| {
                        let mut desc = p.description.unwrap_or_default();
                        if desc.is_empty() && !p.source.is_empty() {
                            if let Some(d) = read_md_desc(repo_root, &p.source) {
                                desc = d;
                            }
                        }
                        MarketSkill {
                            name: p.name,
                            description: desc,
                            source: p.source.clone(),
                            repo: format!("{}/{}", market.owner, market.repo),
                            url: format!(
                                "https://github.com/{}/{}/tree/main/{}",
                                market.owner, market.repo, p.source
                            ),
                            installed: false,
                        }
                    })
                    .collect();
            }
        }
    }

    // 2) 扫 /skills 目录
    let mut skills = Vec::new();
    if let Ok(entries) = std::fs::read_dir(repo_root.join("skills")) {
        for e in entries.flatten() {
            let path = e.path();
            if !path.is_dir() {
                continue;
            }
            let name = e.file_name().to_string_lossy().to_string();
            let desc = std::fs::read_to_string(path.join("SKILL.md"))
                .ok()
                .map(|d| extract_desc(&d))
                .unwrap_or_default();
            skills.push(MarketSkill {
                name: name.clone(),
                description: desc,
                source: format!("skills/{name}"),
                repo: format!("{}/{}", market.owner, market.repo),
                url: format!(
                    "https://github.com/{}/{}/tree/main/skills/{}",
                    market.owner, market.repo, name
                ),
                installed: false,
            });
        }
    }

    // 3) 根目录下含 SKILL.md 的技能目录（根布局仓库，如 ComposioHQ/awesome-claude-skills）
    if skills.is_empty() {
        if let Ok(entries) = std::fs::read_dir(repo_root) {
            for e in entries.flatten() {
                let path = e.path();
                if path.is_dir() && path.join("SKILL.md").is_file() {
                    let name = e.file_name().to_string_lossy().to_string();
                    let desc = std::fs::read_to_string(path.join("SKILL.md"))
                        .ok()
                        .map(|d| extract_desc(&d))
                        .unwrap_or_default();
                    skills.push(MarketSkill {
                        name: name.clone(),
                        description: desc,
                        source: name.clone(),
                        repo: format!("{}/{}", market.owner, market.repo),
                        url: format!(
                            "https://github.com/{}/{}/tree/main/{}",
                            market.owner, market.repo, name
                        ),
                        installed: false,
                    });
                }
            }
        }
    }
    skills
}

/// 从仓库内路径读取描述（SKILL.md 优先，其次任意 md），失败返回 None
fn read_md_desc(repo_root: &Path, source: &str) -> Option<String> {
    if !is_safe_source(source) {
        return None;
    }
    let p = repo_root.join(source.trim_start_matches('/'));
    let md = p.join("SKILL.md");
    let file = if md.is_file() {
        md
    } else if p.is_file() && p.extension().map(|e| e == "md").unwrap_or(false) {
        p
    } else {
        return None;
    };
    std::fs::read_to_string(file).ok().map(|c| extract_desc(&c))
}

/// 下载并解压市场技能到本地库（~/.agents/skills）
pub async fn install_market_skill(
    market: &Marketplace,
    skill_source: &str,
    target_dir: &str,
) -> Result<(), String> {
    // 市场数据不可信：name/source 可能来自任意 marketplace.json，先校验再拼路径
    if !is_safe_target(target_dir) || !is_safe_source(skill_source) {
        return Err("非法的技能路径".into());
    }
    let client = build_client().await?;
    let bytes = fetch_tarball(&client, market).await?;
    let tmp = unpack_tarball(&bytes)?;
    let repo_root = find_repo_root(&tmp)?;

    let src_dir = repo_root.join(skill_source.trim_start_matches('/'));
    if !src_dir.is_dir() {
        let _ = std::fs::remove_dir_all(&tmp);
        return Err(format!("技能目录不存在: {skill_source}"));
    }

    // 复制到本地库
    let ssot = crate::agent::ssot_skills_dir().join(target_dir);
    std::fs::create_dir_all(ssot.parent().unwrap()).map_err(|e| e.to_string())?;
    copy_dir_all(&src_dir, &ssot).map_err(|e| e.to_string())?;

    // 写入来源元数据：供后续"检查更新/一键更新"与来源追溯使用
    let meta = serde_json::json!({
        "name": target_dir,
        "source": skill_source,
        "owner": market.owner,
        "repo": market.repo,
        "market_id": market.id,
        "installed_at": chrono::Local::now().to_rfc3339(),
    });
    let _ = std::fs::write(
        ssot.join(".skillhub-meta.json"),
        serde_json::to_string_pretty(&meta).unwrap_or_default(),
    );

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
}