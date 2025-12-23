# Запуск проекта с Docker Compose

## Требования

- Docker
- Docker Compose

## Быстрый старт

1. Создайте файл `.env` в корне проекта на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите:
- `SECRET_KEY` - секретный ключ Django
- `YANDEX_OAUTH2_KEY` - Client ID из Яндекс OAuth
- `YANDEX_OAUTH2_SECRET` - Client Secret из Яндекс OAuth

2. Запустите проект:

```bash
docker-compose up --build
```

3. Откройте в браузере: http://localhost:8080

## Структура сервисов

- **nginx** (порт 8080) - прокси-сервер, маршрутизирует запросы
- **api** (порт 8000) - Django REST API
- **frontend** (порт 80) - React приложение
- **db** - PostgreSQL база данных

## Команды

### Запуск в фоновом режиме
```bash
docker-compose up -d
```

### Остановка
```bash
docker-compose down
```

### Просмотр логов
```bash
docker-compose logs -f
```

### Выполнение команд в контейнере API
```bash
docker-compose exec api python manage.py createsuperuser
docker-compose exec api python manage.py migrate
```

### Пересборка после изменений
```bash
docker-compose up --build
```

## Настройка Яндекс OAuth

1. Перейдите на https://oauth.yandex.ru/
2. Создайте новое приложение
3. Укажите Callback URI: `http://localhost:8080/auth/complete/yandex-oauth2/`
4. Скопируйте Client ID и Client Secret
5. Добавьте в `.env` файл в корне проекта:
   ```env
   YANDEX_OAUTH2_KEY=ваш-client-id
   YANDEX_OAUTH2_SECRET=ваш-client-secret
   YANDEX_OAUTH2_REDIRECT_URI=http://localhost:8080/auth/complete/yandex-oauth2/
   ```
6. Перезапустите контейнер: `docker-compose restart api`

**Важно:** Callback URI должен точно совпадать с указанным в Яндекс OAuth!

## Доступ к админ-панели

Админ-панель Django доступна по адресу: http://localhost:8080/admin/

Для создания суперпользователя:
```bash
docker-compose exec api python manage.py createsuperuser
```

