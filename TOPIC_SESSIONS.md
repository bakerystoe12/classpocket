> **Historical document.** This describes the earlier SQLite / tunnel demo. The current app runs on Vercel + Supabase (+ optional Groq) — see [README.md](README.md), [DEPLOYMENT.md](DEPLOYMENT.md) and [FEATURE_STATUS.md](FEATURE_STATUS.md). Links such as temporary tunnel URLs and the shared demo teacher password below no longer apply.

# Topic sessions

ClassPocket now connects its social-play UI to a focused study journey: **one lesson → ten assigned gizmos → finish, or explicitly add ten more on that same topic**.

## Try it

Open `/study` from the educational session entry in Home. Included synthetic demos are available for Physics (code `PHYS02`) and Chemistry (code `CHEM02`). Choose a demo nickname. Physics lets you move a force along a beam or change its strength; Chemistry lets you change electron counts. Predict the outcome, then run the experiment. Both the setup goal and prediction must match. Feedback shows the arithmetic, causal rule and exact source quote. Sliders support keyboard input, and electron buttons support touch, mouse and keyboard.

Complete all ten assigned missions, then choose **Finish session**. The completion screen offers **Add 10 more** and **Choose a different topic**. Optional missions reuse teacher-reviewed concepts with new mission IDs, prediction ordering and scenario order. They are additional practice, not newly invented concepts or new AI-generated software. Finishing the required ten stays recorded when optional practice is added. Subjects change only through the explicit switch/join action.

## Teacher workflow

Open `/study/create`, also linked from Studio. Demo password is `classpocket-demo` unless `TEACHER_PASSWORD` was changed.

1. Open an included sample, upload a text-based PDF up to 10 MB, or paste lesson notes. A line containing `---` separates pasted pages.
2. Enter a category and topic title. The same topic stays attached to every mission and optional batch.
3. Inspect the ten mission drafts and extracted source pages. Edit clues, matching cargo, distractors, explanations, and source-page references. Play the preview. Save edits.
4. Confirm the review checkbox and assign the session. Publication captures a fixed snapshot and creates a six-character class code and stable student link. Later draft edits leave that class unchanged.
5. Students join from another browser/phone with a nickname. Class results show actual joins, required completion, optional mission counts, first-attempt results, and individual experiment configurations/predictions/timestamps. No sample attempts are seeded.

PDF text is genuinely extracted. Scanned, unreadable, or insufficient sources are rejected with a pasted-text/sample fallback. The template recognizes `Term: definition` notes first; for paragraphs it makes exact-source missing-word clues. It requires at least three distinct usable terms/sentences. Sources with fewer than ten concepts repeat concepts across the ten missions, as disclosed in the editor. All auto-filled drafts require teacher review: extractive matching does not prove semantic accuracy.

Included sessions use **two scientific experiment engines**, with ten authored scenarios each. Uploaded material still uses the source-matching Courier template. The ten original social toys remain in Playground. See LEARNING_DESIGN.md for the hook/experiment/recall design and evidence boundaries.

## Costs and implementation

New session generation, source matching, and optional batches make **zero external model calls**. They fill a validated data schema for a reusable renderer. No AI-key setup is needed. Full custom engines and paid subscriptions are planned; billing is not implemented. The previous classroom AI integration remains separate and optional.

Study drafts, assignment snapshots, student runs, and discrete attempts are persisted in SQLite. Required completion is derived from correct experiments / deliveries to the original ten IDs; optional practice gets separate IDs. Grade decisions are made on the server. Teacher operations require the teacher session; student codes grant play access only. Progress survives a browser reload and server restart. This records practice activity, not proof of understanding or a proctored grade.

For another phone use the computer's LAN address instead of `localhost` and permit the port on that trusted network. No public deployment is configured.

## Verify

`npm test` includes topic-content validation, extractive notes, cargo grading, invalid citations, and fresh same-topic practice batches. `npx tsx tests/study-journey.ts` runs against `http://localhost:3003` by default, or `TEST_URL`.

Start a QA server with a dedicated `DATA_DIR`, e.g. `npm start -- --port 3003`, so test students do not enter the classroom/demo database. The integration test uses independent teacher and phone-size student browser contexts. It plays a wrong and successful beam experiment through the UI, then an atomic charge experiment, submits the remaining nine through the real attempt API, then checks finishing, adding ten, preserved completion, source/topic consistency, explicit category switch, results, snapshot isolation, permissions, PDF parsing, pasted notes, and unreadable-file errors. This is browser emulation rather than a physical-phone test.

See `HACKATHON_HANDOFF.md` for the scope declaration, submission description, and known hosting limits.
