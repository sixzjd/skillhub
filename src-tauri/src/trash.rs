use crate::agent::home_dir;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

static SEQ: AtomicU64 = AtomicU64::new(0);

/// app 级回收站条目：记录"哪个 agent（或库）的什么 skill 被删了"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    /// library | agent
    pub origin: String,
    pub agent_key: Option<String>,
    pub agent_display: Option<String>,
    pub name: String,
    /// 被删前的原始位置（恢复时回到这里）
    pub original_path: String,
    /// 现存的回收站位置
    pub moved_to: String,
    pub deleted_at: String,
}

/// app 回收站目录 ~/.agents/.trash/
pub fn trash_root() -> PathBuf {
    home_dir().join(".agents/.trash")
}

fn index_path() -> PathBuf {
    trash_root().join("index.json")
}

fn load_index() -> Vec<TrashItem> {
    std::fs::read_to_string(index_path())
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default()
}

fn save_index(items: &[TrashItem]) {
    let _ = std::fs::create_dir_all(trash_root());
    let _ = std::fs::write(index_path(), serde_json::to_string_pretty(items).unwrap_or_default());
}

/// 列出回收站（按删除时间倒序；自动忽略磁盘上已不存在的条目）
pub fn list_trash() -> Vec<TrashItem> {
    let mut items = load_index();
    items.retain(|i| Path::new(&i.moved_to).exists());
    items.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    items
}

fn sanitize(name: &str) -> String {
    name.replace(['/', '\\', ':', ' '], "_")
}

fn agent_display(key: &str) -> Option<String> {
    crate::agent::all_agents()
        .iter()
        .find(|a| a.key() == key)
        .map(|a| a.display().to_string())
}

/// 把原始路径移入回收站并记录归属；返回生成的条目
pub fn move_to_trash(
    origin: &str,
    agent_key: Option<&str>,
    name: &str,
    original_path: &Path,
) -> std::io::Result<TrashItem> {
    let seq = SEQ.fetch_add(1, Ordering::Relaxed);
    let stamp = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();
    let id = format!("{stamp}-{seq:04}");
    let dest = trash_root().join(format!("{id}-{}", sanitize(name)));
    std::fs::create_dir_all(trash_root())?;
    std::fs::rename(original_path, &dest)?;
    let item = TrashItem {
        id: id.clone(),
        origin: origin.to_string(),
        agent_key: agent_key.map(|s| s.to_string()),
        agent_display: agent_key.and_then(agent_display),
        name: name.to_string(),
        original_path: original_path.to_string_lossy().to_string(),
        moved_to: dest.to_string_lossy().to_string(),
        deleted_at: stamp,
    };
    let mut items = load_index();
    items.push(item.clone());
    save_index(&items);
    Ok(item)
}

/// 恢复回收站条目到原位置；原位置被占用时自动加后缀
pub fn restore_trash(id: &str) -> Result<(), String> {
    let mut items = load_index();
    let idx = items
        .iter()
        .position(|i| i.id == id)
        .ok_or_else(|| "回收站中没有该项目".to_string())?;
    let item = items[idx].clone();
    let src = PathBuf::from(&item.moved_to);
    if !src.exists() {
        return Err(format!("回收站文件已不存在: {}", item.name));
    }
    let mut target = PathBuf::from(&item.original_path);
    if target.exists() {
        let stem = target
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let mut n = 1;
        loop {
            let cand = target.with_file_name(format!("{stem}-restored-{n}"));
            if !cand.exists() {
                target = cand;
                break;
            }
            n += 1;
        }
    }
    if let Some(p) = target.parent() {
        std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }
    std::fs::rename(&src, &target).map_err(|e| e.to_string())?;
    items.remove(idx);
    save_index(&items);
    Ok(())
}

/// 清空回收站（物理删除全部条目）
pub fn empty_trash() -> Result<(), String> {
    for item in load_index() {
        let p = Path::new(&item.moved_to);
        let _ = std::fs::remove_dir_all(p);
        let _ = std::fs::remove_file(p);
    }
    save_index(&[]);
    Ok(())
}
