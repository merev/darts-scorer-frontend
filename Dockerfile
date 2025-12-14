# Stage 1: build
FROM node:20-alpine AS build

WORKDIR /app

# Enable Corepack so Yarn 4 is used according to "packageManager" in package.json
RUN corepack enable

# Copy manifests first (so Docker can cache deps when they don’t change)
COPY package.json yarn.lock ./

# Copy the rest of the project (src, vite.config.ts, etc.)
COPY . .

# Install dependencies with Yarn 4 (uses PnP by default)
RUN yarn install --immutable

# Build the Vite app
RUN yarn build

# Stage 2: runtime – pure React container, no NGINX
FROM node:20-alpine

WORKDIR /app

# Tiny static server
RUN yarn global add serve

COPY --from=build /app/dist ./dist

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]
