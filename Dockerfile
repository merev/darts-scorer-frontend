# Stage 1: build
FROM node:20-alpine AS build

WORKDIR /app

# Enable Corepack so the "packageManager" field works (Yarn 4.x)
RUN corepack enable

# Copy only the manifest/lockfile first for better Docker cache
COPY package.json yarn.lock ./

# Use Yarn v4's preferred flag: --immutable
RUN yarn install --immutable

# Now copy the rest of your source
COPY . .

RUN yarn build

# Stage 2: lightweight runtime, no NGINX
FROM node:20-alpine

WORKDIR /app

RUN yarn global add serve

COPY --from=build /app/dist ./dist

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]
