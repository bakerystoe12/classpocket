# Exact build prompt

Copy everything below into a coding agent. Attach the eight UI references if available.

---

Build and run a working mobile-first social app called **ClassPocket**. Keep the name configurable. The product is Instagram/TikTok for playable gizmos: each post is a little interactive game, simulation, creative tool, or satisfying toy that you can play directly inside the feed.

The primary experience is a social feed of playable worlds. Learning can happen through experimentation, cause and effect, and making things. Do not turn the product into a quiz app, flashcards, a teacher dashboard, or a sequence of question cards. Do not put a “check answer” button or a paragraph of lesson text in every post. Do not stop at a mockup, a landing page, animated screenshots, or game thumbnails that are not playable.

Use the attached screenshots as the visual direction:

- Image 1: Home feed. Black background, compact header with menu, centered wordmark and search. A large rounded playable canvas dominates each post. Directly below it: familiar social actions, then creator avatar/handle/title/caption. Vertical discovery, one main playable post at a time.
- Image 2: Studio. Dark creator workspace with a two-column grid of projects, version counts, a way to start from an idea, and a prominent create button.
- Image 3: Activity. Friend activity, follow suggestions, avatars, clear follow buttons. Separate explicitly seeded demo scenarios from actual recorded actions.
- Image 4: Profile. Username, settings, avatar, bio, followers/following, edit/share buttons, and tabs for created, liked, saved, and reposted gizmos. Use an intentional empty state when there is no content.
- Image 5: Post action bar: like, comment, repost, share/send, bookmark/save, capture, and sound. Add a more menu with remix, sharing, capture, and hide.
- Images 6–8: Reference examples of the sort of content that belongs in the feed: a responsive particle universe, a lunar lander with real thrust/rotation/velocity, and a drag-to-mow lawn toy. Create original implementations rather than embedding the screenshots as games.

Use a rounded floating bottom navigation pill with Home, Studio, Activity, and Profile, plus a separate circular + button. Keep it visible and reachable. Make the app look like a social product people would voluntarily play with. Use black, charcoal panels, restrained borders, white type, and colorful gizmos. Do not reproduce an operating system status bar. On desktop, center the mobile feed with understated supporting rails; retain the same product experience.

Implement **exactly ten original, hardcoded playable gizmos** for the included MVP collection:

1. **Particle Universe:** hundreds of luminous particles responding to pointer/touch movement, attraction and swirling trails; burst and palette controls.
2. **Lunar Drift:** a lunar lander with gravity, velocity, fuel, rotation and hold-to-thrust controls. Detect a gentle upright landing on the marked pad versus a crash. Restart works.
3. **Touch Grass:** drag a mower around a striped lawn. The mowed area remains visibly cut, progress reflects the actual cleared cells, and reset restores the lawn.
4. **Pocket Factory:** a small idle coin factory with visibly falling coins and conveyors. Drop coins, earn only when coins arrive, and buy value/automation upgrades using actual earned game currency. Game coins have no monetary value.
5. **Gravity Garden:** a miniature gravity sandbox where touches add orbiting bodies and dragging affects a gravity well. Use a coherent simplified physics model.
6. **Wave Playground:** two continuously rendered waves and their combined waveform. Pointer position changes frequency/amplitude; phase and pause controls change the actual simulation.
7. **Orbital Shot:** pull back and release to launch a body around a planet toward a target ring. Gravity curves the trajectory; detect hits/misses and support retries.
8. **Midnight Run:** a neon lane-driving game. Drag or steer with buttons/keys, dodge generated traffic, collect rings, keep an actual score, and detect collisions.
9. **Liquid Light:** a luminous flowing paint toy. Drawing creates fading particle trails, with working palette and clear controls.
10. **Spring Theory:** a connected spring mesh you can pull and release. Deformation must propagate through simulated springs and settle with damping.

Every gizmo must be genuinely interactive and have a distinct visual identity, short in-context controls, restart, and a concise how-to hint. Use Canvas/SVG/WebGL as appropriate. Do not substitute ten reskins of one quiz engine. Supply touch, mouse, and practical keyboard alternatives. Use explicit controls where holding or dragging matters. Let scrolling outside the interactive canvas move through posts; canvas input should control the game rather than accidentally scrolling. Preserve each canvas's state while scrolling through the feed. Pause simulation loops for offscreen posts and clean up listeners. Respect reduced-motion settings. Audio starts muted; sound only begins after an explicit user gesture.

Implement working social behavior:

- Like/unlike, save/unsave, repost/unrepost, and follow/unfollow persist on the server and update the UI.
- Comments can be written and persist; no fake comment-post success.
- Use native sharing where available with clipboard fallback, and a stable direct link that opens the chosen gizmo.
- Capture downloads a real image from the current canvas.
- More menu allows remixing into an independent project and hiding a post for the visit.
- Search finds posts and creators. Following filters the feed to followed creators.
- No invented engagement counts. Counts start at zero and change only from recorded actions. Label the included personas as demo creators.

