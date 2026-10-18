# Absurd setup, real scientific decision

ClassPocket's education loop is **hook → configure → predict → observe → explain → retrieve in a new situation**. The joke gives the scientific problem a memorable setting. Completing a mission requires applying its rule; remembering a character's name does not solve it.

The default Home collection now contains ten authored physics experiments. Students move a force along a lever or change its strength, predict which way the beam turns, and run the experiment. Both the physical goal and the prediction must match. Feedback calculates both moments with units and explains the consequence. A larger force does not automatically win: perpendicular distance matters. The visible tipping animation illustrates the direction of net moment, not a quantitative dynamics simulation. The pivot is fixed and frictionless and beam weight is ignored.

Chemistry is a separate ten-play session. The electron goblin changes electron counts while protons stay fixed. Students build a requested neutral atom or ion, predict the charge sign, and see proton − electron arithmetic. Isotope scenarios vary neutron counts without changing the element. Dot locations are explicitly a counting model, not electron trajectories or atomic scale.

Each set starts with a discover mission, revisits the rule in several remixes, includes later recall missions, and ends in three transfer scenarios. Hints are available but not automatically shown. This is within-session retrieval, not an implemented schedule of spaced practice over days. Teacher results store the chosen setup and prediction, including wrong attempts, rather than counting a click or a guessed outcome as completion.

The Home physics feed is free play. Likes, comments, saves and reposts use the existing social persistence. Open a topic session to save assigned study progress. Topic sessions still require ten correct experiments, preserve completion when ten optional replay scenarios are requested, and switch subjects only after the student chooses. Old published classes keep their original snapshots. New included demo codes are `PHYS02` and `CHEM02`.

## Evidence and limits

The design draws on evidence for curiosity and retrieval, but its effectiveness must be tested with students. In a trivia experiment, curiosity was associated with later answer memory ([Kang et al., 2009](https://authors.library.caltech.edu/records/9f1n0-x0z52)). Experiments on prose learning found a delayed retention benefit from retrieval practice ([Roediger & Karpicke, 2006](https://pubmed.ncbi.nlm.nih.gov/16507066/)). Neither study tested ClassPocket, absurd game hooks, or this feed.

Humor is not sufficient evidence of learning. A genetics classroom study found memorable interesting details without a corresponding quiz-score improvement; it also discusses conflicting laboratory findings ([Maloy et al., 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6755318/)). Our design inference is to make the unusual event carry the actual causal relationship, then check transfer beyond the joke.

A useful pilot would compare the same lesson content, interaction time and feedback with and without these hooks, then assess fresh problems immediately and after a delay. Record hint use and first attempts separately. Do not equate scroll time, completed missions or retries with demonstrated retention.

## What is authored versus automatic

These twenty experiments are authored, reusable engine configurations. No model calls or arbitrary generated code are involved. Teachers can edit hooks, mission wording, memory cues and explanations, preview all experiments, and review the exact lesson source before assigning. Engine parameters and prediction categories remain fixed in this MVP editor so wording edits cannot silently change the scientific grading rule.

Arbitrary pasted notes and PDFs still produce source-matching Concept Courier drafts. This preserves actual source support rather than inventing an absurd scientific simulation from unrelated material. Automatic authoring of source-grounded hooks and supported engine parameters is future work. Optional batches replay reviewed scenarios with new IDs and order; they do not claim to add ten new concepts.

## Verification on the development host

Production build and TypeScript checks pass. Thirteen focused unit tests pass, including all twenty solvable scenarios, invalid identities, unreachable goals, locked-control bypasses, wrong predictions and legacy source matching.

Verified with headless Edge at phone and desktop sizes: tests/science-feed.ts, tests/study-journey.ts, tests/social-browser.ts and tests/social-navigation.ts. These cover actual beam and atom controls, wrong attempts, required completion, optional practice, topic switching, teacher publication and results, immutable snapshots, PDF extraction, persisted social actions, capture, direct links, original playground engines and creator ownership. The remaining nine physics assignments in the journey use the real attempt API; they are not claimed as human learning evidence. Screenshots were inspected. No physical-phone or retention study has been conducted.
