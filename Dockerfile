FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Expo 靜態網頁版（給手機瀏覽器直接開，用於看護端試用）
RUN npx expo export --platform web

FROM nginx:alpine
LABEL org.opencontainers.image.title="caremate-app"
LABEL org.opencontainers.image.description="CareMate AI — 長照協作 App（網頁預覽版）"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/healthz || exit 1
