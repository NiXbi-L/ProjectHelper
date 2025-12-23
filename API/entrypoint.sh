#!/bin/bash

echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Database is ready!"

echo "Making migrations..."
python manage.py makemigrations || echo "No new migrations to make"

echo "Applying migrations..."
python manage.py migrate || exit 1

echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Static files collection failed"

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000

