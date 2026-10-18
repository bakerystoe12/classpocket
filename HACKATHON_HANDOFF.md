> **Historical document.** This describes the earlier SQLite / tunnel demo. The current app runs on Vercel + Supabase (+ optional Groq) — see [README.md](README.md), [DEPLOYMENT.md](DEPLOYMENT.md) and [FEATURE_STATUS.md](FEATURE_STATUS.md). Links such as temporary tunnel URLs and the shared demo teacher password below no longer apply.

# ClassPocket — judge handoff

**Current Physics demo:** all twenty catalogue gizmos now teach Physics through their existing different interactions. A personalised schedule welcome appears before entering Home and again at a class-period change. See [PHYSICS_DEMO.md](PHYSICS_DEMO.md). Earlier mixed-subject catalogue descriptions below are historical; non-Physics timetable slots currently show a clear demo-content empty state.


## What we built

ClassPocket is a Pocket-inspired feed of twenty original interactive prompts: visual toys, creative tools, simulations and games. Its unique feature is a timetable-controlled recommendation feed. During Physics, the student gets Physics gizmos. At the end of class, the feed switches to the next subject or returns to mixed discovery, without a lingering subject boost from likes.

Our target is secondary-school students who already enjoy scrolling and teachers who want part of that attention connected to their class schedule. Redirecting 20% of otherwise wasted attention is an ambition, not a measured result. The prototype does not establish a dopamine, health, attention or retention benefit. The founder-reported professor and teammate conversations are qualitative input, not a controlled user study.

## Demo links

- Public judge demo: https://pool-proven-minds-italia.trycloudflare.com
- Local preview: http://localhost:3000/
- Source: https://github.com/bakerystoe12/classpocket
- Earlier team review: https://github.com/rudecoder-web/SYM-AI/pull/1

The public URL is a verified temporary Cloudflare Quick Tunnel to a separate demo server/database. The laptop and both processes must stay running. Restarting the tunnel changes the address. Permanent hosted infrastructure is not configured. The original team plan remains unchanged in docs/TEAM_PLAN.md.

## Three-minute journey

See TIMED_FEED.md: show diverse interactions, preview the timetable across the bell, create a custom gizmo in Studio, then invite and join from another browser. Finish by distinguishing the implemented recommendation rule from the hardcoded content and planned production services.

## Scope Honesty Declaration

Working: twenty distinct interactive catalogue entries and prompts; Pocket-style Home, Studio, Friends and Profile; persisted social actions, comments, profiles, publishing, versions and owner checks; subject tags; saved weekly timetables and IANA time zones; exact class windows; personal sharing codes and teacher-managed schedule codes; server-side rejection of student timetable edits/unlinking; refresh of teacher schedule updates; real invitation rooms and guest memberships for custom saved snapshots; actual image/audio/video sample downloads and playback.

Hardcoded: twenty original catalogue prompts, demo creator personas, five curated Studio tool outputs and example school-day timings. Make Image selects a labelled sample illustration; it does not generate arbitrary imagery. The judge clock is a labelled local preview, not a change to saved schedule time.

Retained secondary features: teacher PDF text extraction and pasted-note drafts, reviewed topic-session publication, authored scientific experiments and source-matching Courier sessions, required ten/optional-ten practice, actual attempts/results, immutable assignments, and the earlier /classroom workflow. Arbitrary PDFs do not automatically become custom scientific simulations.

Partial/planned: production school/guardian identity, verified parental relationships, tamper-proof devices and trusted policy clocks, synchronised multiplayer, arbitrary AI image/video/code generation, measured learning/attention outcomes, payments, production moderation, permanent hosting and large-scale infrastructure. Guest browser profiles and the disclosed shared teacher password are demo access. A person who knows that password can unlock demo teacher tools.

The schedule controls recommendations, not access to every direct lesson route. Room controls are personal to each participant; invitations share a saved snapshot and membership, not synchronised game state. The app copies/shares links only after user action and does not automatically message contacts.

## Scale answer

Interactions render on the client; a fixed catalogue and reusable templates avoid per-scroll model generation. This demo still uses one Node server, synchronous SQLite writes and broad social-state reads, plus a temporary tunnel. These are likely bottlenecks before a 10,000-user claim could be made. We have not load-tested that scale. A production move needs authenticated organizations/families, managed PostgreSQL, paginated feeds, shared object storage/CDN, queued uploads/generation and a stable host. These are plans, not deployed capabilities.

## Validation and disclosure

Production build and TypeScript checks pass. Eighteen focused tests pass. The rhythm browser journey passed against localhost and the public HTTPS URL with independent phone-sized host/guest contexts. It exercises all ten added interactions, all five Studio media tools, actual invitation joining, owner isolation, exact bell transitions, free-time release and teacher timetable permissions/updates. Retained social and topic-session journeys passed. Screenshots were inspected; a physical phone and learning/attention study were not conducted.

Built with AI coding assistance, Next.js, React, TypeScript, Tailwind CSS, Lucide, Zod, SQLite through Node 24, pdf-parse, OpenAI SDK for an optional legacy path, and Playwright/tsx for checks. Original SVG/WAV/WebM sample assets are included; no original-app screenshots, music or game code are embedded. This judge demo needs no model key. Secrets, databases, test artifacts and the downloaded tunnel binary are excluded from the repository/source archive.
