# 🧩 SkillHub

跨 Agent 技能管理器 —— 扫描、管理、同步、安装所有 AI Agent 的 skills/plugins。

![Build](https://github.com/sixzjd/skillhub/actions/workflows/build.yml/badge.svg)
![License](https://img.shields.io/github/license/sixzjd/skillhub)
![Version](https://img.shields.io/github/v/release/sixzjd/skillhub)

## ✨ 特性

- **Agent 扫描**：自动检测本机安装的 Claude、Claude Code、Codex、Qoder、Qoder Work、CodeWhale、Trae、Reasonix、OpenCode、OpenClaw、Cursor、Gemini 等，列出每个 Agent 的 skills
- **本地库（SSOT）**：`~/.agents/skills/` 作为单一事实源，统一管理所有第三方/自建技能
- **一键同步**：把本地库技能软链接（失败回退复制）到任意选中的 Agent
- **内置保护**：各 Agent 自带的内置技能绝不外传、绝不覆盖；孤儿链接自动回收进废纸篓
- **技能市场**：内置 Anthropic 官方 + 社区市场，浏览、下载、安装一键完成
- **多语言**：简体中文 / 繁體中文 / English / 日本語

## 🖥️ 平台

| 平台 | 支持 |
|---|---|
| macOS | ✅ DMG |
| Windows | ✅ MSI / EXE |
| Linux | ✅ (可选) |

## 🚀 快速开始

### 从 Release 安装

1. 到 [Releases](https://github.com/sixzjd/skillhub/releases) 下载对应平台的安装包
2. macOS：打开 DMG 拖入 Applications；Windows：运行安装程序

### 从源码构建

```bash
# 前置：Node.js ≥ 18、pnpm、Rust stable
git clone https://github.com/sixzjd/skillhub.git
cd skillhub
pnpm install
pnpm tauri dev        # 开发模式
pnpm tauri build      # 构建安装包
```

> 国内网络：Rust 依赖建议使用 rsproxy 镜像（`~/.cargo/config.toml`）。

## 📖 使用说明

### 1. Agent 扫描
打开应用自动扫描本机 Agent 及技能。勾选 Agent（或全选）后，点击「导入到本地库」把技能收入 `~/.agents/skills/`。

### 2. 本地库管理
查看、删除本地库中的技能（删除只进废纸篓，可恢复）。

### 3. 同步到 Agent
选择目标 Agent → 点击「立即同步」：
- 软链接优先（省空间、改动即生效），失败回退完整复制
- 各 Agent **内置技能自动跳过**，绝不覆盖
- 已删除的技能残留链接自动回收进废纸篓

### 4. 市场安装
从 Anthropic 官方 / 社区市场浏览技能，一键安装进本地库。

## 🗂️ 目录约定

| Agent | Skills 目录 |
|---|---|
| Claude / Claude Code | `~/.claude/skills` |
| Codex | `~/.codex/skills` |
| Qoder | `~/.qoder/skills` |
| Qoder Work | `~/.qoderworkcn/skills` |
| CodeWhale | `~/.codewhale/skills` |
| Trae | `~/.trae/skills` |
| Reasonix | `~/.reasonix/skills` |
| OpenCode | `~/.config/opencode/skills` |
| OpenClaw | `~/.openclaw/skills` |
| Cursor | `~/.cursor/skills` |
| Gemini | `~/.gemini/skills` |

## 🧰 技术栈

- **Tauri 2** (Rust) — 轻量跨平台桌面
- **React 19 + TypeScript** — 前端
- **Tailwind CSS 4** — 样式
- **rusqlite** — 元数据存储（预留）
- **GitHub Actions** — CI/CD 双平台构建

## 📄 License

MIT