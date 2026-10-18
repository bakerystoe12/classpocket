Build ClassPocket: a working hackathon MVP of an educational social app inspired by the supplied Pocket screenshots. Its central product is a feed of playable educational gizmos with absurd, memorable setups. The player must use the science to make the joke's situation work. Keep the scope honest and the app runnable without a paid model key.

Product and visual direction

Use a black mobile social shell, white/gray icons, large rounded interactive posts, and a floating pill navigation for Home, Studio, Friends and Profile with a separate circular plus button. Include like, comment, repost, share, bookmark, capture, mute and more actions. Use the supplied screenshots as layout inspiration while keeping original branding, code and assets. Support phone, desktop, touch, mouse and keyboard.

Home must DEFAULT to twenty distinct hardcoded Physics-based interactive prompts: visual toys, simulations, creative tools and games. Preserve all twenty existing interactions while making their controls and consequences teach Physics. Show each prompt and its subject. Keep the authored science sessions as secondary teacher-assigned content. Include Following, search, saved posts and creator profiles. Never inject another subject into an assigned topic automatically. Social actions and comments must persist on the server with real counts; label demo creators and sample friend scenarios. Distinguish free play in Home from server-saved assigned study progress.

The educational loop

Every educational gizmo needs: an absurd hook that embodies the concept; a short scientific mission; meaningful controls that change the system; an explicit prediction BEFORE the reveal; a visible consequence; concise causal feedback with calculations/units where relevant; a memory cue and a source citation. Progress requires BOTH a valid scientific setup meeting the mission goal and a correct prediction. A clicked answer alone cannot complete an experiment.

Use a discover → remix → recall → transfer progression across ten posts. Revisit the rule after intervening scenarios, then end with three new-context transfer missions. Keep hints available without showing them automatically. A joke that does not help explain the scientific relationship should be removed. Do not claim that absurd hooks alone guarantee memory or that app completion proves understanding.

Author two reusable scientific engines, with ten reviewed scenarios each:

1. Physics: a goose has to balance or tip an ideal beam against ridiculous loads, including a mega pickle. Change force and perpendicular distance; compare opposing moments; predict left down, balanced or right down. Moment = force × perpendicular distance. Scaffold some missions with one fixed control, allow both controls later, and include weaker-force/longer-lever misconceptions and rescue/hatch transfer scenarios. Use a fixed frictionless pivot and ignore beam weight. Animate turning direction from net moment; describe the animation as an illustration, not a quantitative dynamics simulation. Keep units and directions correct.

2. Chemistry: an electron goblin changes atom/ion charge. Keep protons fixed and let students add or remove electrons, predict positive/neutral/negative, and reach a specified net charge. Charge = protons − electrons. Proton count determines element identity; neutrons affect isotope rather than net charge. Include lithium, chlorine, sodium, oxygen, magnesium, helium and carbon scenarios with correct particle counts, and later transfer without an automatic rule hint. Label electron dots as a counting model, not physical paths or a scale drawing. Keep Chemistry a separately selected topic.

Lesson-to-session workflow

Teachers can sign in at /study/create, open either included science sample, upload a text-based PDF up to 10 MB, or paste notes with page separators. Extract PDF text and page numbers for real; reject unreadable/scanned/insufficient text with a useful fallback. Uploaded arbitrary material must use an honest extractive Concept Courier source-matching template unless a supported scientific experiment has actually been authored. Do not pretend to generate scientific simulations from any PDF without doing that work.

Create exactly ten editable mission drafts. Let teachers inspect exact source quotes, edit hooks, mission wording, memory cues and feedback, and play a preview before reviewing and publishing. Keep engine controls/goals fixed in the simple science editor unless a validated parameter editor is implemented. For note matching, allow editing the source clue, target, distractors and explanation. Short sources may repeat concepts; disclose that clearly.

Publication requires explicit teacher review and saves an immutable snapshot with a six-character code and student link. Later draft edits must not modify a published class. Preserve existing classroom routes, data and published sessions when evolving the app; use new included-sample codes rather than changing old student snapshots.

Students join /study/[code] with a demo nickname. Keep one category/topic attached to the whole session. Record server-graded experiment configurations, predictions, wrong attempts and correct completions. Require completion of the original ten missions before the assigned study can finish. Then offer Add 10 more on the SAME topic or an explicit category switch. Optional batches replay/remix reviewed scenarios with new IDs; they do not imply ten new concepts or ten AI-generated programs. Required completion stays saved when optional practice is added and across reloads/restarts. Teacher results show actual practice records and first attempts, without claiming a definitive grade of understanding.

Studio and social features

