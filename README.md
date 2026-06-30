# SCTMS — Shopfloor Competency & Training Management System

Enterprise web portal version of the SCTMS user guide. Real database, login,
and role-based access, ready to host and hand to a customer.

## What's built so far

- **Auth**: NextAuth credentials login, JWT sessions, 4 roles (Admin, Manager,
  Trainer, Supervisor) enforced both in the UI and in server actions.
- **Database schema** (`prisma/schema.prisma`): every entity from the user
  guide — Production Areas, Domains, Operators, Assessments, Training
  Programmes, Training Plans, Sessions/Enrollments, Certifications, Audit Log.
- **Module 1 — Skill Matrix**: fully working end-to-end against the real
  database — add staff, record an assessed level, see the live gap-analysis
  grid (green/amber/red/grey) computed from each operator's role profile
  target.
- **Seed script**: loads the 5 production areas, 8 domains, role profile
  targets, and the 40 standard training programmes from the user guide, plus
  creates your first Admin login.

## What's not built yet

Modules 2–7 (Training Matrix, Training Plans, Certification & Compliance,
Training Calendar, Progress Monitoring, Executive Dashboard) are modeled in
the database schema but don't have pages yet. They all follow the exact same
pattern as Skill Matrix: an `actions.ts` file with server actions, and a
`page.tsx` that reads + renders. Once you confirm Skill Matrix looks right,
I'll build the remaining six the same way — that's the bulk of remaining
work, but it's mechanical, not risky.

File upload for the PPTX training decks, DOCX assessor guides, and signed
sign-off sheets isn't wired up yet either (needs an object storage bucket —
see below).

---

## How to actually host this (step by step)

### 1. Database — Supabase (free to start)

1. Go to supabase.com → New project.
2. Once created, go to **Project Settings → Database → Connection string**.
3. Copy the **"Transaction" pooler** URL into `DATABASE_URL`, and the
   **"Session"/direct** URL into `DIRECT_URL`, in a `.env` file (copy
   `.env.example` to `.env` first).

(Neon.tech is an equally good free alternative if you prefer it.)

### 2. Push the schema to the database

```bash
npm install
npm run db:push      # creates all tables in your Supabase database
npm run db:seed      # loads reference data + creates first Admin login
```

The seed script prints the admin email/password it created — log in with
that and change the password (a "change password" admin screen can be added).

### 3. Run it locally to check everything

```bash
npm run dev
```

Visit `localhost:3000`, log in with the seeded admin account.

### 4. Deploy — Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import that repo.
3. In **Environment Variables**, add: `DATABASE_URL`, `DIRECT_URL`,
   `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`),
   `NEXTAUTH_URL` (your eventual production URL, e.g.
   `https://sctms.yourcompany.com`).
4. Deploy. Vercel builds and hosts it; you get a URL immediately, and can
   attach a custom domain in Vercel's settings afterward.

Total recurring cost at this scale: **$0–$25/month** (Vercel hobby tier +
Supabase free tier handle a single-company deployment comfortably; you'd
upgrade only if the customer's data/traffic grows significantly).

### 5. Hand it to the customer

Create their real user accounts (an Admin "Manage Users" page should be
added before go-live — flag if you want that built now), and stop using the
seeded default admin password.

---

## Architecture notes

- **Why this is "real" and not a prototype**: every write goes through a
  server action that re-checks the caller's role server-side
  (`lib/permissions.ts`) — a Supervisor can't fake their way into Admin
  actions by editing the browser. All data lives in Postgres, not
  in-memory or localStorage, so it survives restarts/deploys and supports
  multiple concurrent users correctly.
- **Multi-tenancy**: this is currently single-company. If you later sell it
  to multiple customers, the cleanest path is one Supabase project +
  deployment per customer (simplest, fully isolated) rather than retrofitting
  multi-tenant rows — flag if you want that conversation now vs. later.
- **File storage** (training decks, signed forms, certificates): plug in
  Supabase Storage (same project, S3-compatible, free tier included) or AWS
  S3. Not wired up yet — say the word and it can be added.

## Suggested next steps

1. Build out Modules 2–7 (Training Matrix → Executive Dashboard) following
   the Skill Matrix pattern.
2. Add file upload/storage for training decks and signed forms.
3. Add a "Manage Users" admin screen so logins aren't created via the seed
   script.
4. Add the certification expiry alert logic (90-day amber / 30-day red /
   expired) as a scheduled job.
