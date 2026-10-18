# Study App Hackathon Plan (PWA, 2 days)

> **Status:** DRAFT for review. Items marked **[CONFIRM]** are assumptions I made and need a yes/no from the team.

---

## TL;DR (read this first, then tell us what's missing)

**What it is:** a mobile-first app (PWA) that turns your study notes into short video-style reels, then a game that quizzes you, then a rematch on the concepts you got wrong.

**Pitch hook:** *Doomscrolling is the problem, so we made the scroll productive.*

**The flow:**
1. Paste notes (PDF upload is a stretch goal)
2. AI generates a lesson: concepts, reels and questions (one big AI call)
3. Scroll through 10-15 second video-style reels that teach each concept
4. Pick a game: a free template or preset theme, or describe your own game (custom, limited to 3 prompts per session in the demo)
5. Play the game (boss battle first); answers are checked in our own code, with no AI cost
6. See your weak concepts, then play a rematch with different questions on just those concepts

**What makes it different:** the learn, play, find weaknesses, rematch loop, plus games you can customise by prompt.

**How custom games work:** the AI never writes game code. It picks and re-skins one of our own tested templates (theme, enemy, story, rules). This keeps it reliable, safe and cheap.

**Costs:** only two AI calls exist: the lesson (big, once per lesson) and the game config (tiny). Playing, rematches and presets are free.

**Build it:** React + TypeScript + Vite PWA, one serverless backend with 2 endpoints (`/api/generate`, `/api/game-config`), plain TypeScript game logic, no database, hosted on Vercel.

**Team:**
- **Person 1:** technical lead, app shell, game logic, integration, deploy
- **Person 2:** AI and backend: prompts, endpoints, validation
- **Person 3:** product, UX and visuals: reel look, sprites, results screen, game picker
- **Person 4:** pitch and demo, plus presets, sample notes, testing

**Must-have for the demo:** notes to lesson, reels, game picker (boss battle plus presets, plus custom re-skin), weak concepts, rematch, deployed link, offline fallback lesson.

**Nice-to-have:** second game template (true/false swipe), voiceover, PDF upload, animations and sound, parent summary screen.

**Not building (roadmap slide only):** Canvas / Classroom / eStudent integration, parental blocking, accounts and login, payments, real AI-generated video, AI-written game code, multiplayer.

**Biggest risks:** LLM slowness or failure during the demo (fallback lesson), wrong AI answer keys (hand-check the demo content), API costs (caps, caching, presets), scope creep.

**Still undecided:** hackathon deadlines, AI provider and billing, target audience (high school or university), demo subject, what "parental controls" should mean, and whether "custom" means themes and rules only.

### Checklist for the team: is anything missing?
- [ ] Is a feature you expected not listed above?
- [ ] Is anything in "Not building" something you think we must build?
- [ ] Does your role match what you can actually do?
- [ ] Is the demo story clear to you in one minute?
- [ ] Any risk we haven't mentioned?

---

## 1. The pitch

**One-liner:** Paste your notes, scroll through short video-style reels that teach the key ideas, fight a boss that quizzes you, then replay the concepts you got wrong.

**Hook for judges:** *Doomscrolling is the problem, so we made the scroll productive.* Same swipe format students can't put down, but every swipe teaches something, and the app adapts to what you got wrong.

**What makes it different from "AI flashcards":** the **learn, prove, find weaknesses, review, retry** loop. The rematch is the differentiator, so we protect it before any decoration.

**Platform:** mobile-first **PWA** (a website built for phone screens that can be added to the home screen). Demo on a phone via a link. No app store, no native build.

---

## 2. Scope

### MUST (the demo)
- Paste notes, press Generate
- AI returns structured session: concepts, reel cards, questions
- Vertical reel feed: short, auto-playing, video-style clips (about 10-15 seconds, one idea per reel) that you scroll through, rendered in the browser (see "Reel format" in section 6)
- Boss battle (multiple choice), with explanation after each answer
- Wrong answers recorded **by concept**
- Results screen showing weak concepts
- Rematch using **different question variants** of the missed concepts
- Deployed link plus a pre-generated fallback lesson if the API fails
- Game picker: free template (boss battle) plus 4-5 preset themes, and a custom prompt that re-skins the template (see section 3B)

### SHOULD (only after the full loop works)
- Second game template: rapid-fire true/false swipe
- Simple parent summary screen (sessions done, weak concepts) reading from the same results data (lowest priority; only if everything else works)
- PDF upload (text-based PDFs only; scanned PDFs need OCR, so not supported)
- Reel voiceover using the browser's built-in text-to-speech (captions work without it)
- Boss animations, sound, hit effects
- Parent study-goal bar and PIN
- Save progress in browser (localStorage)