Anyone can use the guest social Studio to describe an idea and match it to an existing supported toy template, customize title/caption/accent/speed/instructions, save drafts, publish, remix with attribution and restore versions. Label this as template matching. Do not claim arbitrary AI code generation or implemented subscriptions. Route educational-session remixing to the teacher workflow rather than silently converting a scientific experiment into an unrelated toy.

Persist likes, saves, reposts, comments, follows, guest profiles, posts, drafts, versions and activity on the server. Implement native sharing with clipboard fallback and direct links to the correct educational or playground post. Capture must download a real canvas/SVG model snapshot. Search, Following, profile edit/share and saved-post reopening must work. Keep edit/restore owner checks between browsers. Audio begins muted and requires an explicit gesture.

Implementation and evidence

Inspect repository instructions and installed framework docs before editing. Use existing conventions; Next.js, React, TypeScript, Zod and SQLite on a persistent Node 24 host are suitable for this MVP. Validate source references, scientific configurations, element/proton consistency, reachable goals, fixed controls and bounded answers. Grade on the server; never trust a client correctness flag. Never evaluate arbitrary untrusted JavaScript. Keep secrets, databases, dependencies and QA records out of Git and source exports.

Document curiosity and retrieval research as design inspiration, with primary-source links and clear limits. Distinguish within-session recall from spaced practice over days, which is not yet implemented. Propose an equal-time comparison with delayed transfer testing before claiming retention gains. Authored science scenarios, extractive uploaded-note drafts and planned automatic authoring must be clearly distinguished.

Verification and delivery

Run a production build, TypeScript and meaningful scientific validation tests. Verify all twenty authored scenarios are solvable; wrong predictions, impossible goals, altered locked controls, negative electron counts and invalid element identities must fail. Test the real teacher-review/publication/student flow in independent browser contexts, including an actual wrong and correct beam experiment, an atomic-charge interaction, ten-required completion, optional practice, explicit topic switch, results, snapshot isolation, real PDF extraction/errors and legacy note matching. Verify the focused Home feed, social persistence, direct links, capture, original playground interactions, Studio versioning and ownership. Inspect mobile/desktop screenshots for overflow and control visibility. State when testing uses browser emulation rather than a physical phone.

Leave the local app running, update the reusable build prompt and scope handoff, export a clean source ZIP, and push authorized progress to https://github.com/rudecoder-web/SYM-AI.git on classpocket-mvp with an updated pull request. Preserve the team's original planning document and history. Do not claim a public deployment until a public URL actually exists.


Current differentiator: add a weekly timetable with class names, subject tags, days, start/end times, IANA time zones and sharing codes. During class, recommend ONLY that subject; at the exact end, switch to the next active subject or return to a varied feed. Likes must not extend a class or produce a lingering subject boost. Validate overlaps and preserve schedules on the server. Teachers can publish managed schedules; linked students cannot edit, replace or unlink them without teacher access. Personal schedules remain editable and shareable. Label guest/shared-password controls as a demo, not production parental identity or tamper-proof enforcement. Include an explicit local judge preview clock and a return-to-real-clock action.

Replace Activity with Friends: create an invitation room from a saved custom draft or published gizmo, copy its actual link/code, join from another browser, persist actual memberships, and open the shared snapshot with independent controls. Do not claim synchronised multiplayer or send messages automatically.

Add Studio Ideas, Images, Sounds, Make Image and Videos in the supplied screenshot style. Hardcode curated samples, but make selections, playback and downloads real. Use original SVG images, playable WAV sound and an actual WebM clip. Make Image selects a labelled sample rather than pretending to call AI. Preserve the existing creator and add subject editing for custom gizmos.

Deliver a tested public judge URL as well as localhost. A temporary Cloudflare tunnel to a separate demo database is acceptable if its laptop/process lifetime and changing hostname are explicit. Provide a restart script, keep real classroom records separate, and do not claim permanent hosting. Treat redirecting 20% of wasted attention as an ambition, not a measured outcome; do not claim dopamine-baseline protection from an untested prototype.


Before Home, show a personalised schedule-entry popup. Read the actual saved timetable and time zone: during a class, name its subject, times and upcoming classes; without an active class, honestly introduce the Physics demo. Keep the feed unmounted until the user enters, support keyboard focus, and reintroduce the popup when the class period changes. Do not fake a Physics class outside scheduled time. Keep a clearly labelled judge preview clock. All twenty built-in gizmos are Physics-only for this demo; other class subjects must show an honest empty state. Do not replace the twenty engines with quiz questions or merely retag unrelated content. Add real light mixing, solar power, splitter-energy, free-fall energy, frequency/rhythm, force/coast and radioactive-decay interactions. Give every post a concise concept, suggested experiment and model boundary.
