FROM node:22-alpine AS build

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmjs.org
ARG PNPM_REGISTRY=https://registry.npmjs.org

COPY package.json pnpm-lock.yaml ./
RUN npm config set registry ${NPM_REGISTRY} \
    && npm install -g pnpm@10.33.0 \
    && pnpm config set registry ${PNPM_REGISTRY} \
    && pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
