# Примеры использования API

## Авторизация

### 1. Авторизация через Яндекс OAuth

1. Перейдите на `/auth/login/yandex-oauth2/`
2. После успешной авторизации вы будете перенаправлены
3. Токен будет создан автоматически

### 2. Получение информации о текущем пользователе

```http
GET /api/auth/users/me/
Authorization: Token your-token-here
```

## Проекты

### 1. Создание проекта

```http
POST /api/projects/projects/
Authorization: Token your-token-here
Content-Type: application/json

{
  "name": "Мой проект",
  "description": "Описание проекта"
}
```

### 2. Получение списка проектов

```http
GET /api/projects/projects/
Authorization: Token your-token-here
```

### 3. Получение деталей проекта

```http
GET /api/projects/projects/{id}/
Authorization: Token your-token-here
```

### 4. Вход в проект

```http
GET /api/projects/projects/{id}/enter/
Authorization: Token your-token-here
```

### 5. Добавление участника в проект

```http
POST /api/projects/projects/{id}/add_member/
Authorization: Token your-token-here
Content-Type: application/json

{
  "email": "student@dvfu.ru"
}
```

### 6. Обновление проекта

```http
PUT /api/projects/projects/{id}/
Authorization: Token your-token-here
Content-Type: application/json

{
  "name": "Обновленное название",
  "description": "Обновленное описание"
}
```

## Этапы разработки

### 1. Создание этапа

```http
POST /api/projects/stages/
Authorization: Token your-token-here
Content-Type: application/json

{
  "project": 1,
  "name": "Планирование",
  "stage_type": "planning",
  "description": "Этап планирования проекта",
  "order": 1
}
```

### 2. Получение этапов проекта

```http
GET /api/projects/stages/?project=1
Authorization: Token your-token-here
```

### 3. Переключение статуса завершения этапа

```http
POST /api/projects/stages/{id}/toggle_complete/
Authorization: Token your-token-here
```

### 4. Обновление этапа

```http
PUT /api/projects/stages/{id}/
Authorization: Token your-token-here
Content-Type: application/json

{
  "name": "Обновленное название",
  "is_completed": true
}
```

## Комментарии к этапам

### 1. Создание комментария

```http
POST /api/projects/comments/
Authorization: Token your-token-here
Content-Type: application/json

{
  "stage": 1,
  "text": "Это мой комментарий к этапу"
}
```

### 2. Получение комментариев этапа

```http
GET /api/projects/comments/?stage=1
Authorization: Token your-token-here
```

## Чат проекта

### 1. Отправка сообщения в чат

```http
POST /api/projects/chat/
Authorization: Token your-token-here
Content-Type: application/json

{
  "project": 1,
  "text": "Привет всем! Это сообщение в общий чат проекта"
}
```

### 2. Получение сообщений чата

```http
GET /api/projects/chat/?project=1
Authorization: Token your-token-here
```

## Подсказки

### 1. Получение подсказок для этапа

```http
GET /api/projects/hints/?stage=1
Authorization: Token your-token-here
```

## Типы этапов

Доступные типы этапов:
- `planning` - Планирование
- `analysis` - Анализ
- `design` - Проектирование
- `development` - Разработка
- `testing` - Тестирование
- `deployment` - Внедрение
- `maintenance` - Поддержка

## Примеры использования с curl

### Создание проекта

```bash
curl -X POST http://localhost:8000/api/projects/projects/ \
  -H "Authorization: Token your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Мой проект",
    "description": "Описание проекта"
  }'
```

### Добавление участника

```bash
curl -X POST http://localhost:8000/api/projects/projects/1/add_member/ \
  -H "Authorization: Token your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@dvfu.ru"
  }'
```

### Отправка сообщения в чат

```bash
curl -X POST http://localhost:8000/api/projects/chat/ \
  -H "Authorization: Token your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "project": 1,
    "text": "Привет всем!"
  }'
```