### CUT (roadmap slide only, do not build)
- Canvas / Google Classroom / eStudent integration (separate auth per system, some have no public API, judges can't test it)
- Parental blocking of other apps (OS-level, not possible in a PWA)
- Accounts, login, database
- Multiplayer, leaderboards
- True AI-generated video files (slow, costly, unreliable; we build in-browser reels instead, see section 6)
- AI-written game code or fully free-form game mechanics (custom prompts only configure our templates, see section 3B)
- Payments (the free vs custom tier is a pitch line only)
- Scraping real reels (legally fragile, breaks easily)

**Parental controls:** meaning is undecided. Parked for later. If time allows, build only the "parent summary" view above. **[CONFIRM with teammates what they actually want]**

---

## 3. Architecture

```
Paste text (or PDF) -> Backend endpoint -> LLM -> Structured session
                                                        |
                    +-----------------+-----------------+----------------+
                    v                 v                                  v
               Reel cards      Game templates                    Results store
                               (boss, swipe T/F)                        |
                                                                        v
                                                          Weak concepts -> Rematch
                                                          Parent summary
```

**Key rules**
1. **One pipeline, many consumers.** The AI generates content once. Cards and games are just different ways to display it. A new game = a new component, not a pipeline change.
2. **The AI is not called during the battle.** The answer key and explanations come with the generated session. The browser checks answers and updates boss HP using normal code. This is faster, cheaper and easier to debug.
3. **API key stays on the server.** One serverless function calls the model. Never put the key in frontend code or a public repo.
4. **Mock data first.** The frontend is built against a hardcoded session so nobody waits on the AI.

### Tech stack
| Piece | Choice |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | CSS or Tailwind (mobile-first) |
| PWA | Web manifest + service worker (Vite PWA plugin) |
| Backend | One Node/TypeScript serverless function (`/api/generate`) |
| AI | One LLM API with structured-output support **[CONFIRM provider and billing]** |
| State | React state (`useState`/`useReducer`), optional localStorage |
| Hosting | Vercel or similar |
| Version control | One GitHub repo, branch per task, PRs into `main` |

**API warning:** a Claude Pro subscription does **not** include API credits. Confirm API access and billing (or hackathon-provided credits) in the first hour.

---

## 3A. Architecture breakdown by layer

Five layers. Each has one owner, one job, and one clear interface to the next.

```
 [1] FRONTEND (React PWA, in the phone's browser)
      screens, reel player, battle UI, game state
        |  POST /api/generate  (JSON)
        v
 [2] BACKEND (one serverless function)
      validate request, hold API key, call model, validate output
        |  prompt + schema
        v
 [3] AI LAYER (LLM API)
      notes in, structured study session out (once per lesson)
        |  StudySession JSON
        v
 [1] FRONTEND again
 [4] GAME LOGIC (pure TypeScript functions, no UI)
      answer checking, boss HP, weak concepts, rematch builder
 [5] STORAGE + HOSTING
      React state, localStorage, Vercel, GitHub
```

### Request flow, step by step

1. User pastes notes, taps **Generate**. Frontend phase becomes `generating`.
2. Frontend calls `POST /api/generate` with `{ notes, subject?, conceptCount }`.
3. Backend checks the input, calls the LLM with the prompt and schema.
4. Backend validates the model output. If invalid, it retries once, then returns an error.
5. Frontend receives a `StudySession`, stores it in state, and moves to `reels`.
6. User scrolls the reels, then taps **Fight the boss**. Phase becomes `battle`.
7. Each answer is checked **locally** (no network): boss HP updates, an `AnswerRecord` is saved.
8. Battle ends. Results screen calls `getWeakConcepts()`. User taps **Rematch**.
9. Rematch replays the weak concepts' reels, then asks **variant B** questions.
10. Final results. Records are available to the parent summary.

The only network call in the whole session is step 2.

---

### Layer 1: Frontend (React + TypeScript + Vite, as a PWA)

**Job:** everything the user sees and touches.

**Screens are a state machine, not a router.** There is one `phase` value and `App` renders the matching screen. No React Router needed.

```ts
type Phase =
  | "input" | "generating" | "reels" | "pickGame"
  | "battle" | "results" | "review" | "rematch" | "parent";

type AppState = {
  phase: Phase;
  session: StudySession | null;
  gameConfig: GameConfig;        // defaults to DEFAULT_CONFIG
  error: string | null;
  battle: { questionIndex: number; bossHp: number; answered: boolean };
  records: AnswerRecord[];
  weakConceptIds: string[];
};
```

Use one `useReducer` in a `useStudySession` hook. Actions:
`GENERATE_START`, `GENERATE_SUCCESS`, `GENERATE_ERROR`, `REELS_DONE`, `ANSWER`, `NEXT_QUESTION`, `BATTLE_END`, `START_REVIEW`, `RESET`.

**Components and what they receive**

| Component | Props | Notes |
|---|---|---|
| `NotesInput` | `onGenerate(notes)` | Text area, character counter, empty-input message |
| `LoadingScreen` | none | Rotating tips; LLM calls can take 10-30s |
| `ReelFeed` | `reels`, `onDone` | Scroll container; tracks active reel |
| `ReelPlayer` | `reel`, `active` | One reel's animation, captions, voiceover |
| `BossBattle` | `questions`, `onFinish` | Runs the question loop |
| `BossHealthBar` | `hp`, `max` | Animated bar |
| `QuestionCard` / `AnswerOption` | `question`, `onSelect` | Shows explanation after answering |
| `ResultsScreen` | `records`, `weakConceptIds`, `onRematch` | Score plus weak concepts |
| `ParentSummary` | `records` | Should-have |

**The reel player (the part that has to feel like video)**

- **Feed container:** `height: 100dvh; overflow-y: scroll; scroll-snap-type: y mandatory;` Each reel is `height: 100dvh; scroll-snap-align: start;`. Add `overscroll-behavior: contain` so pull-to-refresh doesn't fight the feed.
- **Active reel detection:** an `IntersectionObserver` (threshold about 0.6) marks which reel is on screen. Only the active reel plays; others pause and reset.
- **Timeline:** one hook, `useReelTimeline(durationSec, active)`, runs a `requestAnimationFrame` loop that outputs `progress` from 0 to 1. Everything keys off it:
  - 0% to 15%: hook text animates in
  - 15% to 80%: body words revealed one by one (word *i* appears when `progress > 0.15 + 0.65 * i / wordCount`)
  - 80% to 100%: takeaway highlighted
  - at 100%: loop
- **Duration:** compute it on the frontend from the word count (about 2.5 words per second, minimum 8s) rather than trusting the model's `durationSec`.
- **Background:** a CSS gradient animation or looping canvas per `theme`. Start with 3-4 themes.
- **Voiceover (should-have):** `window.speechSynthesis.speak(new SpeechSynthesisUtterance(narration))`. Cancel on reel change. Start audio only after the user's first tap (a "Tap to start" screen unlocks it). Include a mute toggle. Voices differ per device, so test on a real phone.
- **Last reel:** show a clear **Fight the boss** button.

**Battle UI:** damage number floats up, health bar animates, answer buttons lock after one choice, explanation slides in with a **Next** button. Wrong answer shows the boss healing.

**PWA setup (`vite-plugin-pwa`)**

- `manifest`: `name`, `short_name`, `display: "standalone"`, `theme_color`, `background_color`, `start_url: "/"`, icons at 192x192 and 512x512 (plus a maskable icon).
- Service worker: precache the app shell. **Never cache `/api/generate` responses.** Use `registerType: "autoUpdate"`.
- iOS extras: `apple-touch-icon`, `apple-mobile-web-app-capable` meta tag. On iPhone the user installs via Share, then Add to Home Screen. Android Chrome shows an install prompt.
- HTTPS is required for service workers (Vercel provides it).
- Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, and pad with `env(safe-area-inset-top/bottom)`.
- Touch targets at least 44px. Test in **installed** mode on a real phone early, not just in desktop dev tools.

**Frontend API client (`src/lib/api.ts`):** `generateSession(req): Promise<StudySession>` with a 45-second abort timeout. If `VITE_USE_MOCK=true`, return the bundled `mockSession` after a fake 1.5s delay.

**Security note:** render AI text as plain text. Do not use `dangerouslySetInnerHTML`.

---

### Layer 2: Backend (one serverless function)

**Job:** keep the API key private and make sure only valid data reaches the app.

**File:** `api/generate.ts` (Vercel auto-deploys files in `/api` as functions).

**Request**
```json
POST /api/generate
{ "notes": "string", "subject": "Biology", "conceptCount": 6 }
```

**Steps inside the function**
1. Allow `POST` only.
2. Validate input: `notes` is a string, at least ~100 characters, at most a cap (start around 6,000-8,000 characters; tune to cost and speed). `conceptCount` clamped to 3-8.
3. Read the key from `process.env.LLM_API_KEY` (server-side only).
4. Call the LLM (Layer 3).
5. Parse and validate the output with a **zod** schema plus custom checks (below).
6. If validation fails, retry once. If it fails again, return an error.
7. Return the `StudySession`.

**Custom validation checks (beyond the JSON shape)**
- Each concept has at least one reel and exactly one `A` and one `B` question
- Every `conceptId` in reels and questions exists in `concepts`
- Every question has exactly 4 options and a `correctIndex` from 0 to 3
- Options within a question are not duplicates
- Required strings are non-empty and under length limits (hook short, body about 30-60 words)

**Error responses** (the frontend maps these to messages)

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT` | Notes empty, too short or too long |
| 502 | `MODEL_FAILED` | Provider error |
| 502 | `INVALID_OUTPUT` | Output failed validation twice |
| 504 | `TIMEOUT` | Took too long |

All errors use `{ "error": { "code": "...", "message": "..." } }`. On any error the UI shows **Retry** and **Use sample lesson**.

**Things to check early**
- **Function timeout:** LLM calls can run 10-30 seconds. Check the hosting plan's maximum function duration and configure it, or generation will fail in production while working locally.
- **Abuse protection:** anyone with the URL can call your endpoint and spend your credits. Enforce the length cap, add a simple per-IP rate limit if time allows, and set a spending limit on the provider account.
- **Secrets:** the key goes in Vercel environment variables. Never prefix it with `VITE_` (those get bundled into the public frontend), and keep `.env.local` out of git.

---

### Layer 3: AI layer (LLM API)

**Job:** turn notes into one structured `StudySession`.

**One call per lesson.** The model returns concepts, reels and questions together. If one call is too slow or the output gets cut off, split into two parallel calls (reels and questions) that both receive the concept list from a first quick call. Don't start with the split; only move to it if needed.

**Output size for the MVP:** 6 concepts, 6 reels (one per concept), 12 questions (variants A and B for each concept).

**Prompt structure**
1. **Role and rules:** you are a study-content generator. Use **only facts found in the notes**. Do not add outside facts.
2. **Concepts:** extract exactly N key concepts, each with a unique snake_case `id`, a `name`, and a one-sentence `keyFact`.
3. **Reels:** one per concept. Hook of 10 words or fewer. Body of 30-50 words, one idea, plain language. Takeaway of one sentence. `narration` is written to be read aloud. Pick a `theme` from the allowed list.
4. **Questions:** for each concept, two different questions (variant `A` and `B`) testing the same idea in different ways. Test understanding, not just wording recall. Four options, one correct, plausible distractors, `correctIndex` 0-3, a 1-2 sentence explanation based on the notes.
5. **Output:** the exact schema; JSON only.

**Use the provider's structured-output or schema-constrained mode if available.** Otherwise instruct JSON-only output and rely on the backend validation.

**Model choice:** favour a fast model; latency matters more than maximum intelligence here. Run a few real tests and compare speed and question quality before locking in.

**Quality check (manual):** structural validation does not catch wrong facts. Before the demo, hand-check every reel and answer key for the demo lesson.

---

### Layer 4: Game logic (pure TypeScript, no React)

**Job:** all the rules, in plain functions that are easy to test.

**File:** `src/lib/gameLogic.ts` and `src/lib/reviewLogic.ts`

```ts
const BOSS_MAX_HP = 100;
const DAMAGE = 25;
const HEAL = 10;

applyAnswer(hp: number, q: Question, selectedIndex: number)
  : { hp: number; correct: boolean; delta: number }

getBattleStatus(hp: number, questionsLeft: number)
  : "won" | "lost" | "ongoing"

getWeakConcepts(records: AnswerRecord[], limit = 3): string[]
  // groups wrong answers by conceptId, ranks by mistake count

buildRematch(session: StudySession, weakIds: string[])
  : { reels: ReelCard[]; questions: Question[] }  // variant B only
```

**Battle:** the first battle uses variant **A** questions (6 questions). With 100 HP, 25 damage and 10 healing, the player needs at least 4 correct to win. Tune the numbers, then check that a typical decent attempt wins.

**Rematch:** replay the reels for the top weak concepts (up to 3), then ask each concept's variant **B** question.

**Edge cases to handle**
- Zero mistakes: skip the rematch and show a "mastered everything" summary
- Many mistakes: cap the rematch at 3-4 concepts so it stays short
- Questions run out with boss HP above 0: show a result and offer a retry, never a dead end

**Tests:** write quick **Vitest** unit tests for these four functions (Vitest comes naturally with Vite). They are small, cheap and protect the differentiator.

---

### Layer 5: Storage, hosting and tooling

**Storage (no database)**
- **React state:** current session and progress while the app is open.
- **localStorage (should-have):** `studyapp.session.v1` and `studyapp.records.v1`, wrapped in try/catch. This lets the parent summary read past results and survives a refresh. Never store secrets.

**Fallback lesson:** a hand-checked `sampleSession.json` **bundled into the app** (imported, not fetched), so it works even if the API and the network are down.

**Hosting (Vercel)**
- Connect the GitHub repo. Every push to `main` deploys; every pull request gets a **preview URL**. Open preview URLs on your phone for testing.
- Set `LLM_API_KEY` in the Vercel dashboard.
- Run frontend and API together locally with `vercel dev`.

**Dependencies (keep it small)**
`react`, `react-dom`, `typescript`, `vite`, `vite-plugin-pwa`, `zod`, `vitest`, the chosen LLM provider's SDK. Optional: `framer-motion` for battle animations. No Redux, no router, no database.

**Tooling:** ESLint and Prettier with default configs, so merges stay clean.

---

### Ownership and definition of done per layer

| Layer | Owner | Done when |
|---|---|---|
| 1. Frontend shell, state machine, screens | Person 1 | Full flow runs on mock data on a phone |
| 1. Reel player and visuals | Person 3 (design) with Person 1 (logic) | A reel feels like a video, with timed captions |
| 1. Notes input, results, parent screens | Person 4 and Person 3 | Screens match designs and work with mock data |
| 2. Backend endpoint | Person 2 | Returns a valid `StudySession` or a clean error |
| 3. Prompt and schema | Person 2 | Hand-checked output on 3+ different notes |
| 4. Game logic and tests | Person 1 | Unit tests pass; rematch picks the right concepts |
| 5. Hosting, PWA install, env vars | Person 1 | Installed PWA works on a real phone via the live URL |

### Build order (follow this exactly)

1. Repo, Vite project, types file, `mockSession` (everyone can start)
2. `App` with the phase state machine and placeholder screens
3. `ReelFeed` and `ReelPlayer` on mock data
4. Game logic functions plus tests
5. `BossBattle` wired to game logic
6. Results, weak concepts, rematch
7. Backend endpoint (built in parallel by Person 2 from step 1)
8. Connect frontend to the real endpoint, replacing the mock
9. PWA manifest and service worker, deploy, install on a phone
10. Polish, animations, voiceover, parent summary

---

## 3B. Game templates and custom games

### The idea

Users can play a game built from a **free template**, or **describe their own game** ("a pirate battle where wrong answers sink my ship"). We do **not** let the AI write game code. Templates are real, tested game engines that we build ourselves. A custom prompt just **configures and re-skins** a template: theme, enemy, story and rules.

Why: it is reliable (no AI-written code to break), cheap (one tiny AI call), safe (nothing the user types is ever executed), and it keeps the rematch loop working because every template reports results the same way.

### Free vs custom tiers

| | Free | Custom (premium on the roadmap) |
|---|---|---|
| Pick a template | Yes | Yes |
| Pick from preset themes | Yes (4-5 bundled presets, zero AI cost) | Yes |
| Describe your own game | No | Yes (re-skins a template via one small AI call) |
| Demo limit | n/a | 3 custom prompts per session (stands in for the paid tier) |

No payments are built. The pitch line is: *free templates for everyone, custom games as the paid feature.*

### Where the API cost comes from

| Action | AI call? | Relative cost |
|---|---|---|
| Generate lesson (notes in, reels and questions out) | Yes, large output | Highest, once per lesson |
| Pick a preset template or theme | No | Zero |
| Custom game prompt | Yes, very small output | Very small |
| Play the battle, rematch | No | Zero |
| AI-written game code (**not building this**) | Yes, huge, with retries | Highest and unreliable |

### Template interface

Every template is one React component with the same props. It receives questions and a config, and reports answers back.

```ts
type GameTemplateProps = {
  questions: Question[];
  config: GameConfig;
  onAnswer: (record: AnswerRecord) => void;
  onFinish: (result: "won" | "lost") => void;
};

const TEMPLATES: Record<TemplateId, React.ComponentType<GameTemplateProps>> = {
  boss_battle: BossBattle,
  swipe_tf: SwipeTrueFalse,   // stretch
};
```

Because every template emits `AnswerRecord`s, weak-concept detection and the rematch work for **any** template with no extra code. Adding a template means adding a component and one registry line.

**Templates**
1. **`boss_battle` (MUST):** multiple choice, health bar, damage and healing. Rules come from `config.rules`.
2. **`swipe_tf` (stretch):** rapid-fire swipe right for true, left for false. It needs no new data: show a question with **one** option, which the code picks as either the correct answer or a random wrong one. Uses lives and a streak counter.
3. **Matching pairs (roadmap):** match concept names to key facts, using fields we already have.

### Game config

```ts
type TemplateId = "boss_battle" | "swipe_tf";
type EnemyId = "dragon" | "robot" | "ghost" | "alien" | "pirate_ship" | "wizard";
type PaletteId = "neon" | "forest" | "ocean" | "sunset" | "mono";

type GameConfig = {
  templateId: TemplateId;
  title: string;          // e.g. "Kraken Cove"
  intro: string;          // 1-2 sentence story, max ~40 words
  enemy: EnemyId;         // picks a pre-made sprite
  enemyName: string;      // e.g. "The Kraken"
  palette: PaletteId;     // picks a CSS variable set
  rules: { maxHp: number; damage: number; heal: number; lives: number };
  winMessage: string;
  loseMessage: string;
};
```

**The model only chooses from fixed lists** (templates, enemies, palettes) and writes short text. All art is pre-made. The theme is applied with CSS variables.

**`sanitizeConfig(raw, questionCount)` runs on every config, AI or preset:**
- Unknown `templateId`, `enemy` or `palette` is replaced with the default
- `maxHp` clamped 60-150, `damage` 10-50, `heal` 0-20, `lives` 1-5
- Winnable check: `ceil(maxHp / damage)` must be no more than about two thirds of the question count, otherwise raise `damage` until it is
- Text fields trimmed to length limits
- Everything is rendered as plain text

**`DEFAULT_CONFIG`** is the classic boss battle (dragon, neon palette). It is used for the free tier, as the fallback when the AI call fails, and while building the battle before the picker exists.

**Presets:** 4-5 bundled `GameConfig` objects (for example "Dragon Keep", "Robot Factory", "Kraken Cove", "Ghost Mansion"), each with its own story and messages. Zero AI cost.

### New endpoint: `/api/game-config`

Separate from lesson generation, so users can re-prompt the game without regenerating the lesson.

```json
POST /api/game-config
{ "prompt": "pirate battle where wrong answers sink my ship",
  "questionCount": 6, "lessonTitle": "Cellular Respiration" }

200: GameConfig
```

- Input: `prompt` capped at about 200 characters. Notes are **not** sent, which keeps the call small and fast.
- Use a **small, fast model**, short max output, JSON only. Structured-output mode if available.
- Validate with zod, then `sanitizeConfig`. If it fails, return the default config with a flag so the UI can say "Couldn't customise, using the classic game."
- Same error format as `/api/generate`.
- Limits: 3 custom prompts per session (client counter) plus a simple per-IP limit on the server.

**Config prompt (outline):** You configure a quiz game from the user's description. Choose `templateId`, `enemy` and `palette` only from the allowed lists. Write a title, an intro of at most 40 words, an enemy name, and win and lose messages. Set rules inside the allowed ranges. If the request cannot be done with these templates, choose the closest match and keep the theme flavour. Keep everything school-appropriate. Never name copyrighted characters; use generic equivalents. Output JSON only.

### Cost controls (all cheap to build)

- **Cache lessons** by a hash of the notes, so identical notes never cost twice (even localStorage caching helps for demos)
- Cap notes length and generations per session and per IP
- Presets and templates cost nothing, so push people toward them
- Smaller, faster model for the config call
- Hard spending limit on the provider account
- **Pre-generate the demo lesson and a few demo configs**, so judging never depends on live calls

### Updated user flow

`input` then `generating` then `reels` then **`pick game`** then `battle` then `results` then `rematch`

The **GamePicker** screen shows the free templates and preset themes as tappable cards, plus a "Describe your own game" box with a counter (for example "2 of 3 left"). The rematch reuses the same config.

### Task split for this feature

| Person | Task |
|---|---|
| Person 1 | `GameTemplateProps`, template registry, `BossBattle` reading `GameConfig`, `sanitizeConfig` plus winnable check, unit tests, `DEFAULT_CONFIG` |
| Person 2 | `/api/game-config` endpoint, config prompt, validation, per-IP limit, lesson caching |
| Person 3 | 5-6 enemy sprites, 4-5 palettes as CSS variable sets, GamePicker screen design and build |
| Person 4 | Write the 4-5 preset configs (intros, enemy names, win and lose messages), choose 3 reliable custom prompts for the demo, test odd inputs, write the free-vs-custom pitch line |

### Where it fits in the build order (section 3A)

- **Step 5:** build `BossBattle` reading a `GameConfig` from `DEFAULT_CONFIG` from day one, so theming costs nothing later
- **After step 6:** presets and GamePicker (free tier complete)
- **After step 8:** `/api/game-config` and the custom prompt box
- **After step 10, only if time remains:** the second template (`swipe_tf`)

### Tests for this feature

- [ ] Nonsense, empty, very long and non-English prompts do not crash the picker
- [ ] "Ignore your instructions and..." style prompts produce a valid config or the default
- [ ] "Make me Minecraft" or other impossible requests map to the closest template
- [ ] Out-of-range rules get clamped; every config is winnable
- [ ] Config endpoint down: the default game still loads
- [ ] Custom counter stops at 3 and cannot be bypassed by refreshing in the demo
- [ ] Every template reports `AnswerRecord`s, so the rematch works in each

---

## 4. Shared data contract

Everyone codes against this. **Do not change fields without telling the team.**

```ts
type Concept = {
  id: string;            // e.g. "glycolysis_location"
  name: string;
  keyFact: string;
};

type ReelCard = {
  id: string;
  conceptId: string;
  type: "hook" | "explain" | "example" | "recap";
  hook: string;          // short attention-grabbing headline
  body: string;          // ~30-60 words, one idea (shown as timed captions)
  takeaway: string;      // the thing to remember (highlighted at the end)
  narration: string;     // script read aloud by text-to-speech (can match body)
  theme: string;         // picks a visual template/background, e.g. "lab", "space"
  durationSec: number;   // roughly 10-15
};

type Question = {
  id: string;
  conceptId: string;     // links to concept, card and review
  variant: "A" | "B";    // A = first battle, B = rematch
  difficulty: 1 | 2 | 3;
  question: string;
  options: string[];     // 4 options
  correctIndex: number;
  explanation: string;
};

type StudySession = {
  title: string;
  concepts: Concept[];
  cards: ReelCard[];
  questions: Question[]; // 2 variants per concept
};

type AnswerRecord = {
  questionId: string;
  conceptId: string;
  selectedIndex: number;
  correct: boolean;
  timestamp: number;
};
```

**Why `conceptId` matters:** it links every card and question to one idea, so a wrong answer can be traced back to the exact lesson to review. Without it the "adaptive" part is guesswork.

**Why two variants (A and B):** if the rematch reuses the same questions, students just remember the answers. Variant B tests the same concept with a different question.

---

## 5. Game rules (tunable)

- Boss starts at 100 HP
- Correct answer: 25 damage
- Wrong answer: heals boss 10 HP (capped at 100)
- Explanation shown immediately after each answer
- One answer per question (no resubmitting)
- Battle ends when boss HP reaches 0 or questions run out; show a result either way, never an unwinnable dead end
- Tone stays encouraging: mistakes guide the next round, they don't punish

**Rematch logic**
1. Group wrong answers by `conceptId`
2. Rank concepts by number of mistakes
3. For the top weak concepts, show the related card again, then ask the **variant B** question
4. Concepts answered correctly are not marked weak

Game rules live in plain TypeScript functions (`gameLogic.ts`, `reviewLogic.ts`), not inside UI components, so they are easy to test.

---

## 6. Screens

1. **Notes input**: text area, Generate button, (stretch: PDF upload)
2. **Loading**: LLM calls can take 10-30 seconds, so this needs to look good
3. **Reel feed**: vertical full-screen video-style reels, auto-play when in view, scroll or swipe up for the next, progress indicator
4. **Boss battle**: boss, HP bar, question, four answers, explanation, damage animation
5. **Results**: score, weak concepts, rematch button
6. **Review and rematch**: weak concept card, then variant B questions
7. **Parent summary** (should-have): sessions, weak concepts, goal bar

**Mobile details to remember:** big touch targets, safe areas (notch and home bar), swipe gestures, sound only plays after a user tap on mobile browsers.

---

### Reel format (video-style, built in the browser)

Each reel is a full-screen vertical clip of about 10-15 seconds that auto-plays when it scrolls into view and loops. It is **assembled from layers in the browser, not rendered as a video file**:

1. **Background:** looping animated visual (CSS/canvas animation, or a short looping clip from a free library or our own assets), chosen by the reel's `theme`
2. **Hook text:** animates in at the start
3. **Captions:** the body appears word by word, timed to the duration
4. **Takeaway:** highlighted in the last few seconds
5. **Voiceover (should-have):** the browser's built-in text-to-speech reads `narration`. Free, no extra API. Mobile browsers only allow sound after the user's first tap, and captions must work with sound off.

The pipeline is unchanged: the LLM returns text, and the frontend turns it into reels using a small set of templates.

**Why not real AI-generated video:** it takes minutes per clip, costs money per clip, can't be fact-checked before the judge sees it, and one failed generation breaks the demo. It goes on the roadmap slide.

**Optional for the pitch:** hand-make one or two polished hero reels with real footage or motion graphics for the demo lesson, and use the in-browser format for everything generated live.

**Reel test:** can someone get the point in 10-15 seconds without reading a paragraph?

---

## 7. Who does what

> Roles are based on what I understood of each person's strengths. **[CONFIRM each person agrees and has the skills.]** Every person owns something shippable, not just research.

### Person 1: Technical lead and integration 
**Owns:** repo setup, architecture, shared types, app structure and screen flow, game state, boss logic, rematch logic, connecting frontend to backend, deployment.
**Deliverable:** working app from pasted notes to battle to rematch.
**Watch out:** don't write every feature yourself. Hand out self-contained components and protect your time for integration.

### Person 2: AI and content pipeline
**Owns:** prompt and schema design, `/api/generate` serverless function, secure API calls, JSON validation (right option count, valid `correctIndex`, valid `conceptId`, both variants present), timeout and error handling, a hand-checked fallback lesson.
**Deliverable:** an endpoint that takes notes and returns a valid `StudySession`, plus the small `/api/game-config` endpoint for custom games (section 3B).
**Also:** confirm API provider and billing in the first hour. Hand-check the demo content: valid JSON can still contain wrong facts.

### Person 3: Product, UX and visual design
**Owns:** audience and demo subject choice, screen mockups, visual style and assets (boss art, looping reel backgrounds, caption style, 3-4 reel templates), the parent summary design, testing the user journey on a real phone.
**Implementable task:** build the **Results screen** and the **GamePicker screen**, and make the enemy sprites and palettes (section 3B). The Parent summary screen is only if time remains.
**Deliverable:** clear designs plus those two screens working.

### Person 4: Pitch and demo lead
**Owns:** pitch story and slides, demo script, tracking the judging criteria, roadmap slide (Canvas/Classroom, parental controls, accounts), rehearsal and timing, fallback demo plan.
**Implementable task:** write the **demo subject notes** (sample content), build the **Notes input screen**, and run testing sessions.
**Deliverable:** a rehearsed 2-3 minute pitch backed by a working product.
**Start early:** the pitch should shape the product, not be written at the end.

### Everyone
Understands the full user journey and tests the app. Anyone should be able to run the demo if someone is missing.

---

## 8. Schedule

**Time anchors need real clock times. [CONFIRM hackathon start, end, and submission deadline.]** Fill these in, then work backwards.

| Block | Goal | Milestone |
|---|---|---|
| **Now to +2h** (Sat afternoon) | Align and set up: confirm API and billing, create repo, commit types, pick demo subject, assign owners | Project runs locally, types committed, mock session loads |
| **+2h to Sat night** | Build in parallel: P1 app shell and game logic, P2 prompt and endpoint, P3 designs and assets, P4 sample notes and pitch outline | Screens work with mock data, endpoint works standalone |
| **Sat night** | Connect everything, get first deploy | **Full playable loop, even if ugly** |
| **Sun morning** | Rematch and review loop, loading and error states, fallback lesson | Learn, battle, review, rematch works reliably |
| **Sun midday** | Polish: styling, mobile responsiveness, key animations, test on phones | App feels coherent |
| **Sun afternoon** | **Feature freeze.** Test deployed link on fresh browser and phone, check API key isn't exposed, test API-failure fallback | Stable deployed build |
| **Final hours before deadline** | Rehearse pitch multiple times, fix only high-impact bugs, verify live link and demo data | Confident demo, nothing risky |

**Non-negotiable rule:** have a playable end-to-end version by Saturday night. If the AI integration is late, ship with mock data and connect the model afterwards. One external API must never block the whole team.

---

## 9. Working together

- **One repo**, not four
- `main` always works; each person uses a branch and merges via pull request
- Agree on file ownership to avoid conflicts (e.g. P1: `App.tsx`, `lib/`; P2: `api/`; P3: Results and Parent components; P4: NotesInput)
- No big refactors after feature freeze
- Short check-ins at each milestone (10 minutes)

**Suggested layout**
```
study-app/
├── src/
│   ├── components/  (NotesInput, ReelFeed, ReelCard, BossBattle, ResultsScreen, ParentSummary)
│   ├── lib/         (gameLogic.ts, reviewLogic.ts, mockSession.ts)
│   ├── types/       (study.ts)
│   ├── App.tsx
│   └── main.tsx
├── api/generate.ts
├── public/          (manifest, icons, assets)
└── README.md
```

---

## 10. Risks and fallbacks

| Risk | Fallback |
|---|---|
| LLM is slow or down during the demo | Pre-generated, hand-checked session loaded from file |
| AI produces wrong answer keys | Hand-check demo content; consider a "regenerate" button |
| Invalid or incomplete JSON | Validate on the server; return a clear error; show a retry button |
| API key or billing not sorted | Decide in the first hour; use mock data until resolved |
| PWA quirks on iPhone (vibration, install) | Test early on real phones; don't depend on those features |
| Reels feel like slideshows, not videos | Invest in motion: animated text, moving backgrounds, timed captions; test on a real phone |
| Text-to-speech sounds robotic or is blocked on mobile | Captions carry the content; voiceover is optional; start audio after the first tap |
| Custom prompts produce odd, unsafe or unplayable configs | AI only picks from fixed lists; `sanitizeConfig` clamps everything and checks the game is winnable; default config as fallback |
| API costs from custom prompts and repeated lessons | Presets cost nothing; 3 custom prompts per session; cache lessons; small model for config; spending limit on the provider account |
| Scope creep (Canvas, parental controls, extra games) | Anything not in MUST waits until the loop works |
| Team member unavailable | Everyone understands the full journey; shared repo and docs |

---

## 11. Testing checklist

**Generation:** empty notes rejected; very long notes handled; loading state shown; invalid output gives a recoverable error; API failure doesn't leave the UI stuck.
**Reels:** no text overflow on small screens; navigation consistent; progress visible; last card leads into the battle.
**Battle:** correct and wrong answers apply the right HP change; no double-submitting; explanations correct; sensible end states.
**Review:** every question has a valid `conceptId`; wrong answers land on the right concept; correct concepts aren't marked weak; rematch uses variant B.
**Deploy:** link works on a fresh browser and a real phone; API key not in browser code; fallback lesson works offline from the API.
**Pitch:** full run-through done at least twice, timed.

---

## 12. Open decisions

1. Hackathon start, end and submission times
2. AI provider, API access and billing
3. Target audience: high school or university
4. Demo subject (pick one that judges will recognise)
5. What "parental controls" should mean (visibility, goals, or blocking)
6. Confirm roles with each teammate
7. Confirm the team is happy with in-browser video-style reels rather than real video files
8. Confirm "custom games" means custom themes and rules on our templates, not new game mechanics
9. Decide the custom-prompt limit for the demo (plan assumes 3 per session) and who the custom feature is for (students, teachers, or both)

## 13. Roadmap slide (for the pitch, not for building)

- Connect to Canvas, Google Classroom and school systems
- Parent accounts with visibility, goals and reports
- More game templates (matching, build and defend)
- Accounts and cross-device progress
- Smarter adaptive scheduling (spaced repetition)
- Real AI-generated video reels with realistic voiceover
- Paid custom games and teacher tools (free templates, premium custom)
- More templates (matching, build and defend) and fully free-form AI-generated mechanics