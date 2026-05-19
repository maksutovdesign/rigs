# Техническое задание — Платформа Rigs

## ОБЗОР СИСТЕМЫ

**Продукты:**
1. Мобильное приложение iOS + Android (React Native)
2. Веб-сервис (Next.js — SSR для SEO)
3. Бэкенд API (NestJS + PostgreSQL)
4. Панель администратора (React + Ant Design)
5. Панель хоста (часть веб-сервиса + мобильного приложения)

---

## ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Frontend / Mobile
| Слой | Технология | Обоснование |
|------|-----------|-------------|
| Мобильное приложение | React Native + Expo | Один кодбаз iOS + Android |
| Веб-сервис | Next.js 14 (App Router) | SSR для SEO, быстрый рендер |
| UI Kit | Tailwind CSS + Radix UI (веб) / NativeWind (мобайл) | Единый дизайн-токен |
| Карты | Mapbox GL / Яндекс.Карты API | Геопоиск + кластеризация |
| Состояние | Zustand + React Query (TanStack) | Лёгкий стейт + кэш запросов |
| Платежи (UI) | Stripe Elements / ЮKassa виджет | |

### Backend
| Слой | Технология |
|------|-----------|
| API Framework | NestJS (TypeScript) |
| База данных | PostgreSQL 16 + PostGIS (геоданные) |
| ORM | Prisma |
| Кэш | Redis (сессии, очереди, кэш поиска) |
| Очереди | BullMQ (на Redis) |
| Хранилище файлов | S3-совместимое (Yandex Object Storage / AWS S3) |
| Поиск | Elasticsearch (полнотекстовый + фасетный поиск) |
| Реальное время | Socket.io (чат, уведомления) |
| Email | Resend / SMTP |
| SMS / Push | Firebase FCM + SMS (СМSC.ru / SMS Aero) |

### Инфраструктура
| Сервис | Технология |
|--------|-----------|
| Хостинг | Yandex Cloud / VK Cloud |
| Контейнеры | Docker + Kubernetes (k3s на старте) |
| CI/CD | GitHub Actions |
| Мониторинг | Grafana + Prometheus + Sentry |
| CDN | Cloudflare |

### Платежи
- **ЮKassa** (основной эквайринг, РФ)
- **Тинькофф Касса** (альтернатива)
- **СБП** (Система быстрых платежей)
- Залоги — холдирование карты через ЮKassa

---

## АРХИТЕКТУРА СИСТЕМЫ

```
┌─────────────────────────────────────────────────────┐
│                   КЛИЕНТЫ                           │
│  iOS App  │  Android App  │  Web (Next.js)  │  Admin│
└─────┬─────┴──────┬────────┴────────┬────────┴───┬───┘
      │            │                 │            │
      └────────────┴────────┬────────┘            │
                            │                     │
                    ┌───────▼────────┐   ┌────────▼──────┐
                    │   API Gateway  │   │  Admin API     │
                    │   (NestJS)     │   │  (NestJS)      │
                    └───────┬────────┘   └───────────────-┘
                            │
        ┌───────────────────┼───────────────────────┐
        │                   │                       │
┌───────▼──────┐   ┌────────▼──────┐    ┌──────────▼───────┐
│  PostgreSQL  │   │   Redis        │   │  Elasticsearch    │
│  + PostGIS   │   │   (cache/queue)│   │  (search)         │
└──────────────┘   └───────────────┘    └──────────────────┘
        │
┌───────▼──────┐   ┌────────────────┐   ┌──────────────────┐
│  S3 Storage  │   │  Socket.io     │   │  BullMQ Workers  │
│  (медиа)     │   │  (чат/уведом.) │   │  (фоновые задачи)│
└──────────────┘   └────────────────┘   └──────────────────┘
```

---

## СТРУКТУРА БАЗЫ ДАННЫХ

