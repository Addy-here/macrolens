# Macrolens — Product Spec

## Vision

A food & weight tracker that removes the two biggest sources of friction in
existing apps: **manual portion estimation** and **rigid, non-adaptive
targets**. Take a photo, review an AI-generated estimate, adjust if needed,
done. Weekly targets adapt to your actual measured progress, not a static
formula set once at onboarding.

## Competitive landscape (researched Oct 2026)

| App | Strength | Weakness we avoid |
|---|---|---|
| **Cal AI** | Fast photo→diary flow, huge MyFitnessPal DB | Auto-commits AI estimate with no review step; no adaptive coaching |
| **MacroFactor** | Adaptive TDEE recalculated weekly from real trend data; mandatory review ("Plate view") before saving | No free tier; fewer automated photo pipelines than Cal AI in some reviews |
| **Cronometer Gold** | Deep micronutrient tracking (95+ vitamins/minerals) | Less streamlined photo flow |
| **SnapCalorie** | LiDAR-based physical portion sizing on Pro iPhones | Device-dependent, not universal |

**Macrolens' position:** MacroFactor's adaptive-coaching + mandatory-review
philosophy, Cal AI's fast single-photo flow, SnapCalorie's portion-size
rigor where device support allows, Cronometer's micro-nutrient depth — in
one app, wrapped in an iOS 18 "Liquid Glass" visual language.

## v1 scope (per user: build everything, no phased cut)

1. **Food photo logging**
   - Take/upload a photo of a plate or product.
   - Cloud vision AI (see `docs/DECISIONS.md` for provider) identifies food
     items and estimates portion sizes.
   - **Mandatory review screen** before saving: user sees detected items,
     estimated weights/portions, can edit quantity, swap an item, or add a
     missed item, before anything is written to the log. (Non-negotiable —
     this is Macrolens' main differentiator vs. Cal AI.)
   - Resulting macros (protein/carbs/fat/calories) and key micros
     (fiber, sugar, sodium, and a configurable extended set) attached to the
     log entry.

2. **Describe logging — say or type it** (the primary path since 2026-10-29)
   - Tap the mic and say what you ate, or type it: “two scrambled eggs, a
     slice of sourdough with butter and a flat white for breakfast”.
   - On-device speech recognition; foods resolve live, as you talk, from an
     on-device food reference (~170 foods with natural units), so it works
     with no API key and offline. Meal and day are read from the words
     (“yesterday for dinner”).
   - Words the reference doesn't know go to the user's AI provider (text,
     so Anthropic works too); without a key they wait on the review sheet
     to be matched.
   - With a key, a shaky instant match (unknown words, foods run together)
     goes to the AI as a whole sentence; “Use as heard” keeps the instant
     version. Simple meals stay instant and free.
   - **My Foods:** foods you create, nutrition you correct, and AI estimates
     you log are matched before the built-in list; words you resolve with
     “Find it” map to that food from then on.
   - Search, quick add, photo, and “log again” complement it. Barcode is
     still a stretch goal.
   - Data lives on the phone; Export/Import backup keeps it across
     reinstalls until there's a backend.

3. **Macro & micro tracking**
   - Daily rings/bars for calories, protein, carbs, fat.
   - Expandable micro panel (fiber, sugar, sodium + user-selected extras).
   - Weekly trend views, not just a daily snapshot.

4. **Weight tracking**
   - Daily/periodic weight entry.
   - Trend-line smoothing (exponentially weighted moving average, not raw
     day-to-day noise) — this is what feeds the adaptive plan engine.

5. **Adaptive weight-loss plans**
   - Onboarding: goal weight, timeline preference, activity level, starting
     stats → initial calorie/macro targets (Mifflin-St Jeor or similar BMR
     formula × activity factor, then a deficit sized to the user's weekly
     rate goal).
   - **Weekly recalculation:** compare actual weight trend + actual logged
     intake against predicted, adjust next week's targets accordingly
     (MacroFactor-style adaptive TDEE). This is the "plan" — not a static
     PDF, a living number that updates.
   - Plan screen shows: current targets, why they changed this week (plain
     language: "You lost less than expected, so we trimmed 80 kcal/day"),
     and a projected trend line to goal.

6. **Plan and settings — the basic suite** (2026-10-30)
   - Plan editor: lose / maintain / gain, goal weight, pace, body, activity,
     macro presets (balanced, high protein, low carb, low fat, keto) or a
     custom split, a custom daily target, and extra calories on weekends.
   - Measured maintenance and a weekly check-in that proposes the next
     target and says why.
   - Weigh-in history with edit and delete; weigh-ins on any past day.
   - Units for everything: kg / lb / st, cm / ft in, kcal / kJ, g / oz,
     ml / fl oz. Week starts Sunday or Monday.
   - Meal and weigh-in reminders, skipped once that's logged.
   - Water tracking on Today.
   - CSV export and Delete All Data, beside backup and restore.

7. **iOS "Liquid Glass" UI**
   - See `docs/DESIGN-SYSTEM.md` for the full spec. Short version: frosted
     translucent surfaces (BlurView), soft depth/shadow, SF-Pro-like
     typography, spring-based motion, dark-first.

## Explicitly out of scope for v1 (flag if this changes)

- Social features / friends / leaderboards (Cal AI has this, we're not
  copying it — it dilutes the "quiet, focused tool" positioning).
- Barcode scanning is a stretch goal, not a blocker for v1 ship.
- Android app (React Native supports it, but iOS glass UI is the design
  target; Android gets a plainer fallback theme later, not now).
- Wearable integrations (HealthKit read/write) — v2.

## Open questions to validate as we build

- Exact vision AI provider (cost vs. accuracy) — tracked as an ADR.
- Whether micros come from the vision model's own estimate or a lookup
  against a nutrition database keyed by the identified food item (likely
  the latter — vision models are not reliable for micronutrient figures).
