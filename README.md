# Desiva — Order & Production Tracker

![CI](https://github.com/maciek889/desiva-order-tracker/actions/workflows/ci.yml/badge.svg)

A full-stack web application for a small furniture manufacturing workshop. It tracks every order from the first client consultation, through office paperwork and each production stage on the shop floor, to shipping. Along the way it records how long each worker spends on each stage and what that labour costs.

> The user interface is in Polish, because the app is used by a Polish team. The code, comments and this documentation are in English.

<!-- Screenshots: add images to docs/screenshots/ and reference them here, e.g.
![Production Kanban](docs/screenshots/production.png) -->

## Features

- **Kanban tracking boards**, one for the office and one for production, with drag-and-drop between configurable stages
- **Worker view** with a per-order start/pause/complete timer. Finishing a stage automatically moves the order to the next one, and labour cost is calculated from the worker's hourly rate.
- **Real-time updates** via Server-Sent Events: boards update immediately when someone moves an order or starts a timer
- **Role-based access control** with three roles (Admin, Office, Worker), enforced **on the server**. Restricted fields such as client name, price and labour cost are removed from API responses for roles that may not see them, not just hidden in the UI.
- **Archive** of completed orders with time and cost broken down per stage and per worker
- **Analytics dashboard** with KPIs, trends, date-range filters and overdue-order tracking, aggregated on the server
- **Leads**: a lightweight CRM for prospective clients, with email/phone validation
- **File attachments**: multi-file upload with a progress bar, stored in Cloudflare R2 (S3-compatible)
- **Settings**: manage users, production stages (including reordering), categories and colours

### Roles

| View                 | Admin | Office | Worker |
|----------------------|:-----:|:------:|:------:|
| Office / production boards | ✅ | ✅ | ❌ |
| Orders list          | ✅    | ✅     | ❌     |
| Archive              | ✅    | ❌     | ❌     |
| Dashboard            | ✅    | ❌     | ❌     |
| Leads                | ✅    | ❌     | ❌     |
| Settings             | ✅    | ❌     | ❌     |
| Worker view (timers) | ❌    | ❌     | ✅     |

## Tech stack

| Area      | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Database  | PostgreSQL + Prisma ORM (migrations, enums, indexes) |
| Auth      | JWT in an HttpOnly cookie (`jsonwebtoken` in Node routes, `jose` in Edge middleware), bcrypt password hashing |
| Storage   | Cloudflare R2 via the AWS S3 SDK |
| Realtime  | Server-Sent Events with an in-process event bus |
| UI        | Tailwind CSS, Recharts, lucide-react |
| CI        | GitHub Actions (type check + production build) |

## Architecture notes

- **API routes** (`src/app/api/**`) are wrapped in a shared `apiHandler`:
  - Expected failures (`ApiError`, auth errors, Prisma unique/not-found errors) become proper 4xx responses.
  - Unexpected errors are logged on the server and returned as a generic 500, so internal details never leak to the client.
- **Authorization** happens in two layers:
  - Edge middleware verifies the JWT for page routes.
  - Every API route calls `requireAuth([...roles])`.
  - `redactOrder()` strips fields a role is not allowed to see.
- **Timer integrity:**
  - Starting a timer runs in a serializable transaction, which prevents duplicate active timers.
  - Labour cost uses the worker's *current* hourly rate from the database, not the value cached in the token.
  - Completing a stage moves the order on (or archives it) atomically.

## Getting started

**Requirements:** Node.js 18.18+ and Docker (for the local PostgreSQL), or any PostgreSQL 14+ instance.

```bash
git clone https://github.com/maciek889/desiva-order-tracker.git
cd desiva-order-tracker
npm install

cp .env.example .env          # then set JWT_SECRET (openssl rand -base64 48)
docker compose up -d          # local PostgreSQL matching .env.example
npm run setup                 # apply migrations + seed demo data
npm run dev                   # http://localhost:3000
```

File attachments need Cloudflare R2 credentials in `.env`. Everything else works without them.

### Demo accounts (seed data, local only)

| Login        | Role   | Password   |
|--------------|--------|------------|
| `admin`      | Admin  | `demo1234` |
| `biuro`      | Office | `demo1234` |
| `pracownik1` | Worker | `demo1234` |
| `pracownik2` | Worker | `demo1234` |

For production, use `prisma/seed-prod.ts` instead. It seeds only reference data and creates the admin account from the `ADMIN_PASSWORD` environment variable.

## Scripts

| Command                     | Description |
|-----------------------------|-------------|
| `npm run dev`               | Start the development server |
| `npm run build`             | Production build (`output: standalone`) |
| `npm run typecheck`         | TypeScript type check |
| `npm run setup`             | Apply migrations and seed demo data |
| `npm run db:migrate`        | Create/apply migrations during development |
| `npm run db:migrate:deploy` | Apply migrations in production |
| `npm run db:seed`           | Seed demo data |

## Deployment

The app builds as a [Next.js standalone server](https://nextjs.org/docs/app/api-reference/config/next-config-js/output). It's designed to run on a VPS behind Nginx with TLS:

```bash
npm ci && npm run build
npx prisma migrate deploy
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
node .next/standalone/server.js     # e.g. as a systemd service behind Nginx
```

## Project structure

```
prisma/
  schema.prisma        Data model
  migrations/          SQL migrations
  seed.ts              Demo data (local development)
  seed-prod.ts         Reference data + admin user (production)
scripts/
  migrate-to-r2.ts     One-off migration of legacy local uploads to R2
src/
  app/
    (dashboard)/       Admin/Office views (boards, orders, archive, dashboard, leads, settings)
    worker/            Worker view with timers
    login/             Login page
    api/               REST API routes
  components/          Shared React components (Kanban, modals, UI primitives)
  lib/                 Auth, Prisma client, R2 client, SSE event bus, helpers
  middleware.ts        JWT verification for page routes
```
