FROM node:20-alpine

WORKDIR /app

# Copy root workspace config
COPY package.json yarn.lock ./

# Copy package.json files for all workspaces (layer cache)
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin

# ── NEXT_PUBLIC_* must be present at BUILD time (baked into the client bundle).
# Railway passes service variables as build args; promote each to ENV before build.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_ADMIN_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_ADMIN_KEY=$NEXT_PUBLIC_ADMIN_KEY

# Build in dependency order
RUN yarn workspace @kind/db build && \
    yarn workspace @kind/shared build && \
    yarn workspace @kind/admin build

EXPOSE 3001
CMD ["yarn", "workspace", "@kind/admin", "start"]
