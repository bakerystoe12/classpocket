> **Historical document.** This describes the earlier SQLite / tunnel demo. The current app runs on Vercel + Supabase (+ optional Groq) — see [README.md](README.md), [DEPLOYMENT.md](DEPLOYMENT.md) and [FEATURE_STATUS.md](FEATURE_STATUS.md). Links such as temporary tunnel URLs and the shared demo teacher password below no longer apply.

# Physics demo and schedule welcome

The current judge catalogue contains twenty different Physics interactions. The twenty existing IDs and engine types are retained; the catalogue has not become a set of multiple-choice questions.

Home first checks the saved timetable and shows a welcome before mounting any feed posts. During Physics it greets the current profile, names the class and start/end times, explains that the feed will move on at the bell, and shows up to three upcoming classes. Between classes or without a saved timetable it honestly introduces the Physics demo instead of inventing a class. The entry popup appears again when the class period changes or on a new page visit, rather than on every Home navigation. Its buttons support keyboard focus and a focus trap. The judge clock remains clearly labelled as a preview.

## What changed in the gizmos

- The lawn toy measures sampled path length and work for a constant 20 N push; the token factory explains a gravitational potential-energy budget; the racer now uses an inertial steering response.
- The RGB mixer overlaps red, green and blue screen light. The solar sculpture converts irradiance and panel area to power and collected energy at a fixed 20% efficiency.
- The recursive laser diagram divides a 100 mW input between ideal 50:50 beam splitters. The sequencer separates oscillator frequency from rhythm timing.
- The time scrubber follows a 1 kg object falling from 10 m, displaying height, velocity and conserved potential-plus-kinetic energy.
- The command-remix toy programs push/coast sequences for a frictionless puck; a coast preserves velocity. The former coin toy now simulates radioactive half-life with independent decay events.
- The force-field, lander, gravity garden, wave mixer, orbital shot, light drawing, spring mesh, electric-charge model, ideal circuit and solar-system explorer retain their interactions with explicit Physics explanations.

Every built-in post has a visible Physics concept, a suggested experiment, and an expandable explanation/model boundary. Illustrative simulations are not represented as calibrated scientific software. The model assumptions and formulas live in lib/physics-demo.ts; the catalogue’s hooks/prompts live in lib/gizmos.ts.

## Judge flow

Open the public demo or localhost. The entry welcome appears before the feed. Use **Review my timetable**, choose **Use demo school day**, save, then select **09:10 Physics** and close the timetable. The popup now says it is Physics class; **Let’s learn Physics** enters all twenty interactions. Try the light mixer, solar sculpture, free-fall scrubber and Newton command remix as contrasting examples.

The timetable remains subject-specific. The current catalogue is Physics-only, so previewing Chemistry gives its own schedule welcome and a clear unavailable-content state, rather than leaking Physics into that class. Secondary teacher-assigned study sessions remain separate. Existing custom projects and published class records are preserved.

The public address remains a temporary tunnel requiring the laptop, server and tunnel to stay online. See TIMED_FEED.md and scripts/start-public-demo.ps1 for restarting it.

## Checks

The focused unit suite validates twenty distinct Physics concepts, RGB combination, power response, free-fall energy conservation, force/coast velocity changes and welcome period boundaries. tests/physics-welcome.ts verifies the pre-feed gate, focus behaviour, personalised and preview greetings, different working physics controls, class changes and an honest next-subject empty state. Existing social, invitation and teacher-session checks are retained with the welcome accepted explicitly.

Verified for this revision: production build and TypeScript, 23 focused tests, the full welcome/Physics journey both locally and through the public HTTPS origin, plus the retained timetable/invitation and social browser/navigation journeys. Mobile and desktop screenshots were inspected.
