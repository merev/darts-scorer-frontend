# Stage 1: build
FROM node:20-alpine AS build

WORKDIR /app

# Enable Corepack so Yarn 4 is used based on "packageManager" in package.json
RUN corepack enable

# Copy manifests and Yarn config
COPY package.json yarn.lock .yarnrc.yml ./
# If you have a .yarn directory (Yarn 4 typical), copy it too
COPY .yarn .yarn

# Copy the rest of the source (this is where your src, vite.config.ts etc come in)
COPY . .

# Now install dependencies (after all files are in place)
RUN yarn install --immutable

# Build the app
RUN yarn build

# Stage 2: runtime, static server (no NGINX in this container)
FROM node:20-alpine

WORKDIR /app

RUN yarn global add serve

COPY --from=build /app/dist ./dist

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]