### Таблица: users
```sql
id              UUID PRIMARY KEY
phone           VARCHAR(20) UNIQUE NOT NULL
email           VARCHAR(255) UNIQUE
password_hash   VARCHAR(255)
first_name      VARCHAR(100)
last_name       VARCHAR(100)
avatar_url      VARCHAR(500)
date_of_birth   DATE
role            ENUM('renter', 'host', 'both', 'admin')
status          ENUM('active', 'suspended', 'banned')
kyc_level       ENUM('none', 'phone', 'passport', 'full')
passport_data   JSONB (зашифровано)
rating_as_host  DECIMAL(3,2)
rating_as_renter DECIMAL(3,2)
total_rentals   INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ
```

### Таблица: categories
```sql
id              SERIAL PRIMARY KEY
parent_id       INTEGER REFERENCES categories(id)
slug            VARCHAR(100) UNIQUE NOT NULL
name_ru         VARCHAR(200) NOT NULL
name_en         VARCHAR(200)
icon_url        VARCHAR(500)
cover_url       VARCHAR(500)
sort_order      INTEGER DEFAULT 0
is_active       BOOLEAN DEFAULT TRUE
seo_title       VARCHAR(200)
seo_description TEXT
```

### Таблица: listings
```sql
id              UUID PRIMARY KEY
host_id         UUID REFERENCES users(id)
category_id     INTEGER REFERENCES categories(id)
title           VARCHAR(300) NOT NULL
description     TEXT
listing_type    ENUM('equipment', 'experience', 'location', 'package')
status          ENUM('draft', 'active', 'paused', 'archived', 'moderation')

-- Гео
address         VARCHAR(500)
city            VARCHAR(200)
region          VARCHAR(200)
country         VARCHAR(100) DEFAULT 'RU'
geo_point       GEOGRAPHY(POINT, 4326) -- PostGIS

-- Характеристики
brand           VARCHAR(200)
model           VARCHAR(200)
year            INTEGER
condition       ENUM('new', 'excellent', 'good', 'fair')
quantity        INTEGER DEFAULT 1
available_qty   INTEGER DEFAULT 1

-- Ценообразование
price_hourly    DECIMAL(10,2)
price_daily     DECIMAL(10,2)
price_weekly    DECIMAL(10,2)
price_monthly   DECIMAL(10,2)
deposit_amount  DECIMAL(10,2)
currency        VARCHAR(3) DEFAULT 'RUB'

-- Правила
min_rental_hours INTEGER DEFAULT 2
max_rental_days  INTEGER
instant_book     BOOLEAN DEFAULT FALSE
delivery_available BOOLEAN DEFAULT FALSE
delivery_radius_km INTEGER
delivery_price_per_km DECIMAL(10,2)

-- Требования к арендатору
requires_passport BOOLEAN DEFAULT FALSE
requires_license  BOOLEAN DEFAULT FALSE
requires_cert     BOOLEAN DEFAULT FALSE
min_age           INTEGER DEFAULT 18

-- SEO + поиск
tags            TEXT[]
search_vector   TSVECTOR
views_count     INTEGER DEFAULT 0
bookings_count  INTEGER DEFAULT 0
rating          DECIMAL(3,2)
reviews_count   INTEGER DEFAULT 0

created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ
```

### Таблица: listing_media
```sql
id              UUID PRIMARY KEY
listing_id      UUID REFERENCES listings(id)
url             VARCHAR(500) NOT NULL
type            ENUM('photo', 'video')
sort_order      INTEGER DEFAULT 0
is_cover        BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Таблица: listing_attributes
```sql
id              SERIAL PRIMARY KEY
listing_id      UUID REFERENCES listings(id)
key             VARCHAR(100) NOT NULL  -- 'weight_kg', 'size', 'color'...
value           VARCHAR(500)
unit            VARCHAR(50)
```

### Таблица: availability
```sql
id              UUID PRIMARY KEY
listing_id      UUID REFERENCES listings(id)
date            DATE NOT NULL
available_qty   INTEGER NOT NULL
status          ENUM('available', 'blocked', 'booked')
blocked_reason  VARCHAR(200)
UNIQUE(listing_id, date)
```

### Таблица: bookings
```sql
id              UUID PRIMARY KEY
listing_id      UUID REFERENCES listings(id)
renter_id       UUID REFERENCES users(id)
host_id         UUID REFERENCES users(id)

