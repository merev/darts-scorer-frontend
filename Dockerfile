# Stage 1: build
FROM node:20-alpine AS build

WORKDIR /app

# Use Corepack to respect "packageManager": "yarn@4.x"
RUN corepack enable

# Copy manifests (and Yarn config)
COPY package.json yarn.lock .yarnrc.yml ./

# Copy the rest of the project
COPY . .

# Install deps (Yarn 4, but using node_modules linker now)
RUN yarn install --immutable

# Build the Vite app
RUN yarn build

# Stage 2: runtime – pure React container, no NGINX
FROM node:20-alpine

WORKDIR /app

# Simple static server
RUN yarn global add serve

COPY --from=build /app/dist ./dist

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]
