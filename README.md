# <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 512 512" style="vertical-align:middle;margin-right:4px"><path fill="#c0543e" d="M256 64c-70 0-128 44-150 106 18-12 40-20 64-22 16-26 44-44 76-48v40c-22 4-40 18-50 38l36 18c-14 26-14 58 0 84l-36 18c10 20 28 34 50 38v40c-32-4-60-22-76-48-24-2-46-10-64-22C128 404 186 448 256 448s128-44 150-106c-18 12-40 20-64 22-16 26-44 44-76 48v-40c22-4 40-18 50-38l-36-18c14-26 14-58 0-84l36-18c-10-20-28-34-50-38V148c32 4 60 22 76 48 24 2 46 10 64 22C384 108 326 64 256 64z"/><circle fill="#c0543e" cx="256" cy="256" r="48"/></svg> SkillHub

跨 Agent 技能管理器 —— 扫描、管理、同步、安装所有 AI Agent 的 skills/plugins。

> 🌐 官网：<https://skillhub.sixzjd.sbs>

![Build](https://github.com/sixzjd/skillhub/actions/workflows/build.yml/badge.svg)
![License](https://img.shields.io/github/license/sixzjd/skillhub)
![Version](https://img.shields.io/github/v/release/sixzjd/skillhub)

## <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0543e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> 特性

- **Agent 扫描**：自动检测本机安装的 24 个主流 Agent（Claude、Claude Code、Codex、Qoder、Qoder Work、CodeWhale、Trae、Reasonix、OpenCode、OpenClaw、Cursor、Gemini、ZCode、Qwen Code、iFlow CLI、GitHub Copilot、Amp、Crush、Goose、Windsurf、Kiro、Cline、Roo Code、Zed 等），列出每个 Agent 的 skills
- **本地库（SSOT）**：`~/.agents/skills/` 作为单一事实源，统一管理所有第三方/自建技能
- **一键同步**：把本地库技能软链接（失败回退复制）到任意选中的 Agent
- **内置保护**：各 Agent 自带的内置技能绝不外传、绝不覆盖；孤儿链接自动回收进废纸篓
- **技能市场**：内置 Anthropic 官方 + 社区市场，浏览、下载、安装一键完成
- **多语言**：简体中文 / 繁體中文 / English / 日本語

## <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0543e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg> 平台

| 平台 | 支持 |
|---|---|
| macOS | <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a9d6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> DMG |
| Windows | <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a9d6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> MSI / EXE |
| Linux | <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a9d6e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> (可选) |

## <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0543e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg> 快速开始

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

## <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0543e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> 使用说明

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

## <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0543e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2"/></svg> 目录约定

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

## <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0543e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> 技术栈

- **Tauri 2** (Rust) — 轻量跨平台桌面
- **React 19 + TypeScript** — 前端
- **Tailwind CSS 4** — 样式
- **rusqlite** — 元数据存储（预留）
- **GitHub Actions** — CI/CD 双平台构建

## <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0543e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> License

MIT
