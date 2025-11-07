# --- build web ---
FROM node:18-alpine AS webbuild
WORKDIR /app
COPY packages/web ./packages/web
COPY package.json ./
COPY packages/web/package.json ./packages/web/
RUN cd packages/web && npm install && npm run build

# --- build server ---
FROM node:18-alpine AS serverbuild
WORKDIR /app
COPY packages/server ./packages/server
COPY package.json ./
COPY packages/server/package.json ./packages/server/
RUN cd packages/server && npm install && npx prisma generate && npm run build

# --- runtime ---
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Copiar archivos compilados
COPY --from=serverbuild /app/packages/server/dist ./packages/server/dist
COPY --from=serverbuild /app/packages/server/package.json ./packages/server/
COPY --from=serverbuild /app/packages/server/prisma ./packages/server/prisma
COPY --from=webbuild /app/packages/web/dist ./packages/web/dist

# Instalar dependencias de producción y generar cliente Prisma
RUN cd packages/server && npm install --omit=dev && npx prisma generate

EXPOSE 3001
CMD ["node","packages/server/dist/index.js"]
