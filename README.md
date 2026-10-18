# ClassPocket

A social feed of miniature interactive science worlds whose recommendations follow a student's class timetable. Students play with twenty different Physics gizmos, describe and remix their own in Studio, and invite friends into saved snapshots. Teachers turn lesson notes into ten-mission topic sessions and manage class timetables.

- **Status:** the code, database migrations, tests and docs for the Vercel + Supabase + Groq version are complete. They are verified against a local Supabase stack and a **mock** Groq endpoint. A live Vercel deployment and a live Groq call have **not** been verified yet because no Vercel, Supabase or Groq accounts were available while it was built. [FEATURE_STATUS.md](FEATURE_STATUS.md) lists exactly what is implemented, authored, AI-generated, mocked or future work.
- **Deploy:** [DEPLOYMENT.md](DEPLOYMENT.md) · **Demo:** [JUDGE_SCRIPT.md](JUDGE_SCRIPT.md) · **Original team plan (unchanged):** [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md)

Redirecting some otherwise idle scrolling toward the current lesson is a product ambition. ClassPocket makes no claim of measured attention, retention, health or learning benefit, and has no school approval.

## Architecture

| Layer | Choice |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript, Zod 4. Route handlers run on the Node.js runtime. Interactions render client-side with canvas, SVG and Web Audio. |
| Identity | Supabase Auth with the cookie-based `@supabase/ssr` integration (`proxy.ts` refreshes sessions). Guests use anonymous sign-in. Teachers are email/password accounts whose `teacher` role is granted only by an admin script. |
| Data | Supabase Postgres ([supabase/migrations](supabase/migrations)): row-level security on every table, constraints and indexes, counter triggers, and atomic SQL functions for multi-row and role-sensitive writes. |
| Files | Private Supabase Storage bucket `lesson-sources`. The browser uploads PDFs (up to 10 MB) directly with a signed upload token; the server extracts the text and then deletes the file. |
| AI | Groq chat completions with strict JSON-schema output (`openai/gpt-oss-20b` by default), followed by independent Zod and semantic validation, at most one repair attempt, and durable daily quotas in Postgres. |

Key directories:

```
app/api/*            Route handlers: session, feed, social, studio, rhythm, study, uploads, health, classroom ([...path])
lib/gizmo-spec.ts    Versioned (v2) discriminated gizmo schema, per-engine parameters/units/ranges, semantic checks
lib/physics-demo.ts  Tested formulas used by renderers, validators and the AI pipeline
lib/rhythm.ts        Timetable validation and bell semantics shared by browser and server
lib/server/*         Repositories (auth-checked, RLS-scoped) and the Studio generation pipeline
lib/ai/*             Prompt screening, Groq client, model-output → definition conversion
components/social/*  Feed, Studio builder, renderers (GizmoCanvas, InteractiveWidgets, PlanetHop)
supabase/            config.toml for local development and SQL migrations
scripts/             seed, admin:teacher, admin:revoke-teacher, import-sqlite
tests/               unit, integration (real local Supabase + mock Groq), browser (Playwright)
```

## Run locally

Requirements: Node.js 22, Docker, and the [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
npm ci
npm run db:start            # local Postgres, Auth, PostgREST and Storage in Docker
# Copy the printed API URL, publishable key and secret key into .env.local (see .env.example)
cp .env.example .env.local
npm run db:seed                       # authored gizmos + included topic sessions (idempotent)
npm run admin:teacher -- you@school.example "Your Name"   # prints a one-time password
npm run dev
```

Open http://localhost:3000. Without Supabase configuration the app still builds and plays the authored catalogue, and shows a "setup needed" banner instead of pretending to save. Without a Groq key, Studio says "AI creation isn't configured" and offers templates and manual editing.

## Tests

```bash
npm run typecheck
npm test                    # 38 unit tests: physics formulas, schema/semantics, timetable/DST, AI conversion, screening
```

Integration and browser tests need the local Supabase stack, a production build and the **mock** Groq server:

```bash
npm run mock:groq &                                                # MOCK provider on :4010 (fixtures, not a real model)
npm run build
GROQ_API_KEY=test-groq-key GROQ_BASE_URL=http://127.0.0.1:4010 AI_TIMEOUT_MS=4000 \
  AI_GUEST_DAILY_LIMIT=40 AI_USER_DAILY_LIMIT=40 npm start &
npm run test:integration    # 22 tests: RLS/privileges, API journeys, timetable enforcement, AI pipeline, lessons, 6 MB PDF upload
npm run test:browser        # Playwright journey with two browser profiles; screenshots in test-results/
```

`TEST_BASE_URL` points the integration and browser tests at another deployment. AI tests there need a server that uses the mock endpoint. Against a live Groq key, use the manual checks in [DEPLOYMENT.md](DEPLOYMENT.md#7-verify-the-public-url).

## Migrating from the SQLite demo

`npm run import:sqlite -- data/classpocket.sqlite [--teacher <uuid>] [--dry-run]` imports published gizmos (same IDs, so `?gizmo=` links keep working), topic-session assignments and classroom publications (same codes). Old guest identities were browser cookies, so they can't be proven to belong to anyone. Their reactions, comments, timetables and rooms are therefore not imported, and the script invents no logins. See the header of [scripts/import-sqlite.ts](scripts/import-sqlite.ts).

## Earlier documents

[SOCIAL_MVP.md](SOCIAL_MVP.md), [TIMED_FEED.md](TIMED_FEED.md), [PHYSICS_DEMO.md](PHYSICS_DEMO.md), [TOPIC_SESSIONS.md](TOPIC_SESSIONS.md), [LEARNING_DESIGN.md](LEARNING_DESIGN.md), [HACKATHON_HANDOFF.md](HACKATHON_HANDOFF.md) and [BUILD_PROMPT.md](BUILD_PROMPT.md) describe the earlier SQLite/tunnel demo. They are kept for history; where they disagree with this README, this README is current.
