# CasaOS / Docker 배포용 — Vite 정적 빌드를 nginx로 서빙
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite는 빌드 시점에 env를 고정하므로 CasaOS 주소에 맞게 주입
# VITE_SUPABASE_URL이 비어 있으면 프런트는 같은 origin(/auth/v1, /rest/v1, /functions/v1)을 호출
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY="local"
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
