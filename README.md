# 🏕️ Rigs — Marketplace аренды снаряжения

**Полноценная B2C/P2P платформа аренды туристического и спортивного снаряжения** — production-ready экосистема с веб-приложением, нативным мобильным клиентом, бизнес-кабинетом и интеграцией платежей.

[![API](https://img.shields.io/badge/API-NestJS%2010-E0234E?logo=nestjs)](https://nestjs.com/)
[![Web](https://img.shields.io/badge/Web-Next.js%2014-000000?logo=next.js)](https://nextjs.org/)
[![Mobile](https://img.shields.io/badge/Mobile-Expo%2051-000020?logo=expo)](https://expo.dev/)
[![DB](https://img.shields.io/badge/DB-PostgreSQL%2016%20%2B%20PostGIS-336791?logo=postgresql)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/ORM-Prisma%205-2D3748?logo=prisma)](https://www.prisma.io/)
[![Payments](https://img.shields.io/badge/Payments-YooKassa-7C3AED)](https://yookassa.ru/)
[![Monorepo](https://img.shields.io/badge/Monorepo-Turborepo%20%2B%20pnpm-EF4444)](https://turbo.build/)

---

## О проекте

Rigs — это «Airbnb для снаряжения». Платформа, где владельцы катеров, палаток, SUP-досок, велосипедов, лыж и другого снаряжения сдают его в аренду напрямую активным путешественникам.

Проект охватывает полный жизненный цикл сделки: от поиска и онлайн-бронирования до приёма платежа, страхового депозита и разрешения споров.

**Ключевые возможности:**

- 🔍 **Поиск с фильтрами и картой** — Mapbox split-view (desktop) и full-screen режим (mobile), 9 фильтров, цветовые маркеры с ценой
- 💳 **Платежи через YooKassa** — оплата, частичный возврат по политике отмены, **страховой депозит через холдирование** (capture/cancel)
- 📱 **Нативное мобильное приложение** — Expo Router, push-уведомления через FCM, камера для check-in/check-out
- 💬 **Realtime-чат** — Socket.io между арендатором и хостом, история сообщений, индикатор онлайн
- 🏢 **Business-кабинет** — командные подписки (Free/Basic/Pro/Business), приглашения по token-ссылке, ролевая модель (owner/manager/staff)
- 🎁 **Реферальная программа** — уникальные коды, бонусы за приведённых пользователей, история начислений
- 🛡 **KYC и верификация** — паспортные данные с AES-256 шифрованием at rest, 3 уровня (none/basic/full)
- 🔔 **Уведомления** — push (FCM), email (nodemailer), при снижении цены товара из избранного на ≥5%
- 📊 **Host-аналитика** — выручка, доходность по объявлениям, выплаты, депозиты, графики
- ⚖️ **Админ-панель** — модерация, разрешение споров, статистика, выплаты хостам
- 🗺 **SEO + JSON-LD** — динамические sitemap, OG-теги, Product schema для каждого листинга
- 🎨 **Dadata-автокомплит** городов с debounce и graceful fallback

---

## Архитектура

```
┌────────────────────────────────────────────────────────────────────┐
│                        Rigs Marketplace Ecosystem                  │
├──────────────────┬──────────────────┬──────────────────────────────┤
│  Web (Next.js)   │  Mobile (Expo)   │   Admin / Business Cabinet   │
│   33 страницы    │   18 экранов     │   модерация · команды        │
└────────┬─────────┴─────────┬────────┴──────────────┬───────────────┘
         │                   │                       │
         └───────────────────┴───────────────────────┤
                                                     │ REST API + WebSocket
                                ┌────────────────────┴───────────────────────┐
                                │            NestJS API (15 модулей)         │
                                │   84 эндпоинта · JWT + Refresh · 4 cron    │
                                ├────────────────────────────────────────────┤
                                │  PostgreSQL 16 + PostGIS  │  Redis 7       │
                                │  Elasticsearch 8          │  MinIO / S3    │
                                │  YooKassa  │  SMSC.ru  │  Firebase FCM    │
                                └────────────────────────────────────────────┘
```

**База данных:** 19 таблиц, 5 миграций, материализованные расчёты рейтингов, индексы на горячих путях (search, bookings, payments).

---

## Стек технологий

### Backend (`apps/api`)
| Технология | Назначение |
|---|---|
| **NestJS 10** | Modular REST API, 15 feature modules |
| **Prisma 5** | Type-safe ORM, 19 моделей, миграции |
| **PostgreSQL 16 + PostGIS** | Основная БД, гео-индексы для поиска по координатам |
| **Redis 7** (ioredis) | Кэш поиска (5 мин TTL), счётчик активных просмотров (SADD/SCARD) |
| **Elasticsearch 8** | Полнотекстовый поиск с русским анализатором |
| **YooKassa SDK** | Платежи, возвраты, холдирование депозитов |
| **Socket.io** | Realtime-чат между пользователями |
| **@nestjs/schedule** | Cron: auto-cancel pending bookings (15 мин), auto-complete + capture deposit (1 ч), price-drop alerts (6 ч) |
| **Firebase Admin SDK** | Push-уведомления (FCM) |
| **SMSC.ru** | OTP по SMS для аутентификации |
| **nodemailer** | Email-уведомления (booking events, price drops) |
| **AWS S3 SDK** | Загрузка медиа (MinIO локально, Yandex Cloud в проде) |
| **bcrypt** | Хэширование паролей и checkout-кодов |
| **AES-256** | Шифрование паспортных данных (KYC) |

### Web (`apps/web`)
| Технология | Назначение |
|---|---|
| **Next.js 14 (App Router)** | SSR + Client Components, dynamic metadata, sitemap |
| **TanStack Query** | Серверный стейт, кэширование, оптимистичные обновления |
| **Zustand** | Клиентский стейт (auth, wishlist) |
| **Tailwind CSS** | Дизайн-система с custom brand palette |
| **react-hook-form + zod** | Формы с валидацией |
| **react-map-gl + Mapbox GL** | Интерактивная карта с маркерами цен, split-view |
| **Socket.io Client** | Realtime-чат |
| **axios** | HTTP-клиент с interceptors (refresh-token) |
| **lucide-react** | Иконки |
| **Canvas API** | Клиентское сжатие изображений (1600px, JPEG 0.82) перед upload |

### Mobile (`apps/mobile`)
| Технология | Назначение |
|---|---|
| **Expo 51 (React Native)** | Кроссплатформа iOS + Android |
| **Expo Router** | File-based навигация, tabs |
| **expo-camera** | Check-in / check-out фотографии |
| **expo-image-picker** | Загрузка фото в листинги |
| **expo-notifications** | Push-уведомления |
| **@shopify/flash-list** | Производительные списки 1000+ элементов |
| **react-native-reanimated** | 60fps анимации |
| **react-native-maps** | Карта в поиске |

### Shared packages
| Package | Назначение |
|---|---|
| **`@rigs/types`** | Shared TS типы (User, Listing, Booking, enums, DTO) |
| **`@rigs/utils`** | `calcSubtotal`, `calcBookingTotal`, `formatPrice`, `formatDate`, `plural`, `slugify` |
| **`@rigs/config`** | Базовые `tsconfig` для всех приложений |

### DevOps
| Технология | Назначение |
|---|---|
| **Turborepo** | Параллельные сборки + кэш |
| **pnpm workspaces** | Управление зависимостями monorepo |
| **Docker Compose** | Локальное окружение (Postgres + Redis + Elasticsearch + MinIO) |
| **Jest** | Unit-тесты бэка и фронта |

---

## Структура проекта

```
rigs/
├── apps/
│   ├── api/                          # NestJS бэкенд
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # JWT + Refresh + OTP (SMS / Email)
│   │   │   │   ├── users/            # Профиль, KYC, рефералы, wishlist
│   │   │   │   ├── listings/         # CRUD + поиск + similar + viewers
│   │   │   │   ├── bookings/         # Создание + cancel-policy + scheduler
│   │   │   │   ├── payments/         # YooKassa: charge / refund / deposit hold
│   │   │   │   ├── reviews/          # Двусторонние отзывы (renter ↔ host)
│   │   │   │   ├── messages/         # История переписки
│   │   │   │   ├── chat/             # Socket.io gateway
│   │   │   │   ├── notifications/    # FCM + email + price-drop scheduler
│   │   │   │   ├── search/           # Elasticsearch индексация
│   │   │   │   ├── host/             # Дашборд хоста + payouts
│   │   │   │   ├── business/         # Командные подписки, инвайты
│   │   │   │   ├── admin/            # Модерация + споры
│   │   │   │   ├── categories/       # Дерево категорий
│   │   │   │   └── upload/           # S3 multipart upload
│   │   │   ├── common/               # decorators, guards, interceptors
│   │   │   ├── prisma/               # PrismaService (DI-ready)
│   │   │   └── redis/                # ioredis client (@Global)
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # 19 моделей
│   │   │   ├── migrations/           # 5 миграций
│   │   │   └── seed.ts               # 70+ категорий из taxonomy
│   │   └── test/                     # E2E
│   │
│   ├── web/                          # Next.js 14 App Router
│   │   ├── app/
│   │   │   ├── (главная, /search, /listing/[id], /host/*, /my/*, /business/*, /admin)
│   │   │   ├── sitemap.ts            # Динамическая sitemap.xml
│   │   │   └── robots.ts             # robots.txt с disallow приватных путей
│   │   ├── components/               # ListingCard, PriceCalculator, ListingsMap...
│   │   ├── hooks/                    # use-listings, use-bookings, use-viewers...
│   │   ├── lib/                      # api (axios + interceptors), cn (clsx)
│   │   └── store/                    # Zustand: auth, wishlist
│   │
│   └── mobile/                       # Expo + Expo Router
│       ├── app/
│       │   ├── (tabs)/               # Tab navigator (home, search, rentals, messages, host, profile)
│       │   ├── listing/[id].tsx
│       │   ├── booking/[id].tsx      # С RentalProgressBar
│       │   ├── host/listings/create/ # 12-шаговый мастер
│       │   ├── chat/[conversationId].tsx
│       │   └── auth.tsx
│       ├── components/
│       └── stores/
│
├── packages/
│   ├── types/                        # @rigs/types — Shared TS types
│   ├── utils/                        # @rigs/utils — pricing, format, date
│   └── config/                       # @rigs/config — tsconfig presets
│
├── docker/
│   └── docker-compose.yml            # Postgres + Redis + Elasticsearch + MinIO
│
├── taxonomy.md                       # 14 сегментов · 70+ категорий · 300+ типов
├── business_model.md                 # 8 потоков монетизации, юнит-экономика
├── tech_spec.md                      # Техническое задание
└── turbo.json                        # Turborepo pipelines
```

---

## Реализованный функционал

### Аутентификация
- 📱 OTP по SMS (SMSC.ru) с rate limiting
- 📧 Регистрация через email + пароль
- 🔄 Access (15min) + Refresh (30d) JWT с rotation
- 🛡 Bearer-токен в Authorization, refresh через HttpOnly cookie
- 🔐 Восстановление пароля через email-токен

### Поиск и листинг
- 🔍 Полнотекстовый поиск (Elasticsearch с fallback на Postgres)
- 🎚 Фильтры: город, категория, цена, мгновенное бронирование, доставка, состояние, даты
- 🗺 **Split-view карта** на десктопе (55% список + 45% sticky карта), full-screen на мобильном
- 🏷 Quick-tags (Байдарки, SUP, Палатки, Лыжи…) — горизонтальный скролл
- 📊 Сортировка: рейтинг / цена / новизна / популярность
- 🎯 Похожие объявления + социальное доказательство (число активных зрителей)

### Бронирование
- 📅 Календарь доступности с заблокированными датами хостом
- 💰 Прозрачный расчёт: аренда + сервисный сбор + страховка + доставка + депозит
- 🛡 **Страховой депозит** через YooKassa hold (capture при checkout, cancel при отмене)
- ⏱ TTL auto-cancel: pending брони > 24 ч отменяются автоматически
- 🔄 Политика возврата: >48 ч — 100%, 24–48 ч — 50%, <24 ч — 0%
- 📸 Check-in / Check-out с фото и 6-значным кодом подтверждения
- 🔁 «Арендовать снова» — 1 клик с прошлого опыта

### Платежи
- 💳 YooKassa (СБП, карты, кошельки)
- 💸 Частичный возврат с пересчётом hostPayout
- 🛡 Авторизация холда депозита + capture / cancel
- 📋 История платежей с разделением charge / refund / hold

### Хост
- 🏠 Дашборд: выручка, активные брони, рейтинг, выплаты
- 📦 12-шаговый мастер создания объявления
- 📅 Блокировка дат, выставление цен (час/день/неделя/месяц)
- 💰 Запрос выплаты, история выплат, текущий баланс
- ⏸ Pause / Archive с optimistic UI

### Business-кабинет
- 👥 Подписки: Free (3 объявления) / Basic (10) / Pro (50) / Business (∞)
- ✉️ Приглашение членов команды по token-ссылке
- 🔑 Ролевая модель: owner / manager / staff
- 📊 Командная аналитика

### Мобильное приложение
- 📱 Полный паритет с веб-функционалом
- 📸 Камера для check-in/check-out
- 🔔 Push через FCM
- 📊 RentalProgressBar для активных аренд
- 🗺 Toggle список/карта в поиске

### Безопасность
- 🛡 Helmet + CORS + rate limiting (@nestjs/throttler)
- 🔐 AES-256 шифрование KYC-данных at rest
- 🔒 bcrypt для checkout-кодов и паролей
- ✅ class-validator на всех DTO
- 🚫 Webhook signature verification (YooKassa HMAC)

---

## Цифры проекта

| Метрика | Значение |
|---------|---------:|
| **Строк TypeScript** | ~26,500 |
| **API эндпоинтов** | 84 |
| **Таблиц в БД** | 19 |
| **NestJS модулей** | 15 |
| **Web страниц** | 33 |
| **Mobile экранов** | 18 |
| **Cron-задач** | 4 |
| **Миграций** | 5 |

---

## Быстрый старт

### 1. Установить зависимости
```bash
pnpm install
```

### 2. Поднять инфраструктуру
```bash
pnpm docker:up
# PostgreSQL :5432, Redis :6379, Elasticsearch :9200, MinIO :9000/9001
```

### 3. Настроить переменные окружения
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Для локальной разработки достаточно дефолтов (платежи и SMS в stub-режиме)
```

### 4. Миграции + seed категорий
```bash
pnpm db:generate
pnpm db:migrate
pnpm --filter @rigs/api db:seed
```

### 5. Создать MinIO bucket
Открыть http://localhost:9001 (`rigs_access` / `rigs_secret_key`), создать bucket `rigs-media` и сделать его public.

### 6. Запустить всё
```bash
pnpm dev
```

| Сервис | URL |
|--------|-----|
| API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| Web | http://localhost:3000 |
| Prisma Studio | `pnpm db:studio` |

### 7. Мобильное приложение
```bash
cd apps/mobile && pnpm expo start
# QR-код для Expo Go или expo run:ios / expo run:android
```

---

## Бизнес-модель

8 потоков монетизации (детали в [`business_model.md`](business_model.md)):

| # | Модель | Доля |
|---|--------|-----:|
| M1 | Комиссия с транзакций (8% арендатор + 3% хост) | ~70% |
| M2 | Продвижение листингов (299 / 490 / 890 ₽) | ~10% |
| M3 | Подписки хостов (Pro 1490 ₽ / Business 3990 ₽) | ~8% |
| M4 | Страховка через партнёра (4% от чека) | ~5% |
| M5 | Бейдж «Проверено Rigs» (1990 ₽/год) | ~2% |
| M6 | Платформенная доставка (15% комиссия) | ~3% |
| M7 | Программа лояльности Rigspoints | retention |
| M8 | B2B-события и корпоративные клиенты | ~2% |

**Целевая юнит-экономика:** 25–30% маржа со сделки · Seed → 2 млн ₽/мес GMV · Scale → 200 млн ₽/мес GMV.

---

## Документация

| Файл | Содержимое |
|------|-----------|
| [`taxonomy.md`](taxonomy.md) | 14 сегментов, 70+ категорий, 300+ позиций снаряжения |
| [`business_model.md`](business_model.md) | Монетизация, комиссии, страховка, юнит-экономика |
| [`tech_spec.md`](tech_spec.md) | Стек, БД, API-эндпоинты, экраны приложения |

---

## Что особенного

- **Type-safe end-to-end** — `@rigs/types` шарится между API, Web и Mobile. Изменения в Prisma → автоматический drift detection.
- **Split-view карта** — Airbnb-style на десктопе с hover-связкой карточка ↔ маркер.
- **Страховой депозит** через холдирование YooKassa — `capture: false` при создании, capture при checkout, cancel при отмене.
- **Time-based cancel policy** — переменный возврат в зависимости от часов до начала аренды.
- **Push + Email + In-app** уведомления через единый `NotificationsService`.
- **Redis-cache** поиска с TTL и инвалидацией на mutation.
- **Optimistic UI** в host/listings и wishlist для мгновенного отклика.
- **AES-256 KYC** — паспортные данные шифруются ключом из ENV, никогда не возвращаются в API.
- **Docker-first** — один `pnpm docker:up` поднимает всю инфраструктуру.

---

## Стандарты разработки

- **TypeScript strict mode** во всех пакетах
- **`tsc --noEmit` чист** в API, Web, Mobile
- **ESLint + Prettier** с единой конфигурацией
- **Conventional commits**
- **Atomic migrations** через Prisma Migrate
- **Graceful degradation** — все внешние сервисы (YooKassa, SMSC, FCM, Mapbox) работают в stub-режиме без ключей для локальной разработки

---

## Лицензия

Проприетарный код. Все права защищены © 2026 Rigs.

---

<sub>Built with ❤️ using Claude Code · Maksutov Design</sub>
