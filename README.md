# LIVE Tracker Pro — Web

Versione web di **LIVE Tracker Pro** (clone dell'app iOS SwiftUI) per i creator del
Programma Incentivi TikTok LIVE. Next.js 14 App Router + Tailwind CSS + Supabase (auth + db)
+ Stripe Checkout. Deploy-ready per Vercel.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** — dark mode, colore brand `#FE2C55`
- **Supabase** — autenticazione (email + Google), database, RLS
- **Stripe** — Checkout subscription + Customer Portal + webhook
- **Vercel** — deploy

## Pagine

| Route         | Descrizione                                                        |
| ------------- | ------------------------------------------------------------------ |
| `/`           | Landing page (copy dell'app, stile Linear/Stripe)                  |
| `/login`      | Login / registrazione email + Google                               |
| `/pricing`    | 3 piani: Free, Pro, Agency                                         |
| `/dashboard`  | Dashboard ricompense, topic con progress bar, calcolatore mensile  |
| `/tracker`    | Video tracker CRUD con checklist approvazione obbligatoria         |
| `/account`    | Piano attuale, gestione abbonamento (Customer Portal), logout      |
| `/auth/*`     | Callback OAuth, conferma email, logout                             |

## Setup rapido

### 1. Installare

```bash
npm install
cp .env.example .env.local
```

### 2. Aggiungere le chiavi in `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID=price_...
```

### 3. Configurare Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. In **SQL Editor** esegui il contenuto di `supabase/migrations/00001_init.sql`
   (crea `profiles`, `subscriptions`, `tracked_videos`, trigger auto-profilo e RLS).
3. Prendi `Project URL` e `anon key` (Impostazioni → API) e la `service_role key`.
4. Abilita l'autenticazione email e il provider **Google**
   (Authentication → Sign In / Providers) con il redirect URL `http://localhost:3000/auth/callback`.

> Nota: la `service_role key` bypassa le RLS ed è usata SOLO dal webhook Stripe.
> Non metterla mai nel client.

### 4. Configurare Stripe (per far funzionare i pagamenti)

1. Crea prodotti/price subscription in [Stripe Dashboard](https://dashboard.stripe.com):
   - **Pro** → `19,00 € / mese` (recurring)
   - **Agency** → `49,00 € / mese` (recurring)
2. Copia i `price_...` nei relativi `NEXT_PUBLIC_STRIPE_*_PRICE_ID`.
3. `STRIPE_SECRET_KEY` → sezione Developers → API keys (usa `sk_test_` in sviluppo).
4. **Webhook**: Developers → Webhooks → Add endpoint:
   - URL: `http://localhost:3000/api/webhooks/stripe`
   - Eventi da inviare: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`
   - Copia il `Signing secret` (`whsec_...`) in `STRIPE_WEBHOOK_SECRET`.

> In sviluppo locale Stripe non può raggiungere `localhost`: usa
> [Stripe CLI](https://stripe.com/docs/stripe-cli) con `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
> e copia il secret mostrato dal CLI.

### 5. Avviare

```bash
npm run dev
```

Apri `http://localhost:3000`.

## Piani

| Piano   | Prezzo      | Limite video   |
| ------- | ----------- | -------------- |
| Free    | 0 €         | 3              |
| Pro     | 19 €/mese   | 100            |
| Agency  | 49 €/mese   | illimitati     |

Il limite è verificato lato server (`/api/videos`) oltre che nell'UI.
La checklist di approvazione è obbligatoria: non puoi salvare un video come
**Pubblicato** senza aver completato tutti i punti.

## Struttura

```
src/
├── app/
│   ├── api/
│   │   ├── videos/            # CRUD video (GET, POST)
│   │   ├── videos/[id]/       # PUT / DELETE
│   │   ├── plan/              # piano settimanale (GET, PUT)
│   │   ├── checkout/          # Stripe Checkout
│   │   ├── portal/            # Stripe Customer Portal
│   │   └── webhooks/stripe/   # eventi subscription
│   ├── auth/                  # callback, confirm, logout
│   ├── login/                 # email + Google
│   ├── pricing/               # piani
│   ├── dashboard/             # dashboard
│   ├── tracker/               # video tracker
│   └── account/               # gestione abbonamento
├── components/                # UI, AppShell, Dashboard, Tracker, Pricing
├── lib/
│   ├── models.ts              # port dei modelli Swift (Topic, VideoItem, Checklist, WeekPlan)
│   ├── video-store.ts         # port della logica VideoStore.swift
│   ├── plans.ts               # configurazione piani
│   ├── format.ts              # formatter EUR / date (it-IT)
│   ├── stripe.ts              # client Stripe + mappatura price→plan
│   ├── data.ts                # helper Supabase server
│   └── supabase/              # client (browser), server (cookies), service (webhook)
├── middleware.ts              # protezione route autenticate
└── app/globals.css
supabase/migrations/00001_init.sql   # schema DB completo
```

## Deploy su Vercel

1. `npm i -g vercel` e `vercel` oppure importa il repo da [vercel.com](https://vercel.com).
2. In **Environment Variables** aggiungi tutte le variabili di `.env.example`
   (con i valori di produzione; `NEXT_PUBLIC_SITE_URL` = URL del tuo dominio).
3. Nel dashboard Stripe aggiorna l'endpoint webhook con
   `https://tuo-dominio.vercel.app/api/webhooks/stripe`.
4. In Supabase aggiungi il dominio del deploy tra gli URL consentiti di autenticazione.

## Portabilità dalla versione iOS

La logica Swift è stata portata in TypeScript:

| Swift                                             | TypeScript                  |
| ------------------------------------------------- | --------------------------- |
| `Models/Topic.swift`, `VideoItem.swift`, ecc.     | `src/lib/models.ts`         |
| `ViewModels/VideoStore.swift`                     | `src/lib/video-store.ts`    |
| Checklist obbligatoria per "Pubblicato"           | `TrackerForm` + API `/api/videos` |
| `StoreKitManager.swift` (4.99/29.99 €)            | Stripe Checkout (piani web) |
