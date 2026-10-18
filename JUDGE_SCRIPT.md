# Three-minute judge script

Setup: the deployment has `DEMO_MODE=true`, and a teacher account was created with `npm run admin:teacher`. Use two browsers: **A** (your laptop) and **B** (a phone or private window). If AI isn't configured, say so and show the template route in step 4.

**0:00 – The bell-aware welcome (30 s).** Open the site in A. Before the feed mounts, a welcome dialog greets you: "Hey, you! Your Physics feed is ready." Open **Review my timetable → Judge demo clock → 09:10 Physics** and close the sheet. The dialog changes to "It's your *Physics* class. Time to learn Physics!" with the class time, time zone and the next class. Press **Let's learn Physics**.

**0:30 – Three contrasting interactions (40 s).**
1. *Particle Universe*: drag the force field, then tap **Burst**.
2. *Electron Goblin*: tap **+ electron**. The readout says "3 protons − 4 electrons = −1 charge".
3. *Lunar Drift*: hold **Thrust**. The HUD shows real m/s, g = 1.62 m/s² and seconds of fuel.

Point out that each post has a concept, "Why it happens" and honest model assumptions.

**1:10 – The bell switches the feed (25 s).** Choose **09:50 Chemistry** on the demo clock. The welcome reappears for Chemistry, and the feed shows "Chemistry is on your timetable. There is no Chemistry content here yet", not Physics in disguise. Explain that the server applies this rule from its own clock, so the preview can only narrow the feed and never unlock another subject during a real class. Choose **12:50 Free time**, then **Use real clock**.

**1:35 – Describe it, play it, change it (50 s).** Go to **Studio** and type "Make a planet where a cat jumps ridiculously high" → arrow → **Create with AI**. Show "What changed", the AI label and the provider/model line, then press **Jump**. Type "Make it Mars, add a spring launch pad and make the cat orange" → **Change it with AI**. The diff reads "Gravity: … → 3.71 m/s²" and shows the spring pad, and the cat is now orange. The readout recomputes v and h = v²/2g. Point out the "Not built" list and **Undo this change**. Press **Publish gizmo**.

**2:25 – A friend joins the snapshot (25 s).** In A, go to **Friends**, choose the gizmo and tap **Create invite link**, then send the link to B. In B, tap **Join gizmo room**: it shows "You joined this room · 2 people". Open the gizmo. Point out that it's the same frozen snapshot with independent controls, not synchronised multiplayer. A shows 2 people within five seconds.

**2:50 – Close (10 s).** "Implemented: Supabase persistence with RLS, a server-enforced timetable, AI drafts validated against tested formulas, rooms. Authored: the twenty demo posts. Future: guardian relationships, synchronised play, media generation." Point to FEATURE_STATUS.md.
