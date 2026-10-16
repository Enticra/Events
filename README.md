# Popcorn Events

Full-stack booking platform for event rentals, DJ/entertainment and event production.

- **Frontend** — React 18, Vite, Tailwind CSS, React Router (`client/`)
- **Backend** — Node 22.9+ / Express, PostgreSQL via `pg` (`server/`)

## Run it

```bash
npm run install:all   # installs root, server and client deps
npm run dev           # API on :4000, web app on http://localhost:5173
```

Production (single port, API serves the built frontend):

```bash
npm start             # builds client, then serves everything on http://localhost:4000
```

### Database (PostgreSQL)

Set `DATABASE_URL` in `server/.env`:

```
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/popcorn_events
```

On boot the server creates the database (if missing) and the `records` table. Each row is one document: `entity` is the type (`Product`, `Package`, `Booking`, …) and `data` is a `jsonb` column with its fields. Manage content from the **Content** tab at `/admin`, or with any Postgres client (pgAdmin, DBeaver, `psql`):

```sql
SELECT id, data->>'name' AS name, data->>'daily_price' AS price FROM records WHERE entity = 'Product';
```

**First-time data import:** the catalog that previously lived in SQLite (`server/data/events.db`) is copied into Postgres with `npm run db:import-sqlite --prefix server`. It keeps ids and dates and skips rows already present, so it's safe to re-run. Once imported, `server/data/` is no longer used.

**Backups:** `pg_dump -Fc popcorn_events > backup.dump`, restore with `pg_restore -d popcorn_events backup.dump`.

### Environment variables (server)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `ADMIN_PASSWORD` | `admin123` | Password for `/admin` — **change before deploying** |
| `AUTH_SECRET` | random per boot | HMAC secret for admin tokens; set it so logins survive restarts |
| `DATABASE_URL` | — (required) | PostgreSQL connection string |
| `DATABASE_SSL` | `false` | `true` for hosted Postgres that requires TLS |
| `STRIPE_SECRET_KEY` | — | Stripe secret key; payments are disabled without it |
| `STRIPE_WEBHOOK_SECRET` | — | Signing secret for `/api/stripe/webhook` |
| `PUBLIC_URL` | requesting site | Base URL Stripe redirects customers back to (set in production) |

Put these in `server/.env` (see `server/.env.example`); it's loaded automatically.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Home: divisions, featured rentals & entertainment, POP concierge, gallery, how it works |
| `/rentals`, `/rentals/:id` | Storefront with category filter, search, live per-date availability |
| `/book` | DJ & entertainment services |
| `/packages` | Package marketplace with event-type and indoor/outdoor filters |
| `/cart`, `/checkout` | Unified cart (rentals + services + packages), fulfillment, agreements, e-signature |
| `/booking-confirmed/:id` | Booking summary and deposit/balance payment (demo) |
| `/build-my-event` | 7-question wizard → priced recommendation → cart, or send to team as a lead |
| `/request-quote`, `/contact` | Lead and message capture |
| `/calculators` | Guest-count planning calculator |
| `/dj-rental`, `/corporate-av`, `/event-production` | Service landing pages |
| `/gallery`, `/blog`, `/blog/:slug`, `/service-areas`, `/service-areas/:slug`, `/about` | Content |
| `/dj-portal` | Customers find their booking (email + date) and send timeline/song requests to the DJ |
| `/quote/:id` | Customer views a quote, signs the contract, pays the deposit |
| `/admin` | Dashboard: stats, bookings, quote builder, messages, catalog/content editor, team |

## API overview

- `GET/POST/PUT/DELETE /api/entities/:entity[/:id]` — generic CRUD for `Product, Package, ServiceOffering, ServiceArea, BlogPost, GalleryItem, Review, Performer, Booking, Quote, Message`. Catalog entities are publicly readable (active/published only); all writes and customer data need an admin token.
- `GET /api/availability?date=` — units free per product on a date
- `POST /api/cart/quote`, `POST /api/checkout` — server re-prices every line from the catalog (clients can't set prices), enforces minimum hours and checks inventory
- `POST /api/bookings/:id/checkout-session|verify-payment`, `POST /api/quotes/:id/sign|checkout-session|verify-payment`, `POST /api/stripe/webhook` — Stripe payments
- `POST /api/concierge` — rule-based event planner (no external AI service)
- `POST /api/portal/lookup`, `PUT /api/portal/:id` — DJ client portal
- `POST /api/leads`, `POST /api/messages`
- `POST /api/auth/login`, `GET /api/admin/stats`, `POST /api/admin/quotes[/:id/send]`

## Payments (Stripe)

Customers pay on Stripe's hosted Checkout page — card data never touches this server. Logic lives in `server/src/payments.js`.

**Flow:** checkout reserves the booking → server creates a Checkout Session for the amount due (25% deposit or full; later, the balance) → customer pays on Stripe → payment is recorded on the booking (`amount_paid`, `balance_due`, `payment_status`, `payments[]`). Signed quotes use the same flow for their deposit.

A payment is recorded by whichever happens first: the **webhook** (`checkout.session.completed`) or the customer **returning** to the site, where the server re-fetches the session from Stripe to confirm it. Recording is idempotent per session, so nothing is double-counted.

### Setup

1. Copy `server/.env.example` to `server/.env` and set `STRIPE_SECRET_KEY` (start with a `sk_test_…` key from https://dashboard.stripe.com/apikeys).
2. **Local webhooks** — install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then run `stripe login` and `npm run stripe:listen --prefix server`. Put the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` and restart the server.
3. Test with card `4242 4242 4242 4242`, any future expiry, any CVC.
4. **Production** — in the Stripe Dashboard → Developers → Webhooks, add an endpoint `https://YOUR-DOMAIN/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`; use its signing secret. Set `PUBLIC_URL=https://YOUR-DOMAIN` and switch to your live `sk_live_…` key.

Without `STRIPE_SECRET_KEY`, bookings can still be reserved but payment buttons return "Online payments are not configured yet."

Refunds are issued from the Stripe Dashboard (the booking's `payments[]` entry has the `payment_intent` id to find it).

## Not wired up (yet)

- **Email** isn't sent. "Send quote" marks it sent and shows the customer link to share manually.
- **Concierge** uses fixed sizing rules (`server/src/concierge.js`) rather than an LLM.
