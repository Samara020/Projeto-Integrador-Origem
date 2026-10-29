# Frontend Next.js do Origem, em três estágios.
# 1. deps:    instala as dependências exatas do package-lock (camada reaproveitada no cache).
# 2. build:   compila o Next em modo standalone (só o necessário para rodar).
# 3. runtime: imagem final enxuta, sem código-fonte, sem devDependencies, usuário sem root.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Variáveis NEXT_PUBLIC_* são gravadas no bundle na hora do build, por isso entram como ARG.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_CONCORRENCIA_API_URL=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CONCORRENCIA_API_URL=$NEXT_PUBLIC_CONCORRENCIA_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/categorias" > /dev/null || exit 1
CMD ["node", "server.js"]
