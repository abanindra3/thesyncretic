# The Syncretic Guest House

Next.js booking application with Supabase PostgreSQL/Auth/Storage and Razorpay payments.

## What is implemented

- One central `bookings` source for website, manager, and walk-in reservations.
- Server-side availability checks and 15-minute booking holds.
- PostgreSQL schema, indexes, RLS policies, audit-log table, private document bucket, and development room seed data.
- Razorpay order creation, browser-signature verification, signed webhook verification, and idempotent payment recording.
- Fixed manager username/password sign-in through Supabase Auth—no SMS provider required.
- Staff-only manager route and API reads; public visitors cannot call manager booking APIs.

## Required free-tier services

1. Create a Supabase project. In **Authentication → URL Configuration**, add the production URL and `http://localhost:3000` as redirect URLs.
2. In **Authentication → Email Templates**, set the magic-link redirect to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/manager`.
3. Install the Supabase CLI, run `supabase link`, then apply the schema and local seed:

   ```bash
   supabase db push
   supabase db reset # local development only; also applies supabase/seed.sql
   ```

4. Create the first owner account in Supabase Auth, then add its profile using the SQL editor. Use the manager's real email address for magic-link sign-in; the display name can be `jayanta`. Do not commit or paste their password into any configuration file:

   ```sql
   insert into public.profiles (id, full_name, email, role)
   values ('AUTH_USER_UUID', 'Owner name', 'owner@example.com', 'owner');
   ```

5. Create a Razorpay account, configure its webhook as `https://YOUR_DOMAIN/api/payments/razorpay/webhook`, and subscribe to `payment.captured` and `payment.failed` events.
6. Copy `.env.example` to `.env.local` and fill every value. Only `NEXT_PUBLIC_*` variables may be exposed to the browser; the Supabase service role and Razorpay secret must remain server-only.

## Deploy to Vercel

1. Import this GitHub repository into the existing `thesyncretic` Vercel project.
2. In **Project Settings → Environment Variables**, add every variable from `.env.example` for Production, Preview, and Development as appropriate.
3. Set `NEXT_PUBLIC_APP_URL` to `https://thesyncretic.vercel.app` in Production.
4. Deploy. Then add that URL to Supabase Auth redirect URLs and register `https://thesyncretic.vercel.app/api/payments/razorpay/webhook` in Razorpay.

The manager is fixed as a staff record—not a self-sign-up user. Create `thesyncretic123@gmail.com` in Supabase Auth with the manager password, assign the `manager` profile role, and use `/manager/login` with username `jayanta`. The application does not create accounts or store the password.

## Run and verify

```bash
pnpm install
pnpm dev
pnpm build
```

Before production, replace the `supabase/seed.sql` development inventory with the actual physical room list, add real staff profiles, and test a Razorpay test-mode payment and webhook delivery. The application returns configuration errors until required credentials are supplied; it never reports a payment as successful without server-side signature verification.
