FROM node:20-alpine

WORKDIR /app

# Copy root workspace config
COPY package.json yarn.lock ./

# Copy package.json files for all workspaces (layer cache)
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build in dependency order
RUN yarn workspace @kind/db build && \
    yarn workspace @kind/shared build && \
    yarn workspace @kind/api build

CMD ["node", "apps/api/dist/index.js"]
