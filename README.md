# 💰 Gastos App

A web app to track and split shared expenses as a couple. Installable on iOS as a PWA.

## Features

- **Login** with email and password (2 users)
- **Add expenses** manually: amount, description, category, who paid, and split type
- **Configurable split**: 70/30 (household bills) · 50/50 (equal share) · personal (no split)
- **Monthly balance**: automatically calculates who owes whom and how much
- **History** browsable by month
- **Automatic email** on the 1st of each month with the previous month's summary
- **PWA**: installable on iOS from Safari as a native-like app

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Email | Resend |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs |

## Split Logic

```
70/30 → Cristóbal pays 70%, Valentina pays 30%
50/50 → Each person pays half
Personal → Only the payer is responsible (excluded from balance)
```

The monthly balance determines who transfers to whom and the exact amount.

## Local Development

### Requirements
- Node.js 18+
- [Supabase](https://supabase.com) account
- [Resend](https://resend.com) account

### Setup

```bash
# Clone the repo
git clone https://github.com/csepulvedaa/gastos-app.git
cd gastos-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in .env.local with your Supabase and Resend credentials

# Start the dev server
npm run dev
```

Open http://localhost:3000

### Database

Run `supabase/schema.sql` in the Supabase SQL Editor to create all tables and RLS policies.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified sender email address |
| `CRISTOBAL_EMAIL` | Primary user email |
| `VALENTINA_EMAIL` | Secondary user email |
| `CRON_SECRET` | Secret to protect the cron endpoint |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployed app |

## Deploy

Configured for Vercel with a cron job that runs on the 1st of every month at 12:00 UTC to send the monthly summary email.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/csepulvedaa/gastos-app)

## Project Structure

```
app/
  (auth)/login/       → Login screen
  (app)/dashboard/    → Current month balance and expenses
  (app)/add/          → Add new expense form
  (app)/history/      → Month-by-month history
  api/expenses/       → Expenses REST API
  api/cron/           → Monthly summary cron endpoint
components/
  balance-summary.tsx → Shows who owes whom
  expense-form.tsx    → Expense entry form
  expense-card.tsx    → Single expense row with delete
  expense-list.tsx    → Expenses grouped by date
  nav-bar.tsx         → Bottom navigation bar (PWA)
lib/
  balance.ts          → Split and balance calculation logic
  email.ts            → Email template and sending
  supabase/           → Supabase clients (browser and server)
supabase/
  schema.sql          → Full schema + RLS policies
```
