# 💰 Gastos App

App web para registrar y dividir gastos compartidos en pareja. Instalable en iOS como PWA.

## Features

- **Login** con email y contraseña (2 usuarios)
- **Agregar gastos** manualmente: monto, descripción, categoría, quién pagó y tipo de división
- **Split configurable**: 70/30 (cuentas del hogar) o 50/50 (partes iguales) o personal
- **Balance mensual**: calcula automáticamente quién le debe cuánto a quién
- **Historial** navegable por mes
- **Email automático** el día 1 de cada mes con el resumen del mes anterior
- **PWA**: se instala en iOS desde Safari como app nativa

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Email | Resend |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs |

## Lógica de split

```
70/30 → Cristóbal paga 70%, Valentina paga 30%
50/50 → Cada uno paga la mitad
Personal → Solo lo paga quien lo registró (no entra al balance)
```

El balance final indica quién debe transferirle a quién y cuánto.

## Desarrollo local

### Requisitos
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Resend](https://resend.com)

### Setup

```bash
# Clonar
git clone https://github.com/csepulvedaa/gastos-app.git
cd gastos-app

# Instalar dependencias
npm install

# Variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase y Resend

# Correr en local
npm run dev
```

Abrir http://localhost:3000

### Base de datos

En el SQL Editor de Supabase, ejecutar `supabase/schema.sql` para crear las tablas y políticas RLS.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo server) |
| `RESEND_API_KEY` | API key de Resend |
| `EMAIL_FROM` | Email remitente verificado |
| `CRISTOBAL_EMAIL` | Email del usuario principal |
| `VALENTINA_EMAIL` | Email del segundo usuario |
| `CRON_SECRET` | Secret para proteger el endpoint del cron |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app en producción |

## Deploy

La app está configurada para desplegarse en Vercel con un cron job que corre el día 1 de cada mes a las 12:00 UTC (envía el email de resumen).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/csepulvedaa/gastos-app)

## Estructura del proyecto

```
app/
  (auth)/login/       → Pantalla de login
  (app)/dashboard/    → Balance y gastos del mes actual
  (app)/add/          → Formulario nuevo gasto
  (app)/history/      → Historial por mes
  api/expenses/       → API REST de gastos
  api/cron/           → Endpoint del resumen mensual
components/
  balance-summary.tsx → Muestra quién debe a quién
  expense-form.tsx    → Formulario de gasto
  expense-card.tsx    → Tarjeta individual de gasto
  expense-list.tsx    → Lista agrupada por fecha
  nav-bar.tsx         → Navegación inferior (PWA)
lib/
  balance.ts          → Cálculo del split y balance
  email.ts            → Template y envío de email
  supabase/           → Clientes de Supabase (browser y server)
supabase/
  schema.sql          → Schema completo + RLS
```
