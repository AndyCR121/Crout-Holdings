FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

RUN apk add --no-cache gettext

COPY --from=build /app/dist/crout-automations/browser/ ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/env.template.js /usr/share/nginx/html/env.template.js
COPY docker/entrypoint.sh /docker-entrypoint.d/40-generate-env.sh

RUN chmod +x /docker-entrypoint.d/40-generate-env.sh

ENV API_URL=/api
