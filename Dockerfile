FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Install dependencies inside the container only
RUN npm ci

FROM deps AS builder
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist ./
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
