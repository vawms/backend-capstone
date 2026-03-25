# ---- Build stage ----
FROM node:25-alpine AS build

# Native build tools needed for bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies (layer caching: package files first)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:25-alpine

# pg_isready for the entrypoint health-wait
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy node_modules from build stage (avoids a second npm ci + native build tools)
COPY --from=build /app/node_modules ./node_modules

# Copy package files
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

# Copy compiled output
COPY --from=build /app/dist ./dist

# Copy source files needed at runtime (migrations, seeds, ormconfig)
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json

# Entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
