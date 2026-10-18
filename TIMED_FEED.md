# A feed with a school bell

**Current Physics demo:** all twenty catalogue gizmos now teach Physics through their existing different interactions. A personalised schedule welcome appears before entering Home and again at a class-period change. See [PHYSICS_DEMO.md](PHYSICS_DEMO.md). Earlier mixed-subject catalogue descriptions below are historical; non-Physics timetable slots currently show a clear demo-content empty state.


ClassPocket now opens with twenty distinct original interactive prompts, rather than a single-topic set of repeated game mechanics. The collection includes visual toys, simulations, creative tools and small games. Each post exposes its source prompt and subject tag. The fixed discovery order alternates subjects; likes do not train a persistent subject preference in this MVP.

## The unique feature

Open the clock banner in Home or **Menu → Schedule my feed**. Add weekly classes, subjects, start/end times and an IANA time zone. Enable and save the timetable. During an active class, Home and its search restrict recommendations to that subject, including custom gizmos tagged with that subject. A class is active from its start time up to, but not including, its end time. When the next class begins, the feed changes subject; between classes it returns to the mixed catalogue. No lingering subject boost is applied from a previous class or from likes.

Intervals cannot overlap on the same day. Overnight classes must be split. Time-zone conversion uses Intl with the timetable's zone; it is not tied to the server's zone. The browser checks the clock every second, and refreshes shared timetable data every fifteen seconds and on focus. A timer change scrolls Home back to its start.

Personal schedules can be shared by link/code and copied into another browser's own timetable. Teachers can sign in with the demo teacher password, save a timetable, and publish a managed class code. A student joining it receives that teacher schedule. Attempts to edit, replace or unlink it are rejected server-side without teacher access. When its owner saves changes, linked students receive the updated timetable on refresh. The code is a sharing capability: only share it with intended demo participants.

This is an algorithm/recommendation control, not a content-access firewall. Explicitly assigned lessons remain available through their study routes. Guest identities, a shared teacher password and browser clocks are demo mechanisms, not verified parental consent, tamper-proof school device management or production family accounts. A student with the publicly disclosed demo password can unlock demo teacher tools. Production controls require authenticated school/guardian relationships and a trusted policy clock.

## Three-minute judge flow

1. **0:00–0:30:** Scroll the mixed feed: particles, atom, terrarium, circuit, poetry or beat sequencer. Show that a gizmo can be any interaction, not just a game.
2. **0:30–1:15:** Open Schedule, choose **Use demo school day**, save, then preview **09:10 Physics**. Close the panel to see Physics-only recommendations. Set preview time to **09:45** to show Chemistry taking over exactly at the bell. **12:50 Free time** restores the mixed feed.
3. **1:15–2:00:** Open Studio. Show Ideas, Images, Sounds, Make Image and Videos. These are explicitly curated sample tools; the audio and video genuinely play and downloads are real. Choose an idea, open its template, customise and save a draft.
4. **2:00–2:45:** Open Friends, select that saved custom gizmo and create an invite. Open its link in another browser/phone, join, and show two real room members. Each member has independent controls; synchronised multiplayer is not implemented.
5. **2:45–3:00:** Explain the timetable-controlled recommendation rule and the template-based MVP scope. The 20% attention ambition is a target, not an achieved metric. Dopamine protection and learning gains have not been established by this prototype.

The judge clock is a clearly marked local preview and resets on page reload. It never changes a saved timetable and is hidden for a student under managed controls unless teacher access is active on that browser. Use **Use real clock** to exit preview. Demo times assume Monday and only match the saved example timetable.

## Friends and Studio

Friends replaces Activity in the primary navigation. A creator can invite friends into a saved custom draft or published gizmo. The room stores a fixed snapshot, so the link does not depend on publishing the draft to the public feed. Joining and membership persist on the server; another member cannot edit the owner's source project. Links are copied or shared deliberately; the app does not automatically contact anyone. There are no fake friend join counts.

Studio's five added tools are hardcoded for the hackathon. Ideas are authored prompts; Images are three original SVG illustrations; Make Image selects one of those samples from prompt keywords; Sounds is an original synthesised WAV; Videos is an original playable WebM loop. They do not call an image/video model or claim arbitrary generation. The existing template creator still saves, versions, remixes and publishes real gizmo definitions. Custom gizmos have an editable subject tag used by the timetable filter.

## Public judge access

A public HTTPS demo can be served with an official Cloudflare Quick Tunnel to a separate Node server/database on port 3005. This leaves existing local classroom records separate from public demonstration activity. It is temporary: the laptop and both processes must stay running, and restarting the tunnel changes its hostname. It is not a permanent production deployment or an uptime guarantee. See [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

For a new Windows session, run `npm ci`, `npm run build`, then `powershell -File scripts/start-public-demo.ps1`. That script downloads a checksum-verified official tunnel binary into ignored `.judge-demo/`, launches hidden server/tunnel processes, prints the returned URL and saves it in `.judge-demo/public-url.txt`. If a demo is already listening on port 3005, use the existing URL rather than starting another. The demo uses separate synthetic records and the disclosed teacher password; it is not a service for real student data.

Stable hosting requires a persistent Node host and writable disk, or migrating the database/API to a managed service. SQLite write contention, a single server, global social payloads and the temporary tunnel are known scaling limits. No 10,000-user capacity claim has been tested.

## Verification

`npm test` covers twenty valid unique engine definitions and prompts, exact start/end boundaries, weekends, time-zone conversion, disabled timetables, overlap and invalid-time-zone rejection, and mixed discovery ordering, alongside existing science/content tests. `npx tsx tests/rhythm-journey.ts` uses independent phone-sized host/guest browser contexts against an isolated QA database. It exercises the ten added interactions, all five Studio tools and playable media, custom draft invitation, actual room joining, owner isolation, schedule save, exact bell preview transition, free-time reset, teacher locking and updates. Browser emulation and UI practice records are not a physical-phone, attention or retention study.

Verified public judge URL for this run: https://pool-proven-minds-italia.trycloudflare.com. This is the returned temporary tunnel address, not a reserved hostname. The full rhythm journey passed locally and through this public HTTPS origin. Production build, TypeScript and eighteen focused tests passed, as did retained social browser/navigation and teacher topic-session journeys.
