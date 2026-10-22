# Bailing Wooden Admin (Next.js 15 dashboard) - production image
# NOTE: API base is resolved at build time for the client bundle
# (NEXT_PUBLIC_API_BASE_URL) and at runtime for server actions
# (ADMIN_API_BASE_URL). Both must point at the public origin that
# Nginx proxies to the backend, e.g. http://43.159.152.116/api/v1.
#   docker build -t bailing-admin:<commit> \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=http://43.159.152.116/api/v1 .
# Base image pinned by major (node:22-alpine); no 'latest'.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL="http://43.159.152.116/api/v1"
# 部署 basePath（生产 /admin；本地留空）。客户端原生 fetch 需据此拼前缀，
# 见 src/lib/base-path.ts。
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# next start needs: .next, public, next.config.*, package.json, node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./
RUN chown -R node:node /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "next", "start", "-p", "3001"]
