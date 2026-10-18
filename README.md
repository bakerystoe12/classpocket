# ClassPocket

**Current demo:** twenty varied interactive prompts, the five curated Studio media tools, Friends invitation rooms, and a timetable-controlled feed. See [TIMED_FEED.md](TIMED_FEED.md) for the current three-minute journey, public-link setup and implementation limits. Older topic-session and educational-reel notes below describe retained secondary workflows.


## Educational reels revision

The default Home feed is ten authored physics experiments: absurd hooks, force/distance controls, a prediction before the reveal, calculated consequences, causal feedback, and later recall/transfer. Chemistry has a separate ten-play atomic-charge session. Use PHYS02 and CHEM02; existing published classes remain unchanged. See [LEARNING_DESIGN.md](LEARNING_DESIGN.md) for exact scope and research references. Uploaded notes still use source-matching drafts, not automatically generated simulations.


The running app is implemented in this branch. The team's original planning document is preserved unchanged in [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md); it describes proposals, not the implemented feature status. See [HACKATHON_HANDOFF.md](HACKATHON_HANDOFF.md) for the current scope.

**New: focused topic sessions.** Open `/study` for the student topic feed or `/study/create` to upload/paste notes, review ten mission gizmos, and assign a class. Students finish the required ten or explicitly add same-topic practice. Read [TOPIC_SESSIONS.md](TOPIC_SESSIONS.md) and [HACKATHON_HANDOFF.md](HACKATHON_HANDOFF.md).

**The primary app has been rebuilt as a social feed of ten playable gizmos.** Open `/` for Home, Studio, Activity, and Profile. Read [SOCIAL_MVP.md](SOCIAL_MVP.md) for the current product and verification details, and [the exact build prompt](BUILD_PROMPT.md) for a reusable specification. No teacher login is required for the social app.

The classroom documentation below describes the earlier educational workflow, now available at `/classroom`.

A working classroom hackathon demo: **Turn your slides into a lesson students can play.**

## Run

Requires Node.js 24 (uses built-in `node:sqlite`) and npm.

```powershell
git clone --branch classpocket-mvp https://github.com/rudecoder-web/SYM-AI.git
cd SYM-AI
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On macOS/Linux use `cp .env.example .env.local` instead of `Copy-Item`. For a production build, use `npm run build`, then `npm start`. Webpack is selected explicitly for reliable builds on the development host.

The Git repository excludes `.env.local`. For the same teacher login used in the demo and automated journeys, set `TEACHER_PASSWORD=classpocket-demo` in your local copy before starting. This is clearly labelled demo teacher access. Use a different password outside a trusted demonstration. If that variable is blank or absent, the server generates a password, prints it on first use, and stores it in `data/teacher-password.txt`. No model key is needed for the social app or topic sessions.

## Teacher → student walkthrough

1. Sign in and choose **Open sample lesson**. The included original lesson has six activities and six source pages.
2. Play the preview. Edit wording, objectives, difficulty, parameters, category answers, or order. Save changes; use **Versions** to restore a previous draft.
3. Try “Make this easier” (adds a hint) or “Change the target moment to 12 Nm” on a balance activity. These are explicitly local rule-based edits and save a new version. Arbitrary prompt edits require AI configuration.
4. Choose **Publish**, confirm the review checkbox, and copy the student link or class code. Publication captures an immutable snapshot; edits to the draft do not alter that class.
5. Open the student link in a different browser, private window, or phone. Enter a nickname. For phone access use `http://<computer-LAN-IP>:3000/play/<code>`; a phone’s `localhost` points to the phone. Devices must share a network and the computer must permit port 3000. The server binds to `0.0.0.0`; firewall configuration is not changed automatically.
6. Complete the activities using the visible controls. The sliders support touch, mouse, keyboard, and weight dragging. Category matching uses tap/select buttons. A vertical swipe outside controls changes activities; previous/next are always available. Progress and attempts reload from the server.
7. Open **Results** in the teacher studio. It refreshes every five seconds and displays actual joins, completions, first-attempt correctness, repeated errors, and individual answers/timestamps. No example students or invented statistics are seeded.

Correct sample answers: clockwise; 2 N × the selected distance (e.g. 3 m → 6 Nm); units Force/Distance/Moment in order; Anticlockwise/Clockwise/Anticlockwise; right weight at 2 m with “Balanced”; right weight at 2 m with “Balanced”. Beam balance tolerance is 0.05 Nm. Forces act perpendicularly, pivot is fixed and frictionless, and the beam’s own weight is ignored.

