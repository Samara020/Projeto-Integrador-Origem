# API Node/Express do Origem. O contexto de build é a RAIZ do repositório
# (precisa de database/sql para criar tabelas e seed na primeira subida).
#   docker compose up --build backend

FROM node:24-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /srv/backend/app
COPY backend/app/package.json backend/app/package-lock.json ./
RUN npm ci
COPY backend/app/tsconfig.json ./
COPY backend/app/prisma ./prisma
COPY backend/app/src ./src
RUN npx prisma generate && npm run build

FROM node:24-slim AS runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /srv/backend/app
COPY --from=build /srv/backend/app/node_modules ./node_modules
COPY --from=build /srv/backend/app/dist ./dist
COPY --from=build /srv/backend/app/prisma ./prisma
COPY backend/app/package.json ./
# O app procura os scripts em ../../database/sql, relativo ao WORKDIR.
COPY database/sql /srv/database/sql
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
