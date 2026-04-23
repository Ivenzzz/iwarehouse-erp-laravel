#!/bin/bash
set -e

echo "→ Pulling latest code from GitHub..."
git pull origin main

echo "→ Installing dependencies..."
composer install --no-dev --optimize-autoloader

echo "→ Running migrations..."
php artisan migrate --force

echo "→ Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear
php artisan optimize

echo "→ Building assets..."
npm run build

echo "→ Restarting PHP-FPM..."
sudo systemctl restart php8.3-fpm

echo "✓ Deployment complete."