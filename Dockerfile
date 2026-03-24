FROM node:20-slim

WORKDIR /app

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

# Build the client
RUN npm run build --workspace=client

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npx", "tsx", "server/index.ts"]
