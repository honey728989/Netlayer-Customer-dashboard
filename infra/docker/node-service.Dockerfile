FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY services ./services
RUN npm install
RUN npm run build

FROM node:20-bookworm-slim AS runtime

ARG SERVICE_PATH
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/${SERVICE_PATH}/dist ./dist

CMD ["node", "dist/index.js"]