status          ENUM(
  'pending',       -- ожидает подтверждения хоста
  'confirmed',     -- подтверждено
  'paid',          -- оплачено
  'active',        -- идёт аренда
  'completed',     -- завершено
  'cancelled_renter',
  'cancelled_host',
  'disputed',      -- спор
  'refunded'
)

start_date      TIMESTAMPTZ NOT NULL
end_date        TIMESTAMPTZ NOT NULL
quantity        INTEGER DEFAULT 1

-- Стоимость
subtotal        DECIMAL(10,2)  -- стоимость аренды
service_fee     DECIMAL(10,2)  -- комиссия арендатора
insurance_fee   DECIMAL(10,2)
delivery_fee    DECIMAL(10,2)
deposit_amount  DECIMAL(10,2)
total_amount    DECIMAL(10,2)

-- Выплата хосту
host_payout     DECIMAL(10,2)
host_commission DECIMAL(10,2)
host_paid_at    TIMESTAMPTZ

-- Доставка
delivery_type   ENUM('pickup', 'delivery')
delivery_address VARCHAR(500)
delivery_geo    GEOGRAPHY(POINT, 4326)

-- Медиа при выдаче/возврате
checkin_photos  TEXT[]
checkout_photos TEXT[]
checkin_note    TEXT
checkout_note   TEXT

-- Коды подтверждения
checkin_code    VARCHAR(6)
checkout_code   VARCHAR(6)

cancellation_reason TEXT
cancelled_at    TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ
```

### Таблица: payments
```sql
id              UUID PRIMARY KEY
booking_id      UUID REFERENCES bookings(id)
user_id         UUID REFERENCES users(id)
type            ENUM('charge', 'hold', 'release', 'refund', 'payout')
amount          DECIMAL(10,2)
currency        VARCHAR(3) DEFAULT 'RUB'
status          ENUM('pending', 'processing', 'completed', 'failed')
provider        ENUM('yookassa', 'tinkoff', 'sbp')
provider_id     VARCHAR(200)   -- ID транзакции в платёжной системе
provider_data   JSONB
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Таблица: reviews
```sql
id              UUID PRIMARY KEY
booking_id      UUID REFERENCES bookings(id) UNIQUE
reviewer_id     UUID REFERENCES users(id)
reviewee_id     UUID REFERENCES users(id)
listing_id      UUID REFERENCES listings(id)
role            ENUM('renter_reviews_host', 'host_reviews_renter')
rating          INTEGER CHECK(rating BETWEEN 1 AND 5)
rating_accuracy INTEGER CHECK(rating_accuracy BETWEEN 1 AND 5)  -- точность описания
rating_condition INTEGER CHECK(rating_condition BETWEEN 1 AND 5) -- состояние снаряжения
rating_communication INTEGER CHECK(rating_communication BETWEEN 1 AND 5)
text            TEXT
is_published    BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Таблица: messages
```sql
id              UUID PRIMARY KEY
conversation_id UUID NOT NULL
sender_id       UUID REFERENCES users(id)
text            TEXT
media_url       VARCHAR(500)
is_read         BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Таблица: conversations
```sql
id              UUID PRIMARY KEY
booking_id      UUID REFERENCES bookings(id)
listing_id      UUID REFERENCES listings(id)
participant_1   UUID REFERENCES users(id)
participant_2   UUID REFERENCES users(id)
last_message_at TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Таблица: wishlists
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
listing_id      UUID REFERENCES listings(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id, listing_id)
```

