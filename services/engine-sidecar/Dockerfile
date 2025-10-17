FROM node:20-alpine

WORKDIR /app

# Copy engine package
COPY packages/genx-engine /app/packages/genx-engine

# Copy sidecar
COPY services/engine-sidecar /app/services/engine-sidecar

# Install dependencies
WORKDIR /app/packages/genx-engine
RUN npm install && npm run build

WORKDIR /app/services/engine-sidecar
RUN npm install

# Set entrypoint
ENTRYPOINT ["node", "main.js"]
