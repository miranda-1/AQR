# Servidor de comparação do AQR (Node.js + Fastify), para hospedar num contêiner.
# Na Cloudflare, é a imagem do contêiner (cloudflare/wrangler.jsonc); serve em qualquer outro lugar
# que rode Docker. O site (dist/) é servido à parte; este contêiner só atende /api/*.

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig*.json ./
COPY server ./server
COPY shared ./shared
RUN npm run build:server

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist-server ./dist-server
USER node
EXPOSE 3000
CMD ["node", "dist-server/server/main.js"]