### Таблица: reports
```sql
id              UUID PRIMARY KEY
reporter_id     UUID REFERENCES users(id)
target_type     ENUM('listing', 'user', 'review')
target_id       UUID
reason          VARCHAR(100)
description     TEXT
status          ENUM('open', 'reviewing', 'resolved', 'dismissed')
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Таблица: host_payouts
```sql
id              UUID PRIMARY KEY
host_id         UUID REFERENCES users(id)
amount          DECIMAL(10,2)
status          ENUM('pending', 'processing', 'paid', 'failed')
bank_account    JSONB  -- зашифровано
period_start    DATE
period_end      DATE
paid_at         TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

---

## API ENDPOINTS

### Auth
```
POST   /auth/send-code          — отправить SMS-код
POST   /auth/verify-code        — верифицировать и получить JWT
POST   /auth/refresh            — обновить токен
POST   /auth/logout             — выйти
POST   /auth/oauth/google       — Google OAuth
POST   /auth/oauth/apple        — Apple Sign-In
```

### Users
```
GET    /users/me                — профиль текущего пользователя
PATCH  /users/me                — обновить профиль
POST   /users/me/avatar         — загрузить аватар
POST   /users/me/kyc            — загрузить документы (KYC)
GET    /users/:id               — публичный профиль пользователя
GET    /users/me/wishlists      — список избранного
POST   /users/me/wishlists/:id  — добавить в избранное
DELETE /users/me/wishlists/:id  — убрать из избранного
```

### Categories
```
GET    /categories              — дерево всех категорий
GET    /categories/:slug        — категория + дочерние
GET    /categories/:slug/listings — объявления категории
```

### Listings
```
GET    /listings                — поиск (фасетный, геопоиск, фильтры)
POST   /listings                — создать объявление
GET    /listings/:id            — детальная страница
PATCH  /listings/:id            — обновить
DELETE /listings/:id            — удалить / архивировать
POST   /listings/:id/media      — загрузить фото/видео
DELETE /listings/:id/media/:mediaId — удалить медиа
GET    /listings/:id/availability — сетка доступности
POST   /listings/:id/availability — заблокировать даты
GET    /listings/:id/reviews    — отзывы
GET    /host/:hostId/listings   — объявления хоста
```

### Поиск
```
GET    /search?q=...&category=...&city=...&lat=...&lng=...&radius=...
       &price_min=...&price_max=...&date_from=...&date_to=...
       &type=hourly|daily&instant_book=true&delivery=true
       &sort=price_asc|price_desc|rating|distance|newest
```

### Bookings
```
POST   /bookings                — запрос на бронирование
GET    /bookings                — список моих аренд (как арендатор)
GET    /bookings/host           — список аренд (как хост)
GET    /bookings/:id            — детали бронирования
POST   /bookings/:id/confirm    — хост подтверждает
POST   /bookings/:id/decline    — хост отклоняет
POST   /bookings/:id/cancel     — отмена (арендатор или хост)
POST   /bookings/:id/checkin    — выдача (с фото)
POST   /bookings/:id/checkout   — возврат (с фото)
POST   /bookings/:id/dispute    — открыть спор
```

### Payments
```
POST   /payments/initiate       — инициировать оплату
POST   /payments/webhook        — вебхук от ЮKassa
GET    /payments/:bookingId     — детали платежа
POST   /payments/payout-request — хост запрашивает выплату
```

### Reviews
```
POST   /reviews                 — оставить отзыв
GET    /reviews/user/:id        — отзывы пользователя
GET    /reviews/listing/:id     — отзывы на объявление
```

### Messages
```
GET    /conversations           — список диалогов
POST   /conversations           — начать диалог (по booking_id или listing_id)
GET    /conversations/:id/messages — сообщения
POST   /conversations/:id/messages — отправить сообщение
```

### Notifications
```
GET    /notifications           — список уведомлений
PATCH  /notifications/:id/read  — пометить прочитанным
POST   /notifications/settings  — настройки уведомлений
```

### Admin
```
GET    /admin/listings/moderation — очередь модерации
PATCH  /admin/listings/:id/approve
PATCH  /admin/listings/:id/reject
GET    /admin/users
PATCH  /admin/users/:id/ban
GET    /admin/disputes
PATCH  /admin/disputes/:id/resolve
GET    /admin/analytics/dashboard
GET    /admin/payouts/pending
POST   /admin/payouts/:id/approve
```

