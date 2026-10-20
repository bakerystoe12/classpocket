# Deploying ClassPocket to Vercel with Supabase and Claude or Groq

**For custom Claude gizmos, follow [CLAUDE_SETUP.md](CLAUDE_SETUP.md) in addition to the Supabase/Vercel steps below.** Select `AI_PROVIDER=anthropic`, configure the server-only `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`, and redeploy. `/api/studio` now declares `maxDuration=180`; enable Fluid Compute and a compatible function duration in Vercel. The Groq instructions below remain for the legacy template and classroom generators.

These are one-time account steps that an adult administrator performs. A `git push` cannot create accounts, databases or credentials. Once these steps are done, every push to GitHub triggers a normal Vercel deployment. Never paste secrets into chat, issues or commits.

Limits and terms change over time. Recheck the current pages linked below when you deploy.

## 0. What you need

- A GitHub account with access to `bakerystoe12/classpocket`
- A Vercel account (Hobby is enough for a demo)
- A Supabase account (the free plan is enough for a small demo; it has quotas and pauses inactive projects, so it is not an uptime guarantee)
- Optional: a Groq developer account for AI Studio, owned by an adult
- Locally: Node.js 22 and the Supabase CLI (`npx -y supabase@2 …` works without installing it)

## 1. Supabase project, schema, security and seed

1. Create a project at https://supabase.com/dashboard and choose a region close to your users. Save the database password in a password manager.
2. Link this repository and apply the migrations. They create every table, index, constraint, RLS policy, database function and the private `lesson-sources` storage bucket:
   ```bash
   npx -y supabase@2 login
   npx -y supabase@2 link --project-ref <your-project-ref>
   npx -y supabase@2 db push            # applies supabase/migrations/* in order
   ```
3. **Authentication → Sign In / Providers:**
   - Turn on **Allow anonymous sign-ins** (guest profiles).
   - Keep **Email** enabled so teachers can sign in. ClassPocket has no public sign-up screen. Teacher authority comes only from the `user_roles` table, which only the admin script can write. An email account that someone registers directly through the Auth API gets no role.
   - Keep **Confirm email** on.
   - Optional hardening: if you enable CAPTCHA for anonymous sign-ins, `startGuest` in `lib/server/session.ts` must also pass a captcha token. That change is not implemented yet.
4. **Authentication → URL Configuration:**
   - Site URL: `https://<your-production-domain>`
   - Redirect URLs: `https://<your-production-domain>/auth/callback`, plus your preview pattern if previews use this project (for example `https://*-<your-team>.vercel.app/auth/callback`)
5. **Project Settings → API Keys:** copy the **Project URL**, the **publishable key** (`sb_publishable_…`) and a **secret key** (`sb_secret_…`). Supabase's server-side Next.js guide uses these keys with `@supabase/ssr` and `@supabase/supabase-js` 2.x, which this repo pins in its lockfile.
6. Seed the reviewed, authored content. This is idempotent and never touches user rows:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=<secret> npm run db:seed
   ```
   You can also put the values in a local, git-ignored `.env.local` and run `npm run db:seed`.
7. Provision each teacher with the documented admin operation. It prints a one-time password unless `TEACHER_INITIAL_PASSWORD` is set:
   ```bash
   npm run admin:teacher -- teacher@school.example "Ms Rivera"
   npm run admin:revoke-teacher -- teacher@school.example
   ```
8. Optional: import the old SQLite demo with `npm run import:sqlite -- data/classpocket.sqlite --dry-run`, then run it again without `--dry-run`. See the README for what it can and cannot preserve.

## 2. Groq (optional AI Studio)

1. An adult creates a developer account at https://console.groq.com and an API key under **API Keys**. Never commit the key or paste it anywhere except Vercel's environment settings.
2. Check, at deployment time:
   - that `openai/gpt-oss-20b` (or your chosen `GROQ_MODEL`) is still available and supports **strict** `json_schema` structured outputs: https://console.groq.com/docs/structured-outputs
   - your account's free-tier request and token limits: https://console.groq.com/docs/rate-limits. ClassPocket's daily budgets (`AI_*_DAILY_LIMIT`) should sit below them.
   - Groq's Services Agreement, which includes developer responsibilities for products used by minors, and the model's own licence and terms: https://console.groq.com/docs/legal/services-agreement. A free tier does not by itself make a provider suitable for an under-18 audience in your jurisdiction.
3. ClassPocket never switches to another or paid provider. If the key is missing or `AI_ENABLED=false`, Studio says "AI creation isn't configured" and keeps templates and manual editing. Do not substitute the Gemini Developer API: its terms restrict use by under-18s.

## 3. Import the repository into Vercel

1. Go to https://vercel.com/new and import `bakerystoe12/classpocket`.
2. Framework preset: **Next.js** (auto-detected). Root directory: `./`. Install command: `npm ci`. Build command: `npm run build`. Output: default.
3. Node.js version: **22.x** (from `package.json` `engines`; you can also pin it under Settings → Build and Deployment).
4. Functions: route handlers run on the Node.js runtime. Long routes (`/api/studio`, `/api/study`, classroom) declare `maxDuration = 60`, which fits Hobby. PDFs never pass through a function body: browsers upload them directly to Supabase Storage, so Vercel's request-body limit (4.5 MB when this was written; see https://vercel.com/docs/functions/limitations) does not cap the 10 MB PDF limit.
5. You do not need a custom server, a Cloudflare tunnel, a PowerShell script or a running laptop. The SQLite file and the shared teacher password are gone.

## 4. Environment variables

In Vercel → Settings → Environment Variables, add these **separately for Production and for Preview**:

| Name | Production | Preview | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | prod project URL | **separate** preview project URL (recommended) | Inlined into the browser bundle at build time |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable key | preview publishable key | Safe in the browser |
| `SUPABASE_SECRET_KEY` | prod secret key | preview secret key | **Server-only.** Never `NEXT_PUBLIC_`. |
| `APP_URL` | `https://<production-domain>` | leave empty | Canonical origin for links and the origin check; previews fall back to `VERCEL_URL`/`VERCEL_BRANCH_URL` |
| `ALLOWED_ORIGINS` | your custom domains, comma-separated | — | Optional |
| `GROQ_API_KEY` | prod key | separate key, or omit | Server-only |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | same | Verify availability (step 2) |
| `AI_ENABLED` | `true` | `false` unless you need it | |
| `AI_USER_DAILY_LIMIT` / `AI_GUEST_DAILY_LIMIT` / `AI_GLOBAL_DAILY_LIMIT` | e.g. `20` / `5` / `300` | lower | Durable, atomic, per UTC day in Postgres |
| `DEMO_MODE` | `true` only for the judge deployment | `true` | Shows the clearly labelled preview clock |

