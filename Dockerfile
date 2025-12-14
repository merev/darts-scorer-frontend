# Stage 1: build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# Stage 2: lightweight runtime, no NGINX
FROM node:20-alpine

WORKDIR /app

# Simple static file server
RUN yarn global add serve

COPY --from=build /app/dist ./dist

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]