---

## ЭКРАНЫ МОБИЛЬНОГО ПРИЛОЖЕНИЯ

### Онбординг и авторизация
- `Splash` — экран загрузки
- `Onboarding` — 3 слайда (что такое Rigs)
- `Auth/Phone` — ввод номера телефона
- `Auth/OTP` — ввод SMS-кода
- `Auth/Profile` — заполнить имя + фото (первый вход)
- `Auth/Role` — выбор роли: Арендатор / Хост / Оба

### Главная (для арендатора)
- `Home` — лента: баннеры, рекомендации, «рядом с тобой», популярные категории, «Скоро»
- `Search` — поиск с фильтрами
- `SearchResults` — список / карта (переключатель)
- `Map` — полноэкранная карта с кластеризацией

### Каталог и карточка
- `Categories` — дерево категорий
- `CategoryListings` — объявления категории + фильтры
- `ListingDetail` — карточка объявления:
  - Фотогалерея (swiper)
  - Название, рейтинг, кол-во отзывов
  - Хост (аватар, рейтинг, кнопка «написать»)
  - Цены (почасово / посуточно / на неделю)
  - Описание
  - Характеристики (бренд, модель, год, состояние)
  - Доступность (календарь)
  - Правила аренды
  - Требования к арендатору
  - Доставка
  - Локация (карта)
  - Отзывы (список + средняя оценка)
  - Похожие объявления
  - CTA: «Забронировать»

### Бронирование
- `BookingForm` — выбор дат + количество
- `BookingOptions` — страховка, доставка
- `BookingReview` — итоговый чек (разбивка)
- `BookingPayment` — оплата (карта / СБП)
- `BookingConfirmation` — «Заявка отправлена / Забронировано»
- `CheckinScreen` — экран выдачи (QR / код + фото)
- `CheckoutScreen` — экран возврата (фото + подпись)

### Мои аренды
- `MyRentals` — вкладки: Предстоящие / Активные / Завершённые / Отменённые
- `RentalDetail` — детали конкретной аренды
- `DisputeForm` — форма открытия спора
- `ReviewForm` — форма отзыва

### Чаты
- `ChatList` — список диалогов
- `ChatDetail` — переписка (с кнопкой «перейти к брони»)

### Профиль (арендатор)
- `Profile` — фото, имя, рейтинг, значки, кнопки
- `ProfileEdit` — редактирование данных
- `ProfileVerification` — KYC (загрузка паспорта)
- `Wishlist` — избранное
- `Settings` — уведомления, язык, тема, выход

### Хост-панель (встроена в приложение)
- `HostDashboard` — выручка (день / неделя / месяц), активные аренды, рейтинг
- `HostListings` — мои объявления (активные / черновики / паузе)
- `ListingCreate` — wizard создания объявления:
  - Шаг 1: Категория
  - Шаг 2: Тип (снаряжение / опыт / локация / пакет)
  - Шаг 3: Фото (до 15 штук)
  - Шаг 4: Название и описание
  - Шаг 5: Характеристики
  - Шаг 6: Цены (почасово / посуточно / на неделю / на месяц)
  - Шаг 7: Залог + страховка
  - Шаг 8: Доступность (календарь)
  - Шаг 9: Правила + требования
  - Шаг 10: Локация
  - Шаг 11: Доставка
  - Шаг 12: Предпросмотр → Опубликовать
- `ListingEdit` — редактирование объявления
- `AvailabilityCalendar` — управление доступностью
- `HostBookings` — входящие заявки, вкладки статусов
- `BookingDetailHost` — детали заявки (подтвердить / отклонить)
- `HostEarnings` — выплаты, история, запросить выплату
- `HostStats` — аналитика: просмотры, конверсия, сезонность

### Уведомления
- `Notifications` — список уведомлений с переходом в контекст

---

## ЭКРАНЫ ВЕБ-СЕРВИСА

