# Быстрый запуск проекта

## Требования
- Docker
- Docker Compose

## Шаги для запуска

1. **Создайте файл `.env` в корне проекта:**
```bash
SECRET_KEY=your-secret-key-here
YANDEX_OAUTH2_KEY=your-yandex-oauth2-key
YANDEX_OAUTH2_SECRET=your-yandex-oauth2-secret
```

2. **Запустите проект:**
```bash
docker-compose up --build
```

3. **Откройте в браузере:**
http://localhost:8080

## Структура сервисов

- **nginx** (порт 8080) - основной прокси-сервер
- **api** (Django) - REST API на порту 8000
- **frontend** (React) - фронтенд приложение
- **db** (PostgreSQL) - база данных

## Полезные команды

```bash
# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f

# Создание суперпользователя
docker-compose exec api python manage.py createsuperuser

# Выполнение миграций
docker-compose exec api python manage.py migrate
```

## Настройка Яндекс OAuth

1. Перейдите на https://oauth.yandex.ru/
2. Создайте приложение
3. Callback URI: `http://localhost:8080/auth/complete/yandex-oauth2/`
4. Добавьте ключи в `.env`