## Content and AI

PDF uploads are genuinely parsed on the server using pdf-parse, preserving page numbers. Text-only PDF extraction does not OCR scanned slides. Empty/scanned, malformed, encrypted, oversized, and unsupported files receive specific fallback guidance. Pasted text supports a line of `---` as a page separator. Source-only drafts remain saved even without AI. You can add template activities and manually edit them; templates need teacher review against the source.

To enable server-side OpenAI generation, create/update `.env.local` and restart:

```dotenv
TEACHER_PASSWORD=choose-your-password
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_APP_NAME=ClassPocket
```

The model is configurable. Generation uses the Responses API with structured output, followed by Zod and semantic validation. Invalid source references, duplicate IDs, unsupported categories, and unreachable balance targets are rejected. Material is treated as source data, never application instructions. Single-activity AI edits preserve unrelated activities. Generation failures do not overwrite the saved draft. A teacher must review scientific validity and source support before publishing; schema validation cannot establish factual correctness.

No valid API key was available during implementation. The missing-key path was verified, and an isolated server with an intentionally invalid test key verified that a real upstream failure preserves the draft and version. Successful generation/editing has not been verified against a live model. No canned content is presented as generated from uploads. The sample, manual editing, versioning, and two local prompt commands work without AI.

API design references: [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [pdf-parse](https://github.com/mehmet-kozan/pdf-parse).

## Persistence and boundaries

- SQLite at `data/classpocket.sqlite`, WAL enabled. `DATA_DIR` can select a persistent directory. Teacher and student sessions share server state; localStorage is not used as the database.
- Requires one long-running Node host with a writable persistent disk. Ephemeral/serverless filesystems and multiple replicated instances are not supported by this SQLite setup. Back up the database with SQLite's backup facilities; do not copy a live database without its WAL.
- Teacher and student cookies are separate, HTTP-only, SameSite=Lax, with role checks on every operation. Teacher sessions expire after a day; student sessions after seven days. Class codes never grant editing privileges. HTTPS enables secure cookies; use HTTPS for an internet deployment.
- This is a demo with one shared teacher workspace, not multi-tenant production authentication. There is no automatic LAN or public hosting deployment.
- No Supabase credentials were available, so the demo uses SQLite. PPTX, OCR, native apps, external classroom integrations, arbitrary generated JavaScript, payments, multiplayer, audio, and full LMS features are deferred. Mute is unnecessary because there is no audio.
- Sort activities use accessible category matching; numbered categories can represent a sequence. Freeform spatial reorder games are deferred.
- Change the name through `NEXT_PUBLIC_APP_NAME` and update metadata in `app/layout.tsx` as needed. The original sample attribution lives in `lib/sample.ts`.

## Verification

```powershell
npm test
# With the app running and the matching teacher password:
$env:TEACHER_PASSWORD='classpocket-demo'
npm run test:e2e
npm run test:browser
```

`test:browser` uses installed Microsoft Edge through Playwright. Install Edge or change the channel in `tests/browser.ts` if needed. Tests create clearly named verification data in the running database. Run them against a separate `DATA_DIR` for future checks if preserving classroom records.

Verified on this Windows host:

- Production build and TypeScript checks pass.
- Five focused tests cover calculations, all six sample answers, balance prediction rules, sorting feedback, and schema validation.
- API journey covers edit/restore, stale-save protection, review gate, publishing, snapshot isolation, anonymous/student permission denial, first and later attempts, completion, teacher results, remix attribution, missing AI, pasted pages, real PDF extraction, and scanned/malformed PDF failures.
- Headless Edge journey uses independent teacher and 390 × 844 mobile browser sessions: UI edit/restore, both local prompt commands with automatic version saving, publish/join, all six activities, keyboard slider alternatives, backward progress, completion after reload, results, no horizontal overflow, and no browser page errors.
- An isolated invalid-key request returned the intended generation error and preserved the working draft. Successful live-model output remains unverified without credentials.
- Screenshots were inspected for dashboard and mobile balance layout. No physical phone or external network was available; phone behavior was emulated.

The verification screenshots in `test-results/` contain explicitly named test students and real test attempts; these are not seeded classroom results.