### Публичная часть (SEO-ориентирована)
- `/` — Главная (аналог Airbnb: поиск, категории, featured)
- `/search` — Результаты поиска (с фильтрами в сайдбаре)
- `/map` — Карта-поиск
- `/categories` — Все категории
- `/category/[slug]` — Объявления категории
- `/listing/[id]` — Карточка объявления
- `/host/[id]` — Публичный профиль хоста
- `/blog` — Статьи (SEO + контент-маркетинг)

### Авторизованная часть
- `/dashboard` — Личный кабинет (арендатор)
- `/my/rentals` — Мои аренды
- `/my/wishlist` — Избранное
- `/my/messages` — Сообщения
- `/my/profile` — Профиль
- `/my/settings` — Настройки

### Хост-панель (отдельный раздел `/host/`)
- `/host/dashboard` — Сводка
- `/host/listings` — Объявления
- `/host/listings/new` — Создать объявление (wizard)
- `/host/listings/[id]/edit` — Редактировать
- `/host/bookings` — Бронирования
- `/host/calendar` — Календарь доступности
- `/host/earnings` — Выплаты и финансы
- `/host/stats` — Аналитика

### Панель администратора (`/admin/`)
- `/admin/dashboard` — Метрики платформы
- `/admin/moderation` — Очередь объявлений
- `/admin/users` — Управление пользователями
- `/admin/bookings` — Все бронирования
- `/admin/disputes` — Споры
- `/admin/payouts` — Выплаты хостам
- `/admin/categories` — CRUD категорий
- `/admin/promotions` — Акции и купоны
- `/admin/analytics` — Детальная аналитика

---

## КЛЮЧЕВЫЕ БИЗНЕС-ПРОЦЕССЫ

### Процесс аренды
```
1. Арендатор → поиск → карточка объявления
2. Выбор дат и количества
3. Запрос на бронирование (+ оплата или холд карты)
4. Хост получает уведомление → подтверждает (или auto-confirm если instant_book)
5. Арендатор получает подтверждение
6. В день начала: арендатор и хост обмениваются кодом подтверждения (checkin-код)
7. Хост фиксирует состояние снаряжения (фото)
8. Аренда активна
9. По окончании: код возврата (checkout-код) + фото возврата
10. Платформа ждёт 48 часов (окно для споров)
11. Выплата хосту (за вычетом комиссии)
12. Обе стороны оставляют отзыв (скрытый до взаимной публикации)
```

### Процесс спора
```
1. Арендатор или хост открывает спор в течение 48 часов после возврата
2. Обе стороны загружают фото, объяснения
3. Медиатор платформы рассматривает (SLA: 3 рабочих дня)
4. Решение: полный возврат / частичный / удержание залога / выплата компенсации
5. При серьёзных нарушениях — блокировка аккаунта
```

### Процесс модерации объявления
```
1. Хост создаёт объявление → статус 'moderation'
2. Система: автоматические проверки (запрещённые слова, подозрительные цены)
3. Модератор: проверка фото, описания, категории
4. Одобрено → 'active' / Отклонено → 'draft' + комментарий
SLA модерации: 4 часа (бизнес-часы)
```

---

## УВЕДОМЛЕНИЯ (события → каналы)

| Событие | Push | SMS | Email |
|---------|------|-----|-------|
| Новая заявка на аренду (хосту) | ✓ | ✓ | ✓ |
| Заявка подтверждена (арендатору) | ✓ | ✓ | ✓ |
| Заявка отклонена | ✓ | — | ✓ |
| Оплата прошла | ✓ | ✓ | ✓ |
| Напоминание за 24 часа до начала | ✓ | ✓ | — |
| Напоминание за 2 часа до начала | ✓ | — | — |
| Аренда завершена | ✓ | — | ✓ |
| Новое сообщение в чате | ✓ | — | — |
| Отзыв опубликован | ✓ | — | ✓ |
| Выплата начислена (хосту) | ✓ | — | ✓ |
| Объявление одобрено (хосту) | ✓ | — | ✓ |
| Открыт спор | ✓ | ✓ | ✓ |

