# Celebration of Life — Repast Food & Supply Sign-Up

A warm, mobile-first website for coordinating food and supplies for a funeral repast. Family and
friends open a texted link, see what's still needed, and sign up to bring an item in about a minute
— no account needed. Every item is capped at the quantity the family asks for, enforced in the
database, so the repast doesn't end up with five pans of macaroni and no drinks.

This is a standalone project with its own Supabase project, its own authentication, and its own
deployment. It shares nothing with any other application.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS) · Supabase (Postgres, Auth, Storage) ·
Vercel.

| URL | Who | What |
| --- | --- | --- |
| `/celebration/[slug]` | Anyone with the link | Memorial header (photo, name, years, date, location, time), the family's message, **View Food & Supply List**, category filters, **Show What's Still Needed**, Most Needed items, sign-up, **Suggest an Item**, optional memorial section, **Share** / **Copy Link**. `/` and `/celebration` go straight to the event when only one is published. |
| `/contribution/[token]` | The guest who signed up | Their private link: view, change the amount (if still available), or cancel. Also shows a suggestion's approval status. |
| `/admin` | Approved family admins | Events, Overview, Food List, Contributors, Suggestions, Event Settings, Print / CSV, Admins. Login at `/admin/login`. |

## How it works

- **No overbooking.** A trigger on `contributions` locks the item's row and re-totals every active
  claim before any insert or update that adds quantity. Two people tapping the last slot at the same
  moment are handled one after the other, and the second sees "This item is already covered — thank
  you!". The same rule covers admin edits, moves, and restores. Another trigger refuses lowering an
  item's quantity below what's already claimed.
