# Admin Prototype

Full-stack admin prototype with three tools behind Clerk authentication:

- **Refunds** — view, flag, approve, or reject refunds (coming soon)
- **Feature Flags** — set flags to off, on, or a percentage rollout (coming soon)
- **Audit Log** — admin-only view of all actions taken (coming soon)

All pages require sign-in except `/sign-in`. Roles are `viewer` (default) and
`admin`; the Audit Log tab and page are admin-only, and the current role is
shown as a badge in the header.

## Setup

Requires Node.js 22+ (`nvm use` picks it up from `.nvmrc`).

1. Install dependencies (also generates the Prisma client):

   ```bash
   npm install
   ```

2. Create a free Clerk application at <https://dashboard.clerk.com>, then copy
   your API keys:

   ```bash
   cp .env.example .env.local
   # paste your keys into .env.local:
   #   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   #   CLERK_SECRET_KEY=sk_test_...
   ```

3. Create the SQLite database and seed it with synthetic data (~200 refunds,
   10 feature flags, sample audit entries):

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   The database lives at `prisma/dev.db` (gitignored). Re-running the seed
   wipes and regenerates the data.

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000> — you'll be redirected to sign in.

## Users and roles

Users are managed in your own Clerk dashboard (Users tab). Everyone defaults
to the `viewer` role. To make someone an admin, open the user in the Clerk
dashboard, edit **Public metadata**, and set:

```json
{ "role": "admin" }
```

Admins see the Audit Log tab and will be able to take actions on refunds and
feature flags; viewers are read-only.
