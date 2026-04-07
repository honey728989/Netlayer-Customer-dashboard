FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY apps/noc/package.json ./apps/noc/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/noc/node_modules ./apps/noc/node_modules
COPY . .
RUN pnpm --filter @netlayer/noc build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/noc/dist /usr/share/nginx/html
COPY apps/noc/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
