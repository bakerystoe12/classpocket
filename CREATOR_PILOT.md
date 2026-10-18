# Judges become creators

Open `/make` directly, or choose **Try the creator demo** on the Home welcome. Studio also embeds the creator flow above the original twenty-template editor.

1. Choose a display name. A real guest profile is stored for this browser; cross-device account recovery is not configured.
2. Choose Gravity jump, Circuit, RGB light, Solar power or Waves and **New experiment**. Change the actual starting values and test the preview.
3. **Share privately** saves a fixed snapshot and gives a link plus a locally generated QR code. Anyone holding the link can play and remix that version; it does not expose the source project or other drafts.
4. Another participant opens the link, plays it, chooses **Remix this gizmo**, enters their own name and receives a separately owned draft. They change its behaviour and **Publish to showcase**.
5. The showcase refreshes every fifteen seconds while visible, on focus, or with its refresh button. Published projects also enter the main social feed on refresh. Sharing does not synchronise participants' play controls.

The owner can revoke individual share links or unpublish a project, revoking its public snapshot links. Private snapshots and already-created independent remixes remain separate. Private-parent share tokens are not revealed through a published remix's provenance. Public parent links remain available for attribution while live.

## Live AI

Set `GROQ_API_KEY` in the app's `.env.local` (or the server environment) and restart the server. Do not paste keys into chat or Git. `GROQ_MODEL` defaults to `openai/gpt-oss-20b`, hosted by Groq. No OpenAI key is required for this Studio route. The public demo server loads the same local environment file after restart.

With a key configured, **Generate playable gizmo** and **Change with AI** call Groq's structured-output endpoint. Only bounded typed parameters and supported visual presets are accepted; generated JavaScript is never executed. AI can choose/configure five experiment types, not invent arbitrary new software. It returns an unsaved, unpublished draft for review. Inactive parameters remain in the schema for consistent edits. An unreachable jump goal is rejected.

Without a key the UI explicitly reports manual creation. Manual editing, previews, snapshots, publishing, QR links and remixes work without any model call. Sample media remains labelled as curated content. No fallback pretends to be AI.

The adult judge pilot has basic input constraints and an age-appropriate system instruction, not a production moderation/child-consent service. Do not present it as ready for a live school rollout.

AI request limits are stored in SQLite: 12 requests per guest per rolling 24 hours, 100 across the demo per rolling 24 hours and 3 across the demo per rolling minute, including failed attempts. Provider quotas may be lower. Errors preserve the draft and never silently switch to paid services. Requests time out at 35 seconds; saved posts need no model calls to play. Guest profiles are not verified identities and global limits remain necessary.

## Hosting and checks

This implementation extends the current persistent-Node/SQLite MVP and its existing temporary public tunnel. It does not migrate storage to Supabase or claim Vercel compatibility. Local SQLite and the laptop tunnel still need the running host; a Vercel deployment requires the separate storage migration described in the Vercel build specification.

`npm test` includes typed configuration and reachable-goal checks. `tests/creator-journey.ts` exercises independent browser identities, actual physics changes, snapshot immutability, private/public sharing, QR creation, fork attribution, permissions, version conflicts, revoke/unpublish and missing-key behaviour. Run it against an isolated QA database. `tests/creator-ai-contract.ts` simulates provider responses; it is explicitly not evidence of a live Groq generation. Use an isolated `DATA_DIR` ending in `creator-ai-qa` for that script.
