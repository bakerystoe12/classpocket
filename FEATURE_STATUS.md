# Feature status

Legend: **Implemented** = working code backed by Supabase and covered by automated tests against a local Supabase stack · **Authored/demo** = hand-made content shipped in the repo · **AI-generated** = produced at runtime by the configured model · **Mocked in tests** = verified only against the mock provider · **Not yet verified** = needs real accounts · **Future** = not built.

## Verification summary (this branch)

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` (unit) | 38/38 pass: formulas, energy conservation, decay statistics with a seeded RNG, schema and semantics, timetable boundaries, midnight and DST, AI output conversion, screening |
| `npm run build` with no environment at all | pass: the build contacts no database |
| `npm run test:integration` | 22/22 pass against local Supabase (Postgres 17, GoTrue, PostgREST, Storage via `supabase start`) and the **mock** Groq server |
| `npm run test:browser` | pass: Chromium with two independent profiles (390×844) plus desktop 1280×800, no page errors, no horizontal overflow |
| Live Groq call | **Not yet verified**: no key was available. The missing-key path is verified. |
| Vercel deployment | **Not yet verified**: no Vercel or Supabase account was available. See DEPLOYMENT.md §7 for the exact checks. |

## Product features

| Area | Status | Notes |
| --- | --- | --- |
| Twenty Physics gizmos (distinct interaction families) | Implemented · Authored/demo | Each has a hook, concept, experiment, feedback and model assumptions. Formulas live in `lib/physics-demo.ts` with tests. All parameters (gravity, thrust, force, mass, efficiency, input power, nuclei count…) come from the definition. |
| Planet Hop (21st engine for character + gravity ideas) | Implemented | Procedural cat, robot, astronaut, goblin and frog. Planet gravity table; spring pad (½kx²); reachable goal ledge. |
| Versioned gizmo schema (v2) | Implemented | Discriminated by engine with strict parameter ranges and units. Semantic checks cover reachable goals, thrust > gravity and planet gravity. The v1 → v2 upgrade is tested. |
| Social feed, likes, saves, reposts, comments, follows, search, profiles, direct links | Implemented | Unique and idempotent reactions with trigger-maintained counts. Keyset pagination. Persona handles are reserved. |
| Capture | Implemented | Downloads a PNG rendered from the live canvas or SVG. |
| Studio: manual and template route | Implemented | Every engine parameter, player controls, objects, character, planet and accent. Versions, restore and optimistic concurrency. |
| Studio: AI Describe → Play → Change → Publish | Implemented · AI-generated · Mocked in tests | Groq strict JSON schema, then Zod and semantic validation, one bounded repair, durable quotas, request-ID idempotency, screening, minimal prompt data, provenance stored. Failed generations leave the draft untouched. Unsupported requests are listed rather than claimed. **Live model quality not yet verified.** |
| Studio: Ideas | Implemented (AI when configured) · Authored samples | AI suggestions are labelled. Curated samples stay available. |
| Studio: Images, Sounds, Make Image, Videos | Authored/demo | Original SVG, WAV and WebM samples, labelled as samples. No image or video generation provider is configured, and Groq text models don't generate media. |
| AI publication labels | Implemented | Published AI posts show "AI draft · not teacher-reviewed". A teacher review action for social posts is Future. |
| Schedule welcome dialog | Implemented | Gates feed mounting, traps focus, background inert, Escape enters. Honest free-time and unsupported-subject states. |
| Timetables | Implemented | Validation for overlaps, end after start, unique IDs and IANA zones. Inclusive start, exclusive end. Midnight and DST semantics are documented in `lib/rhythm.ts`. |
| Server-enforced class feed | Implemented | `/api/feed` uses the server clock and the saved (or teacher-managed) timetable. For you, Following, Learn and search are all restricted. The judge preview can only narrow. Direct links stay open (not an access firewall). |
| Teacher-managed timetables and enrolment codes | Implemented | Students cannot edit, replace or unlink through the UI, the REST API or RPC. Only the publishing teacher can release them. |
| Teacher accounts | Implemented | Supabase email/password with the role granted by the `npm run admin:teacher` script. Anonymous identities can never hold roles. |
| Friends invite rooms | Implemented | Immutable snapshot, persisted membership, private membership lists. Controls are per participant: **not** synchronised multiplayer. |
| Topic sessions `/study` | Implemented | Ten required missions graded on the server; optional same-topic practice after completion; immutable assignments; teacher results from real attempt records. Students don't receive full source pages. |
| PDF upload | Implemented | Signed direct-to-storage upload (up to 10 MB, tested with a 6 MB file), page-preserving extraction, then the file is deleted. No OCR: scanned PDFs get a paste-text message. |
| Classroom `/classroom`, `/play` | Implemented | Ported to Supabase and teacher accounts. AI lesson generation uses Groq best-effort JSON with Zod validation (**live model not yet verified**). |
| SQLite migration | Implemented | `npm run import:sqlite` keeps gizmo IDs and class codes. Guest-cookie data is not imported (identity cannot be proven). |
| Account deletion | Implemented | Profile settings → delete everything (cascades). |
| Reporting posts | Implemented (storage only) | In-app moderation review is Future. |
| Guardian / parent relationships | Future | |
| Synchronised multiplayer | Future | |
| Arbitrary AI code, mechanics, images or video | Future | Would need a separate sandboxed project. |
| CAPTCHA on guest creation | Future | DEPLOYMENT.md §1 explains the change needed. |
| Measured learning or attention outcomes | Not claimed | |
