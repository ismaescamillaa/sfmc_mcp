# ---------- builder: compile TypeScript ----------
FROM node:20-alpine AS builder

# Use a non-root user if necesario (opcional)
WORKDIR /app

# Copy manifest and install all deps (including dev)
COPY package*.json ./
RUN npm ci

# Copy tsconfig and source, then build
COPY tsconfig.json .
COPY src ./src
RUN npx tsc --build

# ---------- production image ----------
FROM node:20-alpine AS prod

WORKDIR /app

# Copy only what runtime needs: compiled output and prod deps
COPY --from=builder /app/build ./build
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

ENV NODE_ENV=production

# Expose the port the MCP server listens on
EXPOSE 3000

# Run the compiled output
CMD ["node", "build/server.js"]

# ---------- development image (hot-reload) ----------
FROM node:20-alpine AS dev

WORKDIR /app

# Copy manifest and install all deps (including dev)
COPY package*.json ./
RUN npm ci

# Copy source and config
COPY tsconfig.json .
COPY src ./src

# Expose port for development
EXPOSE 3000

# Use ts-node-dev for hot-reload (assumes "dev" script in package.json)
# e.g., "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
CMD ["npm", "run", "start"]
