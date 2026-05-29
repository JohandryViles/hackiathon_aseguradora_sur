FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

ARG VITE_CONVEX_URL=https://acoustic-tiger-618.convex.cloud
ARG VITE_CONVEX_SITE_URL=https://acoustic-tiger-618.convex.site
ARG AI_ENABLED=true

ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_CONVEX_SITE_URL=$VITE_CONVEX_SITE_URL
ENV AI_ENABLED=$AI_ENABLED

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT:-3000}"]
