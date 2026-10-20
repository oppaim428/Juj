# PRD — find-my-digital-gems + Juj admin/orders/payments

## Original request
Incrementally integrate ONLY the Admin Panel, Sales/Orders tracking and Payment features/APIs from https://github.com/youtnad1-droid/Juj into the base project https://github.com/appsumonadi/find-my-digital-gems, keeping all base UI/pages/styles intact. Admin under /admin, wire payments into the existing Buy button without changing its design, append env vars to .env.example. User choice: keep Juj's payment providers (Stripe, PayPal, Razorpay, NOWPayments crypto).

## Architecture
- /app/frontend = base repo verbatim (TanStack Start + Supabase catalog/auth) + added files. `yarn start` runs vite on 3000.
- Orders, payment transactions, order messages, settings, admin users: local MongoDB (MONGO_URL/DB_NAME) via `src/lib/db.server.ts`.
- Payments: `src/lib/payments.server.ts` (Juj handlers). Stripe = Emergent claimable sandbox (test). Webhooks: /api/stripe/webhook, /api/payments/crypto/ipn.
- Admin auth: local bcrypt + JWT cookie `juj_admin_session`, seeded from ADMIN_EMAIL/ADMIN_PASSWORD, 5-fail lockout.
- /app/backend/server.py: proxy of /api/* to the Node app (ingress sends /api to 8001).

## Implemented (2026-06)
- Buy button on product page wired to checkout (payment method picker added above it), /checkout/return polling, /orders list + /orders/$id (pay again, confirm received, timeline)
- Admin panel /admin: login, dashboard (sales volume, earnings, status counts, sales by method), orders & sales (search/filter, deliver, release, refund w/ Stripe refund, cancel), payments list, settings (payment method toggles, auto-complete hours)
- Base login fallback: rate limiting in Mongo when SUPABASE_SERVICE_ROLE_KEY is missing
- Removed base's placeholder Supabase admin pages and "coming soon" orders page (replaced by Juj versions)
- Tested: iteration_1 + iteration_2 all flows pass

## Backlog
- P0: User to supply PayPal / Razorpay / NOWPayments keys (currently "Not set up")
- P1: Admin user/offer/category management needs SUPABASE_SERVICE_ROLE_KEY (catalog lives in Supabase)
- P1: Stock/sales counters in Supabase are not decremented on sale (needs service key)
- P2: Automatic code delivery (offer_codes in Supabase), email notifications, seller cabinet
