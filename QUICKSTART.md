# Быстрый старт

## 1. Установка зависимостей

```bash
pip install -r API/requirements.txt
```

## 2. Настройка переменных окружения

Создайте файл `.env` в папке `API`:

```env
SECRET_KEY=django-insecure-your-secret-key-here-change-in-production
YANDEX_OAUTH2_KEY=your-yandex-oauth2-client-id
YANDEX_OAUTH2_SECRET=your-yandex-oauth2-client-secret
```

## 3. Применение миграций

```bash
cd API
python manage.py makemigrations
python manage.py migrate
```

## 4. Создание суперпользователя (опционально)

```bash
cd API
python manage.py createsuperuser
```

## 5. Запуск сервера

```bash
cd API
python manage.py runserver
```

Сервер будет доступен по адресу: http://localhost:8000

## 6. Настройка Яндекс OAuth

1. Перейдите на https://oauth.yandex.ru/
2. Нажмите "Зарегистрировать новое приложение"
3. Заполните форму:
   - Название: ProjectHelper
   - Платформы: Web-сервисы
   - Callback URI: `http://localhost:8000/auth/complete/yandex-oauth2/`
4. Скопируйте Client ID и Client Secret в файл `API/.env`

## 7. Тестирование API

После запуска сервера:

1. Откройте в браузере: http://localhost:8000/auth/login/yandex-oauth2/
2. Авторизуйтесь через Яндекс (только @dvfu.ru)
3. После успешной авторизации вы получите токен
4. Используйте токен для доступа к API

Примеры использования API смотрите в файле `API_EXAMPLES.md`

## Админ-панель

Доступна по адресу: http://localhost:8000/admin/

Используйте учетные данные суперпользователя, созданного на шаге 4.

