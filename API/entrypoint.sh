#!/bin/bash

echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Database is ready!"

echo "Making migrations..."
python manage.py makemigrations || echo "No new migrations to make"

# Удаляем автоматически созданные миграции для удаления старых моделей (они уже удалены в 0004)
# Ищем миграции, которые пытаются удалить ProjectChatMessage, ProjectMember, DevelopmentStage, StageHint
# НЕ удаляем миграцию 0004, так как она создает новые модели
for file in /app/projects/migrations/000*_remove_*.py; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        # Пропускаем миграции 0004 и 0005
        if [ "$filename" != "0004_remove_old_models_create_new.py" ] && [ "$filename" != "0005_remove_projectchatmessage_author_and_more.py" ]; then
            if grep -q "projectchatmessage\|projectmember\|developmentstage\|stagehint" "$file" 2>/dev/null; then
                echo "Removing duplicate migration: $filename"
                rm -f "$file"
            fi
        fi
    fi
done

echo "Applying migrations..."
# Проверяем состояние базы данных и исправляем несоответствия в истории миграций
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection
cursor = connection.cursor()
try:
    # Проверяем, существует ли таблица django_migrations
    cursor.execute(\"SELECT 1 FROM information_schema.tables WHERE table_name='django_migrations' LIMIT 1\")
    has_migrations_table = cursor.fetchone()
    
    if has_migrations_table:
        # Проверяем, существует ли таблица django_content_type
        cursor.execute(\"SELECT 1 FROM information_schema.tables WHERE table_name='django_content_type' LIMIT 1\")
        has_content_type = cursor.fetchone()
        
        # Проверяем, есть ли записи о contenttypes в django_migrations
        cursor.execute(\"SELECT COUNT(*) FROM django_migrations WHERE app='contenttypes'\")
        contenttypes_count = cursor.fetchone()[0]
        
        # Если таблицы contenttypes нет, но есть записи о миграциях - очищаем все
        if not has_content_type and contenttypes_count == 0:
            # Проверяем, есть ли другие записи о миграциях
            cursor.execute(\"SELECT COUNT(*) FROM django_migrations\")
            total_count = cursor.fetchone()[0]
            if total_count > 0:
                # Есть несоответствие - очищаем всю таблицу django_migrations
                print('Clearing django_migrations due to inconsistent migration history')
                cursor.execute(\"TRUNCATE TABLE django_migrations\")
                connection.commit()
except Exception as e:
    print(f'Could not check database state: {e}')
" 2>/dev/null || echo "Could not check database state"

# Применяем все миграции - Django сам определит правильный порядок
python manage.py migrate || exit 1

echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Static files collection failed"

echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000

