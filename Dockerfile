# === Stage 1: Build Frontend Assets ===
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
# Bypass strict peer dependencies for our Vite 8 / OXC plugin tree
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# === Stage 2: Production PHP & Nginx Runtime ===
FROM php:8.3-fpm-alpine

# Install system dependencies & PHP extensions required by Laravel
RUN apk add --no-cache nginx supervisor curl libpng-dev libxml2-dev zip unzip git \
    && docker-php-ext-install pdo_mysql bcmath gd opcache

WORKDIR /var/www/html

# Copy project files
COPY . .
# Bring in the statically built assets from Stage 1
COPY --from=frontend-builder /app/public/build ./public/build

# Install Composer dependencies for production
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Set strict production permissions for Laravel storage engines
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Copy server execution configs
COPY ./docker/nginx.conf /etc/nginx/nginx.conf
COPY ./docker/supervisord.conf /etc/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
