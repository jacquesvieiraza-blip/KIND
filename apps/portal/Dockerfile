FROM node:20-alpine

WORKDIR /app

# Copy root workspace config
COPY package.json yarn.lock ./

# Copy package.json files for all workspaces (layer cache)
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/portal/package.json ./apps/portal/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/portal ./apps/portal

# ── NEXT_PUBLIC_* must be present at BUILD time (baked into the client bundle).
# Railway passes service variables as build args; promote each to ENV before build.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_HUBSPOT_CONNECTED
ARG NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20
ARG NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40
ARG NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100
ARG NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20
ARG NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40
ARG NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_HUBSPOT_CONNECTED=$NEXT_PUBLIC_HUBSPOT_CONNECTED \
    NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20=$NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20 \
    NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40=$NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40 \
    NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100=$NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100 \
    NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20=$NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20 \
    NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40=$NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40 \
    NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100=$NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100

# Build in dependency order
RUN yarn workspace @kind/db build && \
    yarn workspace @kind/shared build && \
    yarn workspace @kind/portal build

EXPOSE 3000
CMD ["yarn", "workspace", "@kind/portal", "start"]
