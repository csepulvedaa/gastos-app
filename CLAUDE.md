# Gastos App — Contexto para Claude

## Qué es este proyecto

App web para registrar y dividir gastos compartidos entre Cristóbal y Valentina.
Proyecto personal + portafolio en GitHub.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · Resend · Vercel

## Cómo correr en local

```bash
export PATH="/opt/homebrew/bin:$PATH"
npm run dev
# → http://localhost:3000
```

`.env.local` necesario (ver `.env.example`). No está en el repo.

## Estado actual

- ✅ Código completo y corriendo en local
- ✅ Supabase configurado (schema, usuarios, RLS)
- ⏳ Resend pendiente (email mensual)
- ⏳ Deploy Vercel pendiente
- ⏳ Íconos PWA pendientes (`public/icons/icon-192.png`, `icon-512.png`)

Detalle completo en `/docs/ESTADO.md` y `/docs/DEPLOY.md` (locales, no en repo).

## Lógica de negocio clave

Split 70/30: Cristóbal paga 70%, Valentina 30%.
Split 50/50: mitad cada uno.
Split personal: no entra al balance compartido.
El balance mensual calcula quién transfiere a quién y cuánto.

## Notas técnicas importantes

- **Next.js 16**: el archivo de auth se llama `proxy.ts` (no `middleware.ts`) y exporta `export default function proxy()`
- **Supabase keys**: formato nuevo `sb_publishable_*` (anon) y `sb_secret_*` (service role) — funcionan igual con `@supabase/ssr`
- **Supabase project ref**: `jlyikjlkgdyjjbxczqrm`
- **shadcn/ui**: variables CSS definidas en `app/globals.css` con `@theme inline`

## Archivos clave

| Archivo | Rol |
|---|---|
| `proxy.ts` | Auth guard (reemplaza middleware en Next.js 16) |
| `lib/balance.ts` | Lógica pura de cálculo del split y balance |
| `lib/email.ts` | Template y envío del resumen mensual con Resend |
| `supabase/schema.sql` | Schema completo + RLS (correr en Supabase SQL Editor) |
| `app/api/cron/monthly-summary/route.ts` | Endpoint del cron (día 1 de cada mes) |
| `.env.example` | Template de todas las variables de entorno necesarias |

## Convenciones de desarrollo

- Ramas: `fix/descripcion` o `feat/descripcion`
- PRs hacia `main` con descripción y checklist de testing
- Commits en inglés con el formato `tipo: descripción corta`
