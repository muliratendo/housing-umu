#!/bin/sh
set -e

php artisan config:clear
php artisan cache:clear
php artisan route:clear

php artisan migrate --force
php artisan db:seed --force

php artisan config:cache
php artisan route:cache
php artisan view:cache

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
