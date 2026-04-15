# 💰 Gastos App

A mobile-first web app to track and split shared expenses as a couple. Installable on iOS as a PWA.

**Live:** [gastos-app-tan.vercel.app](https://gastos-app-tan.vercel.app)

## Features

- **Login** with email and password (2 users)
- **Add expenses** with amount, description, category, who paid, and split type
- **4 split modes**: 70/30 (household) · 50/50 (equal) · Personal (excluded from balance) · Lent (other person owes 100%)
- **Installment expenses**: enter a total amount, choose how many months (2–12), set the start date — the app registers one record per month automatically
- **Monthly balance**: calculates who owes whom and the exact transfer amount
- **Settle month**: record when the monthly transfer is made; balance card turns green with the settlement date
- **Edit expenses**: edit any field on a single record, or update amount/description/split across all future installments at once; add or remove installments from the end
- **History**: browse any past or future month with full balance breakdown
- **Statistics**: bar charts for monthly spending trend, category breakdown, and who paid more (last 6 months)
- **Monthly email**: sent on the 1st of each month with the previous month's summary (requires verified Resend domain)
- **PWA**: installable on iOS via Safari → Add to Home Screen

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Email | Resend |
| Hosting | Vercel (auto-deploy from `main`) |
| Cron | Vercel Cron Jobs |

## Split Logic

```
70/30    → Cristóbal pays 70%, Valentina pays 30%
50/50    → Each person pays half
Personal → Only the payer is responsible (excluded from balance)
Lent     → Payer fronts the full amount, the other person owes 100%
```

For installments, the entered amount is the **total cost** — divided by N to register one record per month.

The monthly balance determines who transfers to whom and the exact amount. Once paid, either user can mark the month as settled.

## Local Development

### Requirements
- Node.js 18+
- [Supabase](https://supabase.com) account
- [Resend](https://resend.com) account (optional — only needed for email)

### Setup

```bash
git clone https://github.com/csepulvedaa/gastos-app.git
cd gastos-app
npm install
cp .env.example .env.local
# Fill in .env.local with your Supabase and Resend credentials
npm run dev
```

Open http://localhost:3000

### Database

Run `supabase/schema.sql` in the Supabase SQL Editor to create all tables and RLS policies.
Then create both users in **Authentication > Users** and insert their profiles:

```sql
INSERT INTO profiles (id, name, email) VALUES
  ('<UUID-USER-1>', 'Cristóbal', 'user1@email.com'),
  ('<UUID-USER-2>', 'Valentina', 'user2@email.com');
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key (`sb_publishable_*`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key — server only (`sb_secret_*`) |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified sender email address |
| `CRISTOBAL_EMAIL` | Primary user email |
| `VALENTINA_EMAIL` | Secondary user email |
| `CRON_SECRET` | Secret to protect the cron endpoint |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed app |

> **Note:** Supabase uses `sb_publishable_*` (anon) and `sb_secret_*` (service role) key formats — compatible with `@supabase/ssr`.

## Deploy

Connected to Vercel via GitHub. Every push to `main` triggers an automatic production deployment.

A cron job runs on the 1st of every month at 12:00 UTC to send the monthly summary email.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/csepulvedaa/gastos-app)

## Project Structure

```
app/
  (auth)/login/          → Login screen
  (app)/dashboard/       → Current month balance + expenses + settle button
  (app)/add/             → Add expense form (supports installments)
  (app)/edit/[id]/       → Edit expense form (single or group_forward scope)
  (app)/history/         → Month-by-month history (past and future)
  (app)/stats/           → Statistics with Recharts bar charts
  api/expenses/          → Expenses REST API (GET, POST)
  api/expenses/[id]/     → Single expense (PATCH, DELETE)
  api/settlements/       → Monthly settlements (GET, POST, DELETE)
  api/cron/              → Monthly summary cron endpoint
components/
  balance-summary.tsx    → Who owes whom + future installment debt
  expense-form.tsx       → Create expense (with installment toggle)
  edit-expense-form.tsx  → Edit expense (single / group_forward scope)
  expense-card.tsx       → Expense row with edit + delete
  expense-list.tsx       → Expenses grouped by date
  settle-button.tsx      → Liquidar mes button + settled state
  nav-bar.tsx            → Bottom navigation bar (PWA)
lib/
  balance.ts             → Split and balance calculation logic
  utils.ts               → cn(), addMonths()
  email.ts               → Email template and sending
  supabase/              → Supabase clients (browser and server)
supabase/
  schema.sql             → Full schema + RLS policies
proxy.ts                 → Auth route protection (Next.js 16)
```
