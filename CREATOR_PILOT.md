# Judges become creators

Open `/make` directly, or choose **Try the creator demo** on the Home welcome. Studio also embeds the creator flow above the original twenty-template editor.

1. Choose a display name. A real guest profile is stored for this browser; cross-device account recovery is not configured.
2. Choose Gravity jump, Circuit, RGB light, Solar power or Waves and **New experiment**. Change the actual starting values and test the preview.
3. **Share privately** saves a fixed snapshot and gives a link plus a locally generated QR code. Anyone holding the link can play and remix that version; it does not expose the source project or other drafts.
4. Another participant opens the link, plays it, chooses **Remix this gizmo**, enters their own name and receives a separately owned draft. They change its behaviour and **Publish to showcase**.
5. The showcase refreshes every fifteen seconds while visible, on focus, or with its refresh button. Published projects also enter the main social feed on refresh. Sharing does not synchronise participants' play controls.

The owner can revoke individual share links or unpublish a project, revoking its public snapshot links. Private snapshots and already-created independent remixes remain separate. Private-parent share tokens are not revealed through a published remix's provenance. Public parent links remain available for attribution while live.

## Live AI

Set `GROQ_API_KEY` in the server environment (Vercel → Environment Variables, or `.env.local` locally) and redeploy or restart. Do not paste keys into chat or Git. `GROQ_MODEL` defaults to `openai/gpt-oss-20b`, hosted by Groq. No OpenAI key is required.

With a key configured, **Generate playable gizmo** and **Change with AI** call Groq's structured-output endpoint through the same client as the main Studio. Prompts are screened for personal details and unsafe requests before any call. Only bounded typed parameters and supported visual presets are accepted; generated JavaScript is never executed. AI can choose and configure the five experiment types, not invent new software. It returns an unsaved, unpublished draft for review, and an unreachable jump goal is rejected. A saved draft is labelled AI only when the server can match it to a successful generation request by the same user; clients cannot claim AI or reviewed provenance.

Without a key the UI explicitly reports manual creation. Manual editing, previews, snapshots, publishing, QR links and remixes work without any model call. Sample media remains labelled as curated content. No fallback pretends to be AI.

The adult judge pilot has basic input screening and an age-appropriate system instruction, not a production moderation or child-consent service. Do not present it as ready for a live school rollout.

AI limits are the durable daily budgets in Postgres shared with the main Studio (`AI_USER_DAILY_LIMIT`, `AI_GUEST_DAILY_LIMIT`, `AI_GLOBAL_DAILY_LIMIT`, per UTC day, failed attempts included). The original SQLite pilot also capped 3 calls per minute across the demo; that per-minute cap is not carried over, so set the daily budgets below your Groq account limits. Errors preserve the draft and never switch to paid services.

## Storage and checks

The pilot now runs on the same Supabase backend as the rest of ClassPocket (see DEPLOYMENT.md); the SQLite tables and the laptop tunnel are gone.

- Creator projects are ordinary versioned gizmo drafts whose definition carries a validated `world`. Publishing to the showcase uses the normal publish path, so published projects also appear in the main feed.
- Share links are rows in `creator_shares`, holding an immutable copy of the saved version. Remix lineage lives in `creator_forks`. Both tables have RLS, and all writes go through server-only SQL functions (`create_share`, `revoke_share`, `remix_share`). A private parent's token is only revealed to its owner.
- Unpublishing revokes that project's public links; private snapshots and independent remixes stay.

Tests:

- `tests/unit/creator-model.test.ts`: templates, reachable goals, unsafe values, and conversion to v2 definitions.
- `tests/integration/creator.test.ts`: two guest creators, private and public sharing, remix attribution and private-parent isolation, owner and stale-write protection, snapshot immutability, revocation, unpublishing, rejection of client-claimed AI provenance, and a mocked AI contract. The AI part runs against `tests/mock-groq.ts` and is **not** evidence of a live Groq call.
- `tests/integration/rls.test.ts`: direct database attempts against the share tables and functions.
- `tests/browser/run.ts`: the full two-browser create → share → remix → publish journey, plus the other renderers.