- **Privacy.** Guests (Supabase's `anon` role) have no access to `contributions`,
  `suggested_items`, or `admin_users` — table grants are revoked, not just filtered. Each guest action
  is a `SECURITY DEFINER` database function (`get_public_event`, `claim_food_item`,
  `get_contribution_by_token`, `update_contribution_by_token`, `cancel_contribution_by_token`,
  `submit_suggested_item`) that returns only what that guest needs. Phone numbers and emails are only
  visible in `/admin`. With **Show contributor first names publicly** on (default off), items show
  "Claimed by Tasha B.".
- **Manage links.** Each sign-up gets a random 192-bit token. Only its SHA-256 hash is stored; the
  link is shown once on the thank-you screen and remembered in that phone's browser.
- **Admins.** Supabase Auth email/password plus a row in `admin_users`. Pages under `/admin` check it
  on the server, and Row Level Security (`is_memorial_admin()`) enforces it on every table, so
  hiding the URL isn't the protection.
- **No service-role key at runtime.** Guest pages use the anon key and database functions; admin
  pages use the admin's own session under RLS.
- **Nothing hard-coded.** The person's details, message, menu, quantities, deadline, and switches are
  all database rows edited from `/admin`, and one deployment can host more than one event.

### Project layout

```
src/app/celebration/        public event page + components
src/app/contribution/       guest's private manage page
src/app/admin/              admin login + dashboard (route group "(app)" is the guarded part)
src/app/api/celebration/    guest API routes (validate, then call the database functions)
src/lib/celebration/        types, formatting, errors, data loading, stats, uploads
src/lib/supabase/           Supabase clients + session refresh for this project
src/proxy.ts                Next.js proxy (middleware): requires a session for /admin
supabase/migrations/0001_initial_schema.sql   the whole database
supabase/seed/sample_event.sql                optional demo event
e2e/                        browser end-to-end tests
```

## Setup

### 1. Create a dedicated Supabase project

1. Create a **new** project at [supabase.com](https://supabase.com) for this site only.
2. In **SQL Editor**, run `supabase/migrations/0001_initial_schema.sql` (or `supabase db push` with
   the Supabase CLI). It creates the tables, security rules, database functions, and the
   `memorial-photos` storage bucket.
3. **Authentication → Sign In / Providers:** turn off **Allow new users to sign up**. Admins are
   created by you (next step), and nobody else needs an account.
4. **Authentication → URL Configuration:** set **Site URL** to your site's address, for example
   `https://your-domain.com`.

### 2. Create the first admin

1. **Authentication → Users → Add user**: enter your email and a password and check **Auto Confirm
   User**.
2. In **SQL Editor**, run once:
   ```sql
   insert into admin_users (user_id, email)
   select id, email from auth.users where email = 'you@example.com';
   ```
3. To add more admins later, create their user the same way, then approve their email from
   `/admin/admins`.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in your project's **Settings → API** values:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key |

That's all the app needs. The `CELEBRATION_TEST_*` variables in `.env.example` are only for the
tests below.

### 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/admin/login, sign in, and click **Create event**. Leave **Start with the
suggested menu** checked to get the starter categories and items (Main Dishes, Sides, Appetizers,
Desserts, Beverages, Supplies, Other). Then fill in **Event Settings** — photo, dates, location,
times, message, deadline — switch **Published** on, and copy the link from **Overview**.

To replace the starter menu, edit or delete items under **Food List**, or uncheck the suggested-menu
box when creating the event. The starter list is defined in `seed_default_menu()` in the migration.
`supabase/seed/sample_event.sql` optionally creates a demo event at `/celebration/sample`.

## Deploying (Vercel)

1. In Vercel, **Add New → Project** and import this repository as a **new** project.
2. Under **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from this site's Supabase project (Production, and Preview if you
   use preview deployments).
3. Deploy. Vercel gives the site a free address like `your-project-name.vercel.app` — no domain
   purchase is needed. Put that address in Supabase under **Authentication → URL Configuration →
   Site URL**. (Optionally, add your own domain later under **Settings → Domains** and update the
   Site URL to match.)

The two values can be the legacy **anon public** key (`eyJ…`) or the newer **publishable** key
(`sb_publishable_…`). Never use the `service_role` / secret key in this project.

Link previews in text messages use the event's name, message, and photo.

## Admin guide

- **Overview:** Total Items Needed, Contributions Claimed, Items Still Needed, Items Fully Covered,
  Pending Suggestions, Total Contributors, a "Repast Preparation — N% Covered" bar, what's still
  needed, the latest sign-ups, and the share link and message.
- **Food List:** add, edit, or delete items; change category, quantity, unit, serving description,
  and sort order; **★ Most needed** (shown first under "Most Needed"); **Mark covered** / **Reopen**
  (reopening a fully claimed item asks how many more are needed); **Hide**. Categories can be added,
  renamed, reordered, or deleted when empty.
- **Contributors:** name, phone, email, item, quantity, notes, sign-up time, status. Edit, move to
  another item, mark received, cancel, restore, or add a sign-up taken over the phone.
- **Suggestions:** guests' "bring something else" offers wait as **Pending Family Approval**.
  **Approve** adds the item to the public list (under Other, or a category you choose) as already
  covered, with the guest as its confirmed contributor. **Decline** leaves the list unchanged.
- **Event Settings:** page header, message, photos (resized in the browser before upload), memorial
  section (photo, biography, favorite saying, extra photos), sign-up deadline and timezone, and the
  switches **Published**, **Accepting sign-ups**, **Show contributor first names publicly**,
  **Allow suggestions**, and **Show memorial section**. After the deadline (end of that day in the
  event's timezone), new public sign-ups, increases, and suggestions stop; guests can still reduce or
  cancel, and admins can still change anything.
- **Print:** a checklist grouped by category ("☐ Fried Chicken — Tasha — 2 trays — phone") with the
  still-needed lines, a toggle to leave phone numbers off, and **Download CSV** of every sign-up.

## Testing

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint (Next.js core-web-vitals + TypeScript rules)
npm test            # unit tests: quantities/units, statuses, dates, messages, stats, CSV
npm run build       # production build
```

### Database tests

`src/lib/celebration/db.integration.test.ts` checks the real database rules: privacy grants,
final-slot coverage, 25 simultaneous claims for the last slot (exactly one wins), token
change/cancel, suggestion approval, non-admin lockout, admin capacity rules, deadline/hidden/covered
items, and input validation. They create users and events, so only run them against a **local**
(`supabase start`) or throwaway project:

```bash
supabase start      # then apply supabase/migrations (supabase db reset)
CELEBRATION_TEST_SUPABASE_URL=http://127.0.0.1:54321 \
CELEBRATION_TEST_ANON_KEY=<anon key> \
CELEBRATION_TEST_SERVICE_ROLE_KEY=<service role key> \
npm run test:db
```

### Browser end-to-end tests

`e2e/guest.mjs` (32 checks) covers the phone-sized guest flow: sign-up, the final slot, losing a race
for the last slot, filters, change/cancel by link, suggesting an item, and privacy of the public page.
`e2e/admin.mjs` (39 checks) covers login, non-admin lockout, the login redirect guard, overview,
approving a suggestion, contributors, item management, settings and photo upload, print and CSV,
adding/removing admins, and the deadline. Against a local or throwaway Supabase with the app running
on port 3000:

```bash
npx playwright install chromium   # once
CELEBRATION_TEST_SERVICE_ROLE_KEY=<service role key> node e2e/setup.mjs   # sample event + test users
npm run test:e2e
```

`setup.mjs` resets the `sample` event and creates `admin@family.test` (approved) and
`cousin@family.test` (not approved); override with `E2E_ADMIN_EMAIL`, `E2E_OUTSIDER_EMAIL`,
`E2E_PASSWORD`, `E2E_BASE_URL`, or `PLAYWRIGHT_CHROMIUM_PATH`. Run `setup.mjs` again before each
full run, since the guest suite leaves sign-ups behind.

Before sharing the link, also try it once on a real phone: open it, sign up, use the thank-you
screen's link to change and cancel, and suggest an item.
