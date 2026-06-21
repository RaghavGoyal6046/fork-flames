# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files and install production dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed node_modules from builder
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copy backend source code
COPY backend/ ./backend/

# Copy frontend static assets
COPY index.html ./
COPY css/ ./css/
COPY js/ ./js/
COPY pages/ ./pages/
COPY assets/ ./assets/

# Ensure uploads directory exists
RUN mkdir -p /app/backend/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5001

WORKDIR /app/backend

CMD ["node", "server.js"]
