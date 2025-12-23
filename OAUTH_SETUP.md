# Настройка Яндекс OAuth

## Шаги для настройки:

1. **Перейдите на https://oauth.yandex.ru/**

2. **Создайте новое приложение:**
   - Нажмите "Зарегистрировать новое приложение"
   - Заполните форму:
     - **Название**: ProjectHelper
     - **Платформы**: Web-сервисы
     - **Callback URI #1**: `http://localhost:8080/auth/complete/yandex-oauth2/`
     - **Callback URI #2** (опционально): `http://127.0.0.1:8080/auth/complete/yandex-oauth2/`

3. **Скопируйте ключи:**
   - **Client ID** (ID приложения)
   - **Client Secret** (Пароль)

4. **Добавьте в `.env` файл в корне проекта:**
   ```env
   YANDEX_OAUTH2_KEY=ваш-client-id
   YANDEX_OAUTH2_SECRET=ваш-client-secret
   YANDEX_OAUTH2_REDIRECT_URI=http://localhost:8080/auth/complete/yandex-oauth2/
   ```

5. **Перезапустите контейнеры:**
   ```bash
   docker-compose restart api
   ```

## Важно:

- Callback URI должен **точно совпадать** с тем, что указано в Яндекс OAuth
- Используйте `http://localhost:8080` (не `http://127.0.0.1:8080`), если не указали оба варианта
- После изменения настроек в Яндекс OAuth может потребоваться несколько минут для применения

## Проверка:

После настройки попробуйте авторизоваться через кнопку "Войти через Яндекс" на главной странице.

