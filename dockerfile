# --- Base image ---
FROM node:20-alpine AS base
WORKDIR /app

# --- Dependencies (cached layer) ---
FROM base AS deps
COPY package*.json ./
RUN npm ci

# --- Builder ---
FROM base AS builder
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# If using Prisma, generate client during build
RUN npx prisma generate

# Build Next.js
RUN npm run build

# --- Runner (final slim image) ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# ✅ Ensure DB folder exists and is writable
RUN mkdir -p /app/db && chown -R nextjs:nextjs /app

# Copy only needed files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
