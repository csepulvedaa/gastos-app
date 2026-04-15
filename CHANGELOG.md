# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Statistics page** (`/stats`) with three bar charts: monthly spending trend, category breakdown for the current month, and who paid more per month (last 6 months)
- **Settle month** (`Liquidar mes`) button on the dashboard — records when the monthly transfer is made; shows settlement date and allows undoing
- **Settlements API** (`/api/settlements`) — GET, POST, and DELETE endpoints backed by a `settlements` table in Supabase

### Migration required
Run the following in the Supabase SQL Editor before deploying:
```sql
CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL,
  amount numeric NOT NULL,
  from_user uuid NOT NULL REFERENCES profiles(id),
  to_user uuid NOT NULL REFERENCES profiles(id),
  settled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settlements_select" ON settlements FOR SELECT USING (auth.uid() IN (from_user, to_user));
CREATE POLICY "settlements_insert" ON settlements FOR INSERT WITH CHECK (auth.uid() IN (from_user, to_user));
CREATE POLICY "settlements_delete" ON settlements FOR DELETE USING (auth.uid() IN (from_user, to_user));
```

---

## [0.4.0] — 2026-03-xx

### Added
- **Edit expenses** — pencil icon on each expense card opens `/edit/[id]`
  - *Single* scope: updates only that record
  - *Group forward* scope: updates the current installment and all future ones in the same group (amount, description, split type)
  - Remaining installment count can be increased or decreased from the end
- **Delete installment group** — delete dialog offers "just this one" or "this and all future" options for installment expenses

### Fixed
- Delete on history page now triggers a client-side refresh (added `onDeleted` callback + `refreshKey` pattern)
- Missing `UPDATE` RLS policy on `expenses` table — edits were silently dropped by Supabase

---

## [0.3.0] — 2026-02-xx

### Added
- **Installment expenses** (cuotas) — enter a total amount, choose 2–12 months and a start date; one record per month is registered automatically at `total ÷ N` per installment
- **Lent split type** — payer fronts the full amount; the other person owes 100% (excluded from payer's personal share)
- **Future installment debt** shown in the balance card as a subtitle ("+ $X en cuotas futuras")
- Installment badge on expense cards showing "Cuota X/N" and the total purchase amount as a detail line
- Navigation to future months in history
- `addMonths()` utility in `lib/utils.ts`

### Fixed
- `lent` was missing from the `expenses_split_check` DB constraint — caused a 500 on save
- Installment amounts were being registered as N × total instead of total ÷ N
- Future debt query used `.gt()` instead of `.gte()`, causing the first future month to be excluded

---

## [0.2.0] — 2026-01-xx

### Added
- PWA support — `manifest.json`, app icons (192 px, 512 px), Apple touch icon, favicons
- iOS installable via Safari → Add to Home Screen
- GitHub → Vercel auto-deploy pipeline (every push to `main` triggers a production deployment)
- Vercel Cron Job configured for monthly summary email (1st of each month, 12:00 UTC)

### Fixed
- Hydration mismatch caused by Next.js 16 `MetadataWrapper` / `ViewportBoundary` conflict — resolved by replacing `export const metadata` viewport fields with `export const viewport: Viewport`

---

## [0.1.0] — 2025-12-xx

### Added
- User authentication with Supabase Auth (2 users — Cristóbal and Valentina)
- Add expense form: amount, description, category, who paid, split type (70/30 · 50/50 · Personal)
- Monthly balance calculation — determines who owes whom and the exact transfer amount
- Expense list grouped by date with delete support
- History page — browse any past month with full balance breakdown
- Bottom navigation bar (PWA-style)
- Row-Level Security policies on all Supabase tables
- Monthly summary email via Resend (cron endpoint)
- Deployed to Vercel at [gastos-app-tan.vercel.app](https://gastos-app-tan.vercel.app)
