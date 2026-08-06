# Kodoko API（apps/api）部署用 Dockerfile
# 放在 repo 根目錄：pnpm workspace 需要完整 repo 內容才能解析 @kodoko/* 依賴。
FROM node:22-slim

WORKDIR /app

RUN npm install -g pnpm@10.28.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/api

EXPOSE 3001
ENV PORT=3001
CMD ["pnpm", "start"]
