# ClassPocket social-play MVP

**Current Physics demo:** all twenty catalogue gizmos now teach Physics through their existing different interactions. A personalised schedule welcome appears before entering Home and again at a class-period change. See [PHYSICS_DEMO.md](PHYSICS_DEMO.md). Earlier mixed-subject catalogue descriptions below are historical; non-Physics timetable slots currently show a clear demo-content empty state.


**Current demo:** twenty varied interactive prompts, the five curated Studio media tools, Friends invitation rooms, and a timetable-controlled feed. See [TIMED_FEED.md](TIMED_FEED.md) for the current three-minute journey, public-link setup and implementation limits. Older topic-session and educational-reel notes below describe retained secondary workflows.


## Educational reels revision

The default Home feed is ten authored physics experiments: absurd hooks, force/distance controls, a prediction before the reveal, calculated consequences, causal feedback, and later recall/transfer. Chemistry has a separate ten-play atomic-charge session. Use PHYS02 and CHEM02; existing published classes remain unchanged. See [LEARNING_DESIGN.md](LEARNING_DESIGN.md) for exact scope and research references. Uploaded notes still use source-matching drafts, not automatically generated simulations.


The app now opens into a black, phone-first social feed inspired by the supplied screenshots. The original classroom workflow is secondary at `/classroom`; existing classroom data is preserved.

## Run

Node.js 24 is required. From this directory:

```powershell
npm install
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run dev` while developing. No teacher password or AI key is needed for the social app. Each browser receives its own persistent guest creator session.

## Included worlds

The feed starts with ten original, hardcoded interactive posts: Particle Universe, Lunar Drift, Touch Grass, Pocket Factory, Gravity Garden, Wave Playground, Orbital Shot, Midnight Run, Liquid Light, and Spring Theory. They are Canvas simulations/games, not videos or static mockups. Play by touching/dragging inside the world; scroll outside it to move between posts. Visible controls handle thrust, rotation, coin upgrades, palettes, resets, and other actions. Arrow keys work for the lander, mower, racer, and painter. Click/focus a canvas first for keyboard input.

Only the visible post animates at full rate. Scrolling preserves each mounted simulation's state. Switching navigation sections or reloading restarts game simulations; social actions and projects remain saved. Audio starts muted and the sound button enables quiet synthesized touch sounds. No music is streamed.

## Working social and creator flows

- Like/unlike, save/unsave, repost/unrepost, follow/unfollow, and comments use SQLite server storage. Counts reflect actual recorded actions; no engagement counts are seeded.
- Search opens matching posts. Following filters the feed. Profile tabs show published, liked, saved, and reposted worlds.
- Share uses native sharing when supported and clipboard fallback. A `/?gizmo=<id>` link opens the selected post. Camera downloads a PNG from the current canvas.
- More opens remix, share, snapshot, and hide actions. A remix creates an independent saved project and preserves attribution. Hide applies for the current visit.
- Studio accepts an idea and matches it to one of ten supported engines. The playable editor changes name, caption, engine, color, speed, and how-to text. Draft save, publishing, saved version restore, and independent remixing work. Restore creates a new draft version.
- The quick edit field recognizes faster/slower/calmer and blue/pink/green/purple/orange. Press Enter, then save. These are explicitly local edits, not AI generation.
- Activity shows actual actions for your guest profile and separately labels the seeded demo friend scenarios. The four suggested creator personas are demo content.
- Profile editing persists. A browser's own follower count is queried from recorded follows. Demo creator follower totals are not invented.

## MVP boundaries

Studio is a functioning **template creator**, not an arbitrary code-generation service. It can make variations of the ten engines without an AI key. The earlier lesson AI integration remains in classroom tools and is separate. New social publishing updates the creator's post; immutable class publications remain specific to the classroom workflow.

Guest profiles are tied to a browser cookie. There is no production login, cross-device account recovery, real demo friends, public moderation service, or messaging inbox. The included friend events are visibly labelled examples. Custom post ownership is checked server-side: a second guest cannot edit/restore another guest's project. Public comments/social data are intended for a trusted hackathon demo.

Persistence uses `data/classpocket.sqlite`. Back up the database through SQLite facilities and use a persistent disk on a single Node host. Do not deploy this setup to an ephemeral filesystem or run multiple instances against separate local files. No public hosting, external database, model credential, or physical-phone network test is configured.

The exact reusable build prompt is in `BUILD_PROMPT.md`.

## Verification

Production compilation and TypeScript validation pass. `tests/social-browser.ts` exercises the ten engines in 390 × 844 mobile Edge, real social actions and comments, follow, capture download, mute, Activity, profile editing/saved tab, Studio creation, save/edit/restore/publish/remix, reload persistence, and editing denial from another browser. It asserts no page errors or horizontal overflow. It uses a separate QA database to keep verification users out of the main demo.

```powershell
# Start a dedicated QA server in one terminal:
$env:DATA_DIR='C:\path\to\isolated-qa-data'
npm start -- --port 3002
# In another terminal:
$env:TEST_URL='http://localhost:3002'
npx tsx tests/social-browser.ts
```

The script expects an initially fresh QA feed. Screenshots are under `test-results/social-*.png`. This is browser emulation on the available host, not verification on a physical phone.
