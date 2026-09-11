# build stage
FROM node:26-alpine as build-stage

LABEL maintainer=brian@toimc.com

# 创建一个工作目录
WORKDIR /app

COPY . .

RUN corepack enable && pnpm install --frozen-lockfile && pnpm build

# production stage
FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
