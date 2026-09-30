FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contratos/package.json packages/contratos/package.json
RUN npm ci
COPY . .
RUN npm run build --workspace @cadastro/contratos && npm run build --workspace @cadastro/api && test -f apps/api/dist/main.js

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contratos/package.json packages/contratos/package.json
RUN npm ci --omit=dev
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/packages/contratos/package.json ./packages/contratos/package.json
COPY --from=build --chown=node:node /app/packages/contratos/dist ./packages/contratos/dist
RUN mkdir -p /app/logs && chown node:node /app/logs
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
