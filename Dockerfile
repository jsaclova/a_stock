# CasaOS / Docker 배포용 — Vite 정적 빌드를 nginx로 서빙
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# 프런트는 같은 origin(/functions/v1)을 호출하므로 빌드 시 env 주입 불필요
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
