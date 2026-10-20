# Claude Studio: setup and operating notes

ClassPocket Studio can now generate custom interactive browser programs with Claude Sonnet. This is separate from the original bounded Groq configuration flow. The API key and Supabase credentials are required before real generation and persistence can work. A successful build does not prove either account is configured.

## 1. Anthropic account

1. An adult operator creates a Claude developer account at https://platform.claude.com/ and enables API billing/credits for the appropriate workspace. A Claude chat subscription is not the credential the app uses.
2. Create an API key in that workspace. Store it in a password manager and the server environment; do not paste it into chat, GitHub, source code, or a browser-exposed variable.
3. Check that the workspace can access `claude-sonnet-5-5`. The model is configurable with `ANTHROPIC_MODEL`; the app does not silently switch to another provider if access fails.
4. Configure the workspace's available spend limits/alerts in the Claude Console. Initially use a small controlled pilot budget. App quotas limit jobs, not an exact dollar amount.

Official references checked 21 October 2026:

- Model IDs: https://platform.claude.com/docs/en/models/overview
- Messages API and authentication: https://platform.claude.com/docs/en/api/messages/create
- Structured output: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Pricing: https://platform.claude.com/docs/en/about-claude/pricing

## 2. Server environment

For local use, copy `.env.example` to `.env.local` and fill in the secrets locally. For the public app, add these individually in **Vercel → project → Settings → Environment Variables**, then redeploy. Environment changes do not activate on an already-built deployment.

```dotenv
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-real-key-goes-in-the-server-settings-only
ANTHROPIC_MODEL=claude-sonnet-5-5
AI_ENABLED=true

# Conservative pilot limits: UTC calendar days, enforced atomically by Postgres.
AI_USER_DAILY_LIMIT=5
AI_GUEST_DAILY_LIMIT=2
AI_GLOBAL_DAILY_LIMIT=20
AI_MAX_PROMPT_CHARS=600
AI_MAX_OUTPUT_TOKENS=10000
AI_TIMEOUT_MS=70000
```

`ANTHROPIC_API_KEY` must NEVER be named `NEXT_PUBLIC_ANTHROPIC_API_KEY`. API requests originate from the Node server via `lib/ai/provider.ts`, not from the browser. No extra Anthropic npm package is necessary; the adapter uses the documented HTTPS Messages API.

Each job allows one generation and at most one validation/syntax repair. The output-token cap includes model reasoning. A later user-requested edit or runtime repair is a new quota-counted job. Failed jobs still consume their reserved quota; calls that fail before generation may still be recorded conservatively. Rate limits, timeouts and incomplete answers preserve the previous saved draft. The code does not claim to refund API charges or unused quotas.

Set Production and Preview independently. Keep AI disabled in previews unless testing it deliberately. Do not reuse production user data for public test fixtures.

## 3. Supabase is required too

The AI key alone is not enough. Studio uses authenticated Supabase guest/account identities, draft ownership, version history, private snapshots and durable quota records. Set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-server-secret-key
APP_URL=https://classpocket.vercel.app
```

Follow [DEPLOYMENT.md](DEPLOYMENT.md) §1 to create/link the database, apply all checked-in migrations, enable anonymous sign-ins, configure authentication redirects and seed the included catalogue. No new SQL migration is needed for custom programs: definitions are versioned JSON and already allow server-validated engine names. Provider attribution is now explicitly recorded on the generation row.

The Supabase secret is server-only. The publishable key is intended for the browser and relies on the existing row-level-security policies. Never replace it with the server secret.

## 4. Vercel

- Build/install remain `npm run build` / `npm ci`; Node.js 22 is the repository target.
- `/api/studio` declares `maxDuration = 180`. Enable Fluid Compute and ensure your project permits this duration. Each provider attempt is capped at 70 seconds by default and the repair loop is capped at two attempts total.
- Duration reference: https://vercel.com/docs/functions/configuring-functions/duration
- Deploy this branch/commit before expecting the Studio integration on the public URL. Vercel must be linked to the correct repository/branch.
- Open `/api/health`: `backend:true`, `database:"ok"` and `ai:true` are the configuration checks, not proof of model quality.
- Open `/api/studio`: `ai.provider` should be `Claude`, `ai.model` should match your configured model, and `ai.custom` should be true. This endpoint never returns keys.

## 5. Try the actual flow

1. Open `/studio`, or open Studio from Home and choose **Open Claude Studio**.
2. Describe something specific, such as “A fraction pizza where dragging slices changes the fraction” or “A French word garden where matching a word to its picture grows a plant; draw the pictures yourself.”
3. Select **Create with AI**. The server screens the prompt, reserves quota, calls Claude, validates the program and syntax, and saves a private draft version. The preview then runs in an isolated frame.
4. Play the gizmo. Ask for a behavioural change, then select **Change it with AI**. It saves a new version of your own project. Save manual settings first if you changed them.
5. If the preview reports a runtime error, **Repair gizmo with Claude** sends the bounded error text and current project back to Claude as a new job. Automatic checks are syntax/source checks, not a proof that the simulation is correct or the learning outcome is achieved.
6. **Share saved version** makes an immutable private snapshot link/QR. Open it in another browser profile and remix into an independently owned project. Publish separately to put a saved version into the social feed.

An active timetable supplies the subject to the generation prompt; otherwise Claude chooses the appropriate supported school subject. The final subject label is enforced when a class is active, but an automated relevance classifier/human review is not implemented.

## 6. Boundaries and school use

- Custom gizmos can use offline DOM, Canvas, inline drawings and user-initiated sound. Images/video generation, third-party packages/APIs, external assets, cameras, microphones, accounts inside a gizmo and synchronised multiplayer are not supported.
- Generated code is never executed in Node. JavaScript is compiled for syntax only. It is rendered only in an iframe with `sandbox="allow-scripts"`, without `allow-same-origin`, forms, popups or top-navigation permission. CSP blocks fetch/resource connections, workers and embedded frames. Parent listeners validate the frame source, opaque origin and per-frame channel.
- Source checks are additional restrictions, not a complete JavaScript security analysis. Hostile code may still monopolise browser CPU/memory. The Stop button and startup deadline are best-effort controls; they cannot reliably interrupt a synchronous infinite loop that freezes a renderer. Before unrestricted public creation, isolate custom content on a dedicated origin, apply runtime/resource controls and obtain independent security testing.
- Source/prompt screening is conservative pattern matching, not comprehensive content moderation. AI work remains labelled unreviewed. Classroom accuracy, age assurance, guardian/school onboarding and complete moderation require additional work before a student launch.
- Review Anthropic's current requirements for products serving minors: https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors . An adult developer key does not itself satisfy those requirements.
- Existing Groq templates remain available with `AI_PROVIDER=groq` and `GROQ_API_KEY`. Groq cannot edit custom-code drafts through this integration. The original PDF/classroom AI tool remains Groq-only and checks its own key, so selecting Claude for Studio does not misroute that tool's API calls.

## 7. Verification

- Unit checks: `npm test` (includes custom schema, source restrictions, script-breakout escaping, subject handling and context minimisation).
- Provider and persistence contracts: `npm run test:claude` (simulated Claude and Supabase transports; no paid calls; includes bounded repair, refusals, quotas, stale/foreign edits and failed-draft preservation).
- UI/browser checks: start a production build on port 3010, then `npm run test:claude:browser` (simulated APIs; two profiles, actual browser execution of generated code, editing, runtime repair, sharing/remixing and sandbox checks).
- `npm run typecheck` and `npm run build` require no API key.
- A real Claude call and real hosted Supabase write still need the operator's credentials. No paid provider or live database has been used by these tests.
