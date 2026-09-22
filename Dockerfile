FROM node:24.16.0-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY shared/package.json shared/tsconfig.json ./shared/
COPY server/package.json server/tsconfig.json ./server/
COPY web/package.json web/tsconfig.json web/vite.config.ts web/index.html ./web/

RUN pnpm install --frozen-lockfile

COPY shared ./shared
COPY server ./server
COPY web ./web

RUN pnpm build

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/hotwords.sqlite \
    WEB_DIST_PATH=/app/web/dist

RUN mkdir -p /data

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["sh", "-c", "pnpm db:seed && pnpm --filter @hotwords/server start"]