---

## ПОИСК И ФИЛЬТРАЦИЯ

### Параметры поиска
```
q          — текстовый запрос (full-text search)
category   — slug категории
lat, lng   — координаты
radius     — радиус в км (default: 50)
city       — город
date_from  — дата начала
date_to    — дата окончания
duration   — hours | days | weeks
price_min  — минимальная цена
price_max  — максимальная цена
condition  — new | excellent | good | fair
instant_book — true/false
delivery   — true/false
insurance  — true/false
age_group  — children | adults | family
level      — beginner | intermediate | professional
sort       — price_asc | price_desc | rating | distance | newest | popular
page, limit
```

### Elasticsearch индекс listings
```json
{
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "russian" },
      "description": { "type": "text", "analyzer": "russian" },
      "tags": { "type": "keyword" },
      "category_path": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "city": { "type": "keyword" },
      "price_daily": { "type": "float" },
      "rating": { "type": "float" },
      "condition": { "type": "keyword" },
      "instant_book": { "type": "boolean" },
      "delivery_available": { "type": "boolean" }
    }
  }
}
```

---

## БЕЗОПАСНОСТЬ

- **JWT** с коротким TTL (15 мин access + 30 дней refresh)
- **Rate limiting** на auth-эндпоинты (5 попыток/мин)
- **Шифрование** паспортных данных (AES-256)
- **Маскировка** контактов — телефоны и email видны только после подтверждённого бронирования
- **HTTPS** everywhere, HSTS
- **CORS** whitelist
- **SQL-injection** защита через Prisma ORM
- **File upload** валидация типов + anti-virus scan
- **PCI DSS** — платёжные данные не хранятся на наших серверах

---

## ПРОИЗВОДИТЕЛЬНОСТЬ И МАСШТАБИРОВАНИЕ

| Метрика | Цель (v1) | Цель (v2) |
|---------|-----------|-----------|
| API response time (p95) | < 300 мс | < 150 мс |
| Страница поиска (TTFB) | < 500 мс | < 200 мс |
| Загрузка фото (первый байт) | < 100 мс | < 50 мс |
| Concurrent users | 1 000 | 50 000 |
| Uptime SLA | 99.5% | 99.9% |

**Стратегии:**
- CDN для статики и медиа (Cloudflare)
- Redis кэш для популярных поисков (TTL 5 мин)
- DB read-реплики для поиска и отчётов
- Горизонтальное масштабирование API через k8s
- Изображения: webp + lazy loading + responsive sizes

---

## ПЛАН РАЗРАБОТКИ

### Фаза 1 — MVP (3 месяца)
- [ ] Auth (SMS OTP)
- [ ] Профиль пользователя
- [ ] CRUD объявлений (снаряжение)
- [ ] Поиск (базовый текстовый + категории + город)
- [ ] Бронирование (подтверждение хостом)
- [ ] Оплата (ЮKassa)
- [ ] Чат
- [ ] Отзывы
- [ ] Мобильное приложение (iOS + Android)
- [ ] Веб (базовые страницы)
- [ ] Модерация объявлений (ручная)

### Фаза 2 — Growth (4–6 месяц)
- [ ] Геопоиск + карта
- [ ] Динамическая доступность
- [ ] Страхование (интеграция)
- [ ] Верификация (KYC)
- [ ] Хост-аналитика
- [ ] Instant Book
- [ ] Push / Email уведомления
- [ ] Подписка Rigs Pro

### Фаза 3 — Scale (7–12 месяц)
- [ ] Elasticsearch (продвинутый поиск)
- [ ] Пакетные объявления (опыт + локация)
- [ ] B2B-кабинет
- [ ] API для интеграций
- [ ] Динамическое ценообразование
- [ ] Программа лояльности Rigs Pass
- [ ] Web-виджет для прокатных компаний

---

*Документ: tech_spec.md | Версия 1.0*
