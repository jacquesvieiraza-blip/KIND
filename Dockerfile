FROM node:20-alpine

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN npm install

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Build packages in order
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/db
RUN npm run build --workspace=apps/api

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