Studio must let anyone create without needing a teacher login. For the no-key MVP, provide a clearly labelled template-based creator: a prompt matches to one of the ten supported engines, then opens a live playable preview. Let the creator change name, caption, engine, accent, speed, and instructions, save drafts, publish to the feed, remix another post with attribution, and restore previous saved versions. Offer explicitly supported local quick edits such as faster/slower and color changes. Clearly state that this is template matching, not arbitrary AI code generation. Do not pretend to generate custom software from any prompt if no model integration exists. A genuinely configured AI integration can be added separately after this complete journey works.

Activity should include actual recorded actions and explicitly labelled sample friend scenarios. Profile should reflect real creations, likes, bookmarks, reposts, and follows for the active session. Editing and sharing a profile should work. If using guest profiles for the MVP, explain that the browser owns a persistent guest profile; do not imply production authentication or cross-device recovery.

Technical requirements:

- Inspect the existing repository and use its conventions. If starting fresh, use Next.js, React, and TypeScript.
- Persist profiles, reactions, comments, follows, posts, drafts, versions, and activity on the server. SQLite on a persistent Node host is suitable without hosted database credentials. Keep owner checks on edits/restores so another browser cannot modify someone else's project.
- Validate supported gizmo definitions before storing or rendering. Never evaluate arbitrary untrusted JavaScript.
- Do not overwrite the existing classroom data if evolving an earlier ClassPocket app. Move the previous teacher tools to a secondary `/classroom` route; Home must open the new social feed.
- Make routine choices yourself. Do not require a paid API key for the ten playable demos or the template creator.

Run the app and verify it. Test all ten engines, mobile layout, navigation, search, following, likes, comments, saves, reposts, sharing, capture, sound toggle, Studio creation/editing/version restore/publishing/remixing, profile editing, reload persistence, and owner isolation from a separate browser context. Fix failures before finishing. Inspect screenshots and check for horizontal overflow and browser runtime errors. Keep test records separate from demo/classroom data.

Deliver the running URL, startup instructions, a short explanation of what works, and honest boundaries of the MVP. Include this exact prompt as a reusable Markdown file. Do not claim features passed checks you did not run.

Additional implementation requirement: focused topic sessions

Keep the social-play interface and add a school/parent-oriented session layer. A teacher uploads PDF slides or pastes notes, reviews at least ten source-linked mission definitions, and publishes a fixed class assignment. Start with one genuinely playable educational engine, reused with data; do not generate ten arbitrary programs. Preserve original page references and require teacher review. Without AI credentials, use honest extractive template filling and included synthetic samples. Label repeated concepts and never claim unsupported semantic generation.

Students join by code/link and nickname, play the required ten in the same topic, and can finish their assigned study. Offer an explicit “Add 10 more” action for optional same-topic practice; preserve required completion, and switch categories only through a deliberate student action. Save attempts, runs, category/source references and completion on the server. Provide teacher results without invented statistics or claims of proven understanding. Keep custom AI games/subscriptions as declared future scope unless actually implemented.

Read the linked hackathon handbook. Prepare an accurate Working/Partial/Mocked-Planned declaration, short description, dependencies disclosure, live demo walkthrough, source export, and honest architecture limits. A local URL does not count as public hosting. Push to the team’s specified GitHub repository once its destination and access are available; exclude credentials, local databases, dependency folders and QA data. Do not claim research evidence or classroom effectiveness beyond the conversations and tests actually performed.


Educational revision (takes precedence over the generic default feed):

Make the DEFAULT feed a focused collection of ten educational experiments on one topic. Keep the social shell and move the generic toys under an explicit Playground choice. Give every educational gizmo an absurd hook that embodies the scientific relationship, then require the player to change a meaningful system, predict its result before seeing it, observe the outcome, and receive concise causal feedback with units and a source. Revisit the same rule later and finish with new-context transfer. Do not complete a mission based on a clicked answer alone.

Author ten moments/turning-force scenarios using a goose and ridiculous loads. Vary force and perpendicular distance; compare opposing moments with the correct direction. Include fixed-control scaffolds and a final transfer task without an automatic formula hint. Use a fixed frictionless pivot and ignore beam weight. Animate the direction of net moment, without pretending that illustration is a full dynamics model.

Author a separate ten-scenario atomic-charge session: change electrons while keeping protons fixed; predict positive/neutral/negative; calculate charge = protons minus electrons. Include neutrons/isotopes as a misconception check. Keep element identities scientifically correct and label electron dots as a counting model.

Validate experiment configurations and predictions on the server. Record wrong attempts. Keep old snapshots playable. Allow teacher hook, memory-cue and feedback editing, preview and reviewed publication. Keep arbitrary PDF uploads honest: source-matching drafts until supported scientific scenarios are actually authored, never fake automatic simulations. Make no claims that absurdity alone guarantees recall. Document curiosity/retrieval research as design inspiration and propose delayed transfer evaluation. Preserve the ten-required/optional-ten topic flow.
