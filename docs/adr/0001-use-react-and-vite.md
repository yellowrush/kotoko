# 0001 - Use React + Vite

- **Status**: Accepted
- **Date**: 2026-08-05

## Context

First Release 需要 Local-first、PWA、离线与本地数据（IndexedDB）紧密集成，并以 React 构建单页应用。

## Decision

- Web 前端使用 **React + TypeScript + Vite**。
- 状态管理：TanStack Query（服务端公共数据）、Zustand（应用/页面状态）、Dexie.js（本地持久化）、React Hook Form（表单）。
- 样式：Tailwind CSS + shadcn/ui（Radix UI）。

## Consequences

- 生态成熟、与 Service Worker / IndexedDB / PWA 集成自然。
- 领域逻辑可拆分为独立 package，前后端边界清晰。
- 后续可平滑迁移到 React Native / Expo。