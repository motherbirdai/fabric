# ─── Build stage ───
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma/
COPY src ./src/
RUN npx prisma generate
RUN npm run build

# ─── Production stage ───
FROM node:22-alpine AS production
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S fabric && \
    adduser -S fabric -u 1001 -G fabric

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/
COPY scripts/start.sh ./start.sh
RUN chmod +x start.sh

# Health check (shallow endpoint for container orchestrators)
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/healthz || exit 1

USER fabric

EXPOSE 3100
CMD ["./start.sh"]
