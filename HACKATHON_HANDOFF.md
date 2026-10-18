# Hackathon handoff

Handbook checked: https://app.sym.so/handbook/index.html#judging

The handbook calls for a public live link, a repository/workspace link, a Scope Honesty Declaration, and a short description with dependency/service disclosure. It prioritizes working flows and architecture. The local app and this document do not replace a publicly reachable submission URL.

## Short description

ClassPocket is a school-focused alternative to Pocket-style playable feeds. A teacher's lesson becomes a reviewed set of ten source-linked arcade missions on one topic. Students can finish their assigned study or explicitly request another batch on the same topic. They choose when to change subjects. The same renderer is reused with validated content, so creating ten experiences does not require generating ten codebases.

The problem hypothesis comes from a founder-reported conversation with a professor and discussion with teammates: a feed mixing unrelated subjects may distract from an assigned study goal. This is early qualitative input, not controlled research or proof of improved retention. Do not claim demonstrated learning gains, school adoption, or engagement statistics.

## Submission links

- Local running app: http://localhost:3000
- Topic-session entry: http://localhost:3000/study
- Source: [rudecoder-web/SYM-AI, classpocket-mvp branch](https://github.com/rudecoder-web/SYM-AI/tree/classpocket-mvp). The original team plan is preserved in `docs/TEAM_PLAN.md`, and the branch retains the repository's existing history.
- Team review: [pull request #1](https://github.com/rudecoder-web/SYM-AI/pull/1).
- Public live URL: **not configured**. Deploy to a persistent Node host and test signed out on another device before submitting. `localhost` is not a public link.

## Scope Honesty Declaration

### Working locally with real stored data

- Ten original hardcoded social-play demos and Home/Studio/Activity/Profile navigation.
- Server-persisted guest profiles, likes, saves, reposts, follows, comments, project versions, remix attribution, and publishing. Share/copy links and canvas PNG capture.
- Teacher sign-in, real PDF text extraction, pasted-note processing, and ten editable source-linked Concept Courier missions.
- Review-gated assignment publication with immutable class snapshots, six-character codes, student nickname sessions, discrete server-graded attempts, and results.
- Ten required missions, explicit optional batches of ten on the same topic, preserved required completion, and manual topic switching.
- SQLite persistence and server-side permission checks. The previous classroom workflow remains available.

### Partial

- Automatic educational content creation uses extractive matching and one reusable arcade template. A teacher must review meaning, ambiguity, distractors, and source support. Short sources repeat concepts; optional practice remixes those concepts.
- PDF support extracts text; it does not OCR scanned slides. PPTX is not supported.
- Demo teacher access uses one shared teacher workspace; social creators use browser-bound guest sessions. Production school accounts, organizations, and account recovery are not built.
- Physics and Chemistry category starters are included authored demo content. Uploaded/pasted material may use the other supported category labels after teacher review.
- Results reflect deliveries and retries, not a definitive measure of understanding. Automated integration checks use a mobile browser emulator; a physical phone and public host have not been verified.
- Existing classroom server-side OpenAI integration is optional; successful model generation has not been verified with a valid key. It is not used by the new topic-session template path.

### Mocked / planned

- Friend scenarios and suggested creator personas are explicitly labelled demo content; no genuine friend network is claimed.
- Arbitrary AI-generated game code, more educational engines, paid custom-game subscriptions, payments, parent accounts, production moderation, and production school identity/SSO.
- Public hosting remains pending deployment configuration. No public accessibility or horizontal scalability claim is made.

## Three-minute live demo outline

0:00–0:25 — Explain the specific audience and hypothesis: school assignments need a feed that stays on the lesson topic. Identify Pocket as inspiration; ClassPocket uses its own name, code, and visuals.

0:25–1:05 — Open `/study/create`. Use included synthetic Physics notes or a prepared text PDF. Show actual extracted pages and the ten filled missions. Briefly edit a clue, preview the game, check teacher review, and publish.

1:05–1:55 — Open the student link in a separate session. Launch the ship and steer it into matching cargo. Show feedback and the source citation. For the live pitch, a clearly labelled previously completed demo run can show the end state; do not present skipped/API-driven test attempts as a live student's learning.

1:55–2:25 — Show the required-ten completion screen, add ten optional missions, and show that the category and original completion stay unchanged. Explicitly switch to Chemistry.

2:25–2:45 — Show teacher results with actual demonstration attempts, not invented numbers.

2:45–3:00 — Explain template reuse, no model calls on the new path, and the current hosting limit. Keep room for the separate two-minute Q&A.

## Architecture answer, in plain language

“We generate validated mission data, not ten separate programs. The teacher reviews one set of source-backed content and publishes a fixed assignment. Each student has an independent stored run, and optional practice reuses the reviewed topic. A single renderer handles all missions. Our first bottleneck at much higher traffic is this single Node host and SQLite write concurrency. A deployed production version needs organization-level authentication, a shared managed database, upload limits and object storage, and background jobs/cache if we add paid model generation. Those are migration steps, not things we claim to have already built.”

## Disclosure

Built with AI coding assistance and original application code. Dependencies include Next.js, React, TypeScript, Tailwind CSS, Lucide icons, Zod, pdf-parse/PDF.js, the OpenAI SDK for the optional legacy classroom integration, SQLite through Node.js, and Playwright/tsx for verification. Versions and transitive packages are pinned in `package-lock.json`. No external dataset or pretrained model is needed for the topic template or included authored notes. No third-party game code, original-app logo, screenshot, or music is embedded as app content.

Keep sample/synthetic notes and nicknames in the event demo. Credentials and database files are excluded from Git/source exports. The submitted declaration must be updated if the team deploys, adds credentials, or changes the implemented scope.
