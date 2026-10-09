# csp-booking-portal Dockerfile
# Multi-stage build: build Angular app, then serve with nginx

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist/csp-booking-portal/browser /usr/share/nginx/html

# The CORS rule is rendered from the container environment at startup (ADR-026)
COPY deploy/runtime/cors-origin.conf.template /opt/csp-runtime/cors-origin.conf.template
COPY deploy/runtime/40-render-cors.sh /docker-entrypoint.d/40-render-cors.sh
RUN chmod +x /docker-entrypoint.d/40-render-cors.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
