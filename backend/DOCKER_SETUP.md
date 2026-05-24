# Docker Setup для CRM LMS Backend

## Обзор

Docker Compose конфигурация включает следующие сервисы:
- **PostgreSQL 16** - База данных (порт 5432)
- **MinIO** - Объектное хранилище для файлов (порты 9000, 9001)

Все сервисы работают в одной Docker сети `crm-lms-network`.

## Быстрый старт

### 1. Запуск инфраструктуры

```bash
# Запустить PostgreSQL и MinIO
docker-compose up -d

# Проверить статус контейнеров
docker-compose ps

# Посмотреть логи
docker-compose logs -f
```

### 2. Доступ к сервисам

**PostgreSQL:**
- Host: `localhost`
- Port: `5432`
- Database: `crm_lms`
- User: `postgres`
- Password: `Beka2004*`

**MinIO API:**
- URL: `http://localhost:9000`
- Access Key: `minioadmin`
- Secret Key: `minioadmin`

**MinIO Console (Web UI):**
- URL: `http://localhost:9001`
- Login: `minioadmin`
- Password: `minioadmin`

### 3. Запуск приложения

**Локально (для разработки):**

```bash
# Убедитесь что Docker Compose запущен
docker-compose up -d

# Запустите приложение через Maven
./mvnw spring-boot:run

# Или через IDE (IntelliJ IDEA, Eclipse)
```

Приложение автоматически подключится к:
- PostgreSQL: `localhost:5432`
- MinIO: `localhost:9000`

**В Docker (для production):**

Чтобы запустить само приложение в Docker:

1. Создайте Dockerfile для приложения
2. Обновите `docker-compose.yml` добавив сервис приложения
3. Используйте имена контейнеров вместо localhost:
   - `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/crm_lms`
   - `MINIO_URL=http://minio:9000`

## Команды Docker Compose

```bash
# Запустить все сервисы
docker-compose up -d

# Остановить все сервисы
docker-compose down

# Остановить и удалить volumes (УДАЛИТ ВСЕ ДАННЫЕ!)
docker-compose down -v

# Перезапустить конкретный сервис
docker-compose restart postgres
docker-compose restart minio

# Посмотреть логи
docker-compose logs -f postgres
docker-compose logs -f minio

# Войти в контейнер PostgreSQL
docker exec -it crm-lms-postgres psql -U postgres -d crm_lms

# Войти в контейнер MinIO
docker exec -it crm-lms-minio sh
```

## Первоначальная настройка

### PostgreSQL

После первого запуска PostgreSQL:

1. Приложение автоматически создаст таблицы через Flyway миграции
2. DataSeeder создаст SUPER_ADMIN пользователя:
   - Email: `admin@crmlms.kz`
   - Password: `Admin123!`

### MinIO

После первого запуска MinIO:

1. Приложение автоматически создаст bucket `crm-lms-files`
2. Можно управлять файлами через MinIO Console: `http://localhost:9001`

## Volumes (Персистентное хранилище)

Docker Compose создает два volume для сохранения данных:

- `postgres-data` - данные PostgreSQL
- `minio-data` - файлы MinIO

Данные сохраняются даже после `docker-compose down`.

Чтобы полностью очистить данные:

```bash
docker-compose down -v
```

## Healthchecks

Оба сервиса имеют healthcheck для мониторинга состояния:

```bash
# Проверить здоровье сервисов
docker-compose ps

# Если сервис unhealthy, посмотреть логи:
docker-compose logs [service-name]
```

## Переменные окружения

Можно переопределить настройки через переменные окружения:

```bash
# Создать .env файл (не коммитить в git!)
cp .env .env

# Отредактировать .env
nano .env

# Docker Compose автоматически подхватит переменные
docker-compose up -d
```

## Troubleshooting

### PostgreSQL не запускается

```bash
# Проверить логи
docker-compose logs postgres

# Возможно порт 5432 занят
lsof -i :5432

# Остановить другой PostgreSQL и перезапустить
docker-compose restart postgres
```

### MinIO не запускается

```bash
# Проверить логи
docker-compose logs minio

# Возможно порты 9000 или 9001 заняты
lsof -i :9000
lsof -i :9001

# Перезапустить MinIO
docker-compose restart minio
```

### Приложение не может подключиться к БД

```bash
# Проверить что PostgreSQL запущен
docker-compose ps postgres

# Проверить что healthcheck успешен
docker inspect crm-lms-postgres | grep -A 5 Health

# Проверить network
docker network inspect crm-lms-network
```

### Приложение не может подключиться к MinIO

```bash
# Проверить что MinIO запущен
docker-compose ps minio

# Проверить доступность MinIO API
curl http://localhost:9000/minio/health/live

# Проверить MinIO Console
open http://localhost:9001
```

## Бекап данных

### PostgreSQL

```bash
# Создать дамп базы данных
docker exec crm-lms-postgres pg_dump -U postgres crm_lms > backup.sql

# Восстановить из дампа
docker exec -i crm-lms-postgres psql -U postgres crm_lms < backup.sql
```

### MinIO

```bash
# Скопировать все файлы из MinIO
docker exec crm-lms-minio mc mirror /data/crm-lms-files /backup

# Или использовать MinIO Console для экспорта
```

## Production рекомендации

Для production окружения:

1. **Измените пароли:**
   - PostgreSQL: используйте сильный пароль
   - MinIO: смените `minioadmin` на безопасные ключи

2. **Используйте внешние volumes:**
   - Храните данные на отдельных дисках
   - Настройте регулярный бекап

3. **Настройте SSL/TLS:**
   - PostgreSQL: включите SSL
   - MinIO: используйте HTTPS

4. **Ограничьте доступ:**
   - Не публикуйте порты напрямую
   - Используйте nginx как reverse proxy

5. **Мониторинг:**
   - Настройте логирование
   - Используйте Prometheus + Grafana
   - Настройте алерты

## Разработка vs Production

### Development (текущая конфигурация)

```yaml
# docker-compose.yml
ports:
  - "5432:5432"  # PostgreSQL доступен на localhost
  - "9000:9000"  # MinIO API доступен на localhost
  - "9001:9001"  # MinIO Console доступен на localhost
```

### Production

Создайте `docker-compose.prod.yml`:

```yaml
services:
  postgres:
    # Не публиковать порт наружу
    expose:
      - "5432"

  minio:
    # Не публиковать порт наружу
    expose:
      - "9000"
    # Console только для админов
    ports:
      - "127.0.0.1:9001:9001"

  backend:
    build: .
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/crm_lms
      MINIO_URL: http://minio:9000
    depends_on:
      - postgres
      - minio
    ports:
      - "8080:8080"
```
