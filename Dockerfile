FROM node:20-slim

WORKDIR /app

# Build args for client-side env vars (needed at build time by Vite)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Copy package files for all workspaces
COPY package.json package-lock.json ./
COPY models/package.json models/
COPY engine/package.json engine/
COPY server/package.json server/
COPY client/package.json client/

# Install all dependencies
RUN npm ci

# Copy source code
COPY models/ models/
COPY engine/ engine/
COPY server/ server/
COPY client/ client/
COPY enable1.txt .
COPY tsconfig.json .

# Build the client (VITE_ env vars are available via ARG → ENV)
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build --workspace=client

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npx", "tsx", "server/index.ts"]