**Preview isolation:** use a second Supabase project for Preview (the free plan allows two projects) so preview builds never read or write production user data. If you must share one project, turn on Vercel Deployment Protection for previews and treat preview users as real users.

Redeploy after any environment change: Deployments → … → Redeploy. `NEXT_PUBLIC_*` values only change in a new build.

## 5. Order of operations for each release

1. Apply new migrations **before** deploying code that depends on them: `npx -y supabase@2 db push` against the production project. Migrations are additive; never run `db reset` on production.
2. Take a backup first: `npx -y supabase@2 db dump -f backup-$(date +%F).sql` (and `--data-only` for data). Free projects do not include point-in-time recovery.
3. Push to the production branch, or promote a verified preview.

## 6. Rollback without deleting user data

- **Code:** Vercel → Deployments → choose the previous healthy deployment → **Instant Rollback** (or Promote to Production). The database is untouched.
- **Schema:** do not drop tables or columns during a rollback. Older code tolerates additive columns. If a migration must be reverted, write a new forward migration that restores the old shape, then test it on the preview project first.
- **Data:** restore from your `db dump` only as a last resort, and only into a fresh project first, to inspect it.

## 7. Verify the public URL

A green build is not a working deployment. On the real HTTPS origin:

1. `GET /api/health` returns `{"backend":true,"database":"ok","authoredPosts":30,"ai":<true|false>}`.
2. Open the site in browser A. The welcome dialog appears before the feed, then play three gizmos.
3. Timetable: save the demo school day. In a class period the feed is limited to that subject; at the bell it moves on.
4. Studio: "Make a planet where a cat jumps ridiculously high" → **Create with AI**. Then "Make it Mars, add a spring launch pad and make the cat orange" → **Change it with AI**. The gravity must change to 3.71 m/s², a spring pad must appear, and the cat must turn orange. This is the first live-provider check; record the result honestly.
5. Publish, then **Friends → Create invite link**. Open the link in browser B (a private window or another device) and join. Both browsers show 2 people.
6. Teacher: sign in with a provisioned account in the timetable sheet and publish a class timetable. Join it from browser B, and check that B cannot edit or leave it until the teacher releases them.
7. Topic session: `/study/create` → upload a text PDF over 5 MB → review → assign. Join from B and finish the ten missions.
8. **Durability:** redeploy (Deployments → Redeploy, without reusing the build cache), wait for the new deployment, and reload browsers A and B. Profiles, the published gizmo, room membership and the timetable must still be there. A plain page refresh alone does not prove this.
9. Run the automated journeys against the deployment where possible: `TEST_BASE_URL=https://<domain> npm run test:integration`. The AI tests in that suite need a server configured with the mock provider, so skip `tests/integration/ai.test.ts` against production and rely on step 4.

## 8. Scale and cost notes

- Interactions run in the browser, and playing a saved gizmo makes no AI call. Generation happens once per create or edit, its result is persisted, and it is budgeted per user, per guest and globally in Postgres. Guests who clear cookies still count against the global cap.
- The feed is keyset-paginated (8 per page). Counts are denormalised and kept exact by triggers. Polling is 5 s on Friends, 30 s elsewhere, paused in hidden tabs, with backoff on errors.
- Local measurement (4 vCPU container with local Supabase in Docker, 20 concurrent guests, 400 requests): `/api/feed` p50 166 ms and p95 251 ms; `/api/rhythm` p50 123 ms; `/api/social` p50 149 ms; 0 failures. This is not a production measurement, and nothing here has been load-tested at 10,000 users.
- At around 10,000 users the likely first bottlenecks are AI quota (Groq free-tier tokens per minute and per day), Supabase free-tier database size, egress and connection limits, and anonymous sign-in rate limits. The path forward: paid Groq and Supabase tiers, Supavisor connection pooling, queued (job-based) authoring for batch lesson generation, CDN caching for the authored catalogue, and more storage.

## 9. Before a real child-facing rollout

The judge guest mode is not evidence of child-safety compliance. Before real students use ClassPocket:

- Add age-appropriate onboarding, school or guardian relationships with verified consent, moderation and reporting workflows (reports are currently stored but not reviewed in-app), and retention and deletion policies. Account deletion exists; per-item retention is future work.
- Review provider terms for your audience and jurisdiction, and keep child data out of analytics and model prompts. The app already sends only the idea text and gizmo settings to Groq.
