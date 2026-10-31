# Macrolens — Architecture Decision Records

Append-only log. Each entry: date, decision, why, alternatives considered.
Don't edit old entries to "fix" them in place — add a new entry that
supersedes the old one and link back to it.

---

## 2026-10-28 — Platform: React Native via Expo

**Decision:** Build on Expo (managed workflow) rather than bare React
Native or native Swift/Kotlin.

**Why:** User specified React Native. Expo gives faster iteration
(`expo start`, OTA updates, EAS Build for store submission) and has
first-party modules for everything v1 needs (camera, image picker, blur,
haptics) without ejecting to bare RN. If a v2 feature needs a native module
Expo doesn't support, we can eject or use a config plugin at that point —
not a blocker now.

**Alternatives considered:** Bare RN (more control, more setup cost, not
needed yet). Native Swift/SwiftUI (best possible iOS fidelity for the glass
UI, but throws away RN's stated requirement and cross-platform option).

---

## 2026-10-28 — UI library approach: hand-built glass primitives, not a UI kit

**Decision:** No off-the-shelf "glassmorphism" npm package. Build our own
`GlassCard`/`GlassButton`/etc. primitives in `src/components/glass/` on top
of `expo-blur`'s `BlurView` + `expo-linear-gradient` for highlight edges.

**Why:** Existing glassmorphism RN libraries are mostly unmaintained or
produce the dated "2020 glassmorphism" look (flat frosted boxes), not the
iOS 18 "Liquid Glass" look (specular highlights, depth, lensing/refraction
cues, spring motion). That look needs custom composition of blur + gradient
+ shadow + Reanimated-driven motion that a generic kit won't give us
control over. See `docs/DESIGN-SYSTEM.md` for the spec being implemented.

**Alternatives considered:** `react-native-glassmorphism`-style packages
(rejected, low quality/unmaintained). `expo-glass-effect` (Expo's newer
native UIKit UIGlassEffect wrapper, iOS 26+ only) — worth revisiting later
as an optional "true native glass" path on supporting OS versions, but it's
not broadly available yet and we need one codebase that works across iOS
versions now.

---

## 2026-10-28 — State management: Zustand

**Decision:** Zustand for client state (food logs, user profile, plan
targets), one store per domain.

**Why:** Minimal boilerplate vs. Redux, good TS support, no Context
re-render cliffs. App's state shape is a handful of independent domains
(logs, user, plan, UI/session) that don't need a single global store —
Zustand's multi-store pattern fits that naturally.

**Alternatives considered:** Redux Toolkit (more ceremony than this app
needs). React Context + useReducer (fine for v1 scope too, but Zustand's
selector-based subscriptions avoid extra re-render tuning work later).

---

## 2026-10-28 — Backend: full custom backend (Node/Express), decided by user

**Decision:** Dedicated backend service, not local-only storage or a
pure BaaS (Supabase/Firebase) as the primary store. User explicitly chose
"full backend... needed for sync across devices, auth, cloud AI calls."

**Why it matters architecturally:** The vision AI call MUST go through our
backend (never embed a vision-provider API key in the RN app bundle — it
would be extractable). This decision was made regardless of BaaS vs custom,
but a custom backend makes the server-mediated AI call path the natural
default rather than something bolted onto a BaaS.

**Status:** Backend not yet scaffolded as of this entry. Next decision
needed: Express + which DB (Postgres via Prisma is the likely default for
a nutrition/time-series data model — weight logs and food logs are
naturally relational/time-series) — to be recorded as its own ADR when
built.

**Alternatives considered:** Supabase (would've been faster to stand up
auth+DB+storage, but user wants full backend control, likely for the AI
call proxying and custom business logic around adaptive plan calculation).

---

## 2026-10-28 — Food photo AI: cloud vision API, decided by user

**Decision:** Cloud AI vision API for photo→food identification and
portion estimation (not on-device TFLite, not manual-only v1).

**Why:** User explicitly chose this for best accuracy. Matches what the
competitive research shows as current best practice (Cal AI, MacroFactor,
IntakeAI, SnapCalorie — the whole leading cohort uses cloud vision models,
not on-device ML, for the core recognition step).

**Still open:** Exact provider. Candidates: GPT-4o/GPT-4.1 vision,
Claude vision (Anthropic), or a food-specialized API (LogMeal, Foodvisor).
General-purpose LLM vision (GPT-4o/Claude) is likely the pragmatic v1
choice — good accuracy, no extra vendor integration, and we already route
through our own backend so swapping providers later is a backend-only
change invisible to the app. Record the final pick as a follow-up ADR
once backend work starts.

---

## 2026-10-28 — Added `react-native-worklets` peer dependency

**Decision:** Added `react-native-worklets` alongside `react-native-reanimated`.

**Why:** `expo-doctor` flagged it as a required peer dependency of the
Reanimated version pulled in by this Expo SDK — without it the app can
crash outside of Expo Go (dev client / production builds). Pure
housekeeping, not a design choice, logged for completeness since it
affects the dependency graph anyone building on this repo should be aware
of. `npx expo-doctor` now reports 20/20 checks passing.

**Micronutrients:** Vision models are not reliable sources for precise
micronutrient values. Planned approach: vision model identifies the food
item + estimated portion weight; backend then looks up matching
macro/micro data from a nutrition database (e.g. USDA FoodData Central)
keyed by the identified food, scaled by portion. To be finalized as its
own ADR when the backend's nutrition-data layer is built.

---

## 2026-10-29 — Bugfix: infinite render loop in HomeScreen (Zustand selector)

**Symptom:** iOS simulator crashed on launch with `ERROR The result of
getSnapshot should be cached to avoid an infinite loop` followed by
`Maximum update depth exceeded`.

**Root cause:** `HomeScreen` selected `useFoodLogStore((s) =>
s.totalsForDate(todayIso))`. `totalsForDate` runs a `.reduce()` and
returns a freshly-allocated object on every call. Zustand (via React 18's
`useSyncExternalStore`) compares the selector's return value by reference
to decide whether to re-render; a new object every time looks like a
perpetual change, so it re-renders forever.

**Fix:** Subscribe to the raw `entries` array from the store (stable
reference — identity only changes on actual mutation) and compute
`totals` in the component with `useMemo`, not inside the store selector.

**Rule going forward:** Zustand selectors must return either a primitive
or a reference that's actually stable (state slices, not derived
computations). Any `.map()`/`.filter()`/`.reduce()` that builds a new
array/object belongs in a `useMemo` in the component (or a memoized
selector library like `zustand/shallow` / `reselect`-style helper if this
pattern recurs), never inlined in `useStore(s => s.someComputedThing())`.
`entriesForDate`/`totalsForDate` stay on the store as imperative helpers
(fine for one-off, non-reactive reads via `getState()`) but are now
documented as unsafe to use as a reactive selector — see the comment on
`useFoodLogStore`.

---

## 2026-10-29 — Switched glass UI to native `expo-glass-effect` (real Liquid Glass)

**Problem:** The original glass components (`GlassCard`, `GlassButton`,
`GlassSheet`) were built entirely from `expo-blur`'s `BlurView` +
`expo-linear-gradient` highlight. That recipe is a drawn approximation —
flat blur + translucent fill + gradient — and visibly reads as "frosted
grey box," not Apple's actual Liquid Glass material (dynamic specular
highlights, light refraction that responds to content behind it).

**Decision:** Adopted `expo-glass-effect` (`GlassView`/`GlassContainer`),
which wraps iOS 26's native `UIVisualEffectView` Liquid Glass APIs
directly — this is the real system material, not a reproduction. Used on
all 3 glass primitives plus the tab bar background. Added `expo-symbols`
for SF Symbols tab icons (native iOS iconography, not emoji/vector
approximations) and `expo-image`/`expo-font` as supporting deps.

**Fallback strategy:** `GlassView` only renders the native material on
iOS 26+. Every component checks `Platform.OS === 'ios' &&
isLiquidGlassAvailable()` and falls back to the original BlurView recipe
otherwise (older iOS, Android, web) — so the old implementation isn't
deleted, it's demoted to the fallback path.

**Added `SettingsScreen`:** the app previously had no way to set or edit
weight-loss goals at all (height, current/goal weight, target weekly
rate, activity level) — users were stuck with whatever `BLANK_PROFILE`
shipped with. Added as a 4th tab. Saving goals now also seeds an initial
`AdaptivePlan` via `src/utils/planCalculator.ts` (Mifflin-St Jeor BMR +
activity multiplier + weekly-rate-to-deficit conversion) so the Plan tab
isn't empty before any backend recalculation has run. This calculator is
explicitly a placeholder — final adaptive logic belongs server-side per
the original backend ADR.

**Added photo-upload affordance:** `CameraScreen` already had a
`launchImageLibraryAsync` call wired up but it was labeled "Choose from
Library," easy to miss as a camera alternative. Relabeled to "Upload a
Picture" and restructured the screen's action buttons to show
Analyze/Retake once a photo is selected, rather than always showing both
capture entry points.

---

## 2026-10-29 — Migrated navigation to `expo-router` + `NativeTabs` (real system tab bar)

**Problem:** The `@react-navigation/bottom-tabs` + `GlassView`-as-background
tab bar was still a hand-assembled approximation — a JS-rendered view
trying to look like the system tab bar, not the actual
`UITabBarController`. That approximation had a concrete, user-reported
consequence: screen content (notably the "Upload a Picture" button on
`CameraScreen`) could render underneath the floating bar because padding
had to be manually guessed (`insets.bottom + <magic number>`) rather than
the OS reporting real content-inset space.

**Decision:** Migrated to `expo-router`'s file-based routing with the
stable `NativeTabs` API (`expo-router/native-tabs`, promoted from
`unstable_native-tabs`). `NativeTabs` renders the real native
`UITabBarController` on iOS — on iOS 26 devices this automatically
produces the system floating Liquid Glass pill tab bar with zero manual
styling, and more importantly the OS itself manages safe-area/tab-bar
content insets, so a screen's content physically cannot render under the
bar — the overlap bug class is closed structurally, not papered over with
padding constants.

**What changed:**
- `app/_layout.tsx` (new root layout, replaces `App.tsx`) — wraps
  `GestureHandlerRootView` / `SafeAreaProvider` around an `expo-router`
  `Stack`.
- `app/(tabs)/_layout.tsx` — the `NativeTabs` definition (4 tabs: Today,
  Log, Plan, Settings) using real SF Symbols via the `sf` icon prop.
- `app/(tabs)/{index,log,plan,settings}.tsx` — thin route files that
  re-export the existing named screen components unchanged
  (`HomeScreen`, `CameraScreen`, `PlanScreen`, `SettingsScreen`).
- Deleted `App.tsx`, `index.ts`, `src/navigation/RootNavigator.tsx` (dead
  code once `expo-router/entry` became the app's `main` entry in
  `package.json`).
- `app.json`: added `"scheme": "macrolens"` (required by expo-router for
  deep linking) and `"plugins": ["expo-router", ...]`.
- Simplified the manual `insets.bottom + <magic number>` padding hacks in
  `HomeScreen`/`PlanScreen`/`SettingsScreen`/`CameraScreen` back down to
  `insets.bottom + spacing.xl` — the native tab bar handles its own
  clearance now, these just need normal safe-area padding, not
  bar-height guessing.

**Verified:** `npx expo-doctor` 20/20, `npx tsc --noEmit` clean, `npx
expo start --web` bundles all 4 route files and the root/tabs layouts
with zero runtime errors (confirmed via direct bundle-compile curl
requests to bypass tunnel flakiness — see the Smoke-testing section of
`docs/AGENT-GUIDE.md`).

**Alternatives considered:** Keep `@react-navigation/bottom-tabs` and
just fix the padding math (rejected — treats the symptom, not the root
cause; still wouldn't produce the actual native floating pill, which was
the explicit ask: "I don't want pill to be made [by hand] — see if there
is a native way").

---

## 2026-10-29 — Apple Design Award criteria adopted as design guide

**Decision:** Use Apple's published Apple Design Award (ADA) judging
categories as an explicit design checklist for Macrolens going forward,
alongside MacroFactor as the direct functional-competitor benchmark. See
`docs/DESIGN-AWARD-CRITERIA.md` for the full criteria breakdown and how
each maps to a concrete Macrolens decision/action.

**Why:** User asked specifically to research what the App Store/Apple
Design Award rewards and use a named competitor's execution as a
reference, framed as "think of it like if Apple wanted to design an app
themselves how would they do it" — i.e. default to native platform
primitives and system conventions over custom-built UI wherever Apple
provides a real one (this directly motivated the `NativeTabs` migration
above).

---

## 2026-10-29 — Bugfix: `GlassCard` had no default internal padding (content rendering flush against rounded corners)

**Symptom (user-reported, screenshot):** `PlanScreen`'s "Weight trend"
card showed its caption text running right up against the card's bottom
rounded corner — visually read as "content spilling out of the card."

**Root cause, two compounding issues:**
1. `GlassCard`'s inner `content` View had **no padding at all** by
   default — every call site had to remember to add its own padding.
2. The `style` prop only reaches the card's **outer** wrapper (margin,
   width, etc.) — it is never applied to the inner content View. Several
   screens (`PlanScreen`, `FoodReviewScreen`) were passing
   `padding: spacing.md` through `style={styles.card}`, which silently
   did nothing — the padding never reached the children. `SettingsScreen`
   passed no padding at all anywhere. Both patterns produced the same
   "text flush against the edge" bug; it was only visually obvious on
   screens with short/single-line content.

**Fix:** `GlassCard` now takes an explicit `padding` prop (default
`spacing.md`) applied directly to the inner content View in both the
native-glass and BlurView-fallback render branches, so every card is
padded correctly out of the box with zero per-screen boilerplate. Cards
that need edge-to-edge content (e.g. `CameraScreen`'s photo preview)
pass `padding={0}` explicitly. Cleaned up the now-dead
`padding`/`paddingVertical` keys that were silently no-ops inside
`style={...}` across `HomeScreen`, `PlanScreen`, `FoodReviewScreen`.

**Rule going forward:** Any reusable surface/container component
(`GlassCard`, future `GlassSheet` call sites, etc.) must default its own
internal spacing — never require every call site to remember to pad
itself. If a component accepts both an outer `style` prop and needs
internal spacing, give it a **separate, explicitly-named prop** (e.g.
`padding`, not overloading `style`) so it's structurally impossible to
pass padding that silently gets swallowed by the wrong layer. Verify any
new "safe-by-default" component prop like this with a bare,
no-extra-props call site (e.g. `<GlassCard><Text>...</Text></GlassCard>`)
as part of the component's own visual check, not just the heavily-styled
call sites that happened to pad themselves by coincidence.

---

## 2026-10-28 — AI is bring-your-own-key until a backend exists

**Decision:** Photo analysis calls OpenAI or Anthropic directly from the
app, using a key the user pastes in Settings. The key is stored in the
iOS keychain via `expo-secure-store`, never in the log, and never shipped
inside the app. The user picks the provider. Defaults are `gpt-4.1-mini`
and `claude-haiku-5-5`. The estimate still cannot be saved until the
review sheet is confirmed.

**Why:** There is no backend yet, and the user asked to turn AI on by
letting people bring a key. That keeps a Macrolens-owned secret out of
the binary (the constraint in the 2026-10-28 vision ADR) while making
the photo flow real. A later backend proxy can replace the direct call
without changing the review-before-save rule.

**What else changed with this pass:** The app declares a dark interface
so the system tab bar uses dark Liquid Glass. The Log screen's pinned
buttons sit `spacing.xxl` above the tab-bar safe area, because iOS only
auto-insets the first ScrollView and a footer View was close enough to
the pill that taps could miss. `GlassCard` now stretches when given
`flex`, so the photo preview fills the space above those buttons. Goals,
the food log, and weigh-ins persist on device. Saving goals always
refreshes the starter plan.

**Alternatives considered:** Keep AI disabled until the Express backend
exists (rejected — the user wants the feature usable now). Embed one
shared API key (rejected — it would be extractable, which the original
ADR forbids).

---

## 2026-10-28 — Interface is a system list, not a branded poster

**Decision:** Supersedes the “glass card on every row” direction in the
2026-10-28 UI-library ADR and the coral-gradient notes in the old design
system. Screens are inset grouped lists on black. The native tab bar stays
Liquid Glass and is not redrawn. Blur is not applied to ordinary rows.
The action tint is system blue. Protein, carbs, and fat keep their own
colors. Passing a calorie target does not turn type red. Rules live in
`docs/DESIGN-SYSTEM.md` and `.cursor/skills/macrolens-design/SKILL.md`.

**Why:** The warm dark theme (brown canvas, apricot on every control,
glow behind the calorie number, slogan headers) read as a generic
generated skin. Foodnoms, MacroFactor, Fitness, and Gentler Streak share
a different bar: the log is the product, numbers are adherence-neutral,
and chrome should be the system’s. Those rules are fitted to our four
jobs — today’s meals, a photo that is reviewed before save, this week’s
target, and settings — rather than copied as layouts.

**Alternatives considered:** Keep refining the candlelit palette (rejected
— more of the same skin). Clone Foodnoms’ navigation (rejected — our log
is a photo task, not their search-first diary).

---

## 2026-10-28 — Light food log, after looking at the store screenshots

**Decision:** Supersedes the same-day “system list on black” entry. The
interface is light: grouped gray page, white cards, orange for actions
and the weight line, and four fixed nutrient colors on goal rings and on
each food. Today is a week strip, a 2×2 of rings, and breakfast / lunch /
dinner / snack. Log frames the photo. Plan draws a weight line once two
weigh-ins exist. `userInterfaceStyle` is light so the system tab bar
matches. Rules are in `docs/DESIGN-SYSTEM.md`.

**Why:** The black form was built from written descriptions of Foodnoms,
MacroFactor, and Gentler Streak. Their App Store screenshots show a
different object: a light log with a week, four colored rings, a macro
mark on every food, and a chart. That structure is what was missing.

**Alternatives considered:** Stay on the black list and only add color
(rejected — the screenshots that read as finished are light). Clone
Foodnoms’ search, library, and recipes (rejected — we do not have that
database, and the photo review is the logging path).

---

## 2026-10-28 — Gemini, a chosen model, and glass on the selected day

**Decision:** Settings asks for a provider, a model, and the user’s own
key. Gemini is a provider, stored the same way as OpenAI and Anthropic
(`macrolens.ai.key.gemini`), and the chosen model id is stored per
provider (`macrolens.ai.model.<provider>`). Photo estimates call
`generateContent` with that model and `x-goog-api-key`. The selected
calendar day, the primary button, and a selected settings row use
`GlassView` when Liquid Glass is available. The tab bar is still the
system pill.

**Why:** The settings form explained more than it asked. The person
using the app has a Gemini key and needs to pick the model that key
should call. The solid orange day was a drawn control on a screen that
otherwise uses the system glass.

---

## 2026-10-29 — Full UI revamp from award-winning and category-leading apps

**Decision:** Supersedes the 2026-10-28 “light food log” entry’s component
list (the light page and orange accent stay). Every tab root is now a
native stack with a collapsing large title (`app/(tabs)/<tab>/_layout.tsx`
→ `src/navigation/TabStack.tsx`), and every screen was rebuilt:

- **Today** — calories-left hero with a ring (Cal AI’s proven layout),
  three macro meters, a week strip where each day carries its own calorie
  ring (Fitness), and meal cards whose rows lead with the photo (Mela).
  Long-press a meal to delete it (there was no delete before).
- **Log** — dark viewfinder frame with corner guides, a staged scan
  (“Finding foods → Estimating portions → Adding up macros”) while the
  model runs, and a “Log again” shelf that stages a review — never a
  direct write.
- **Review** — photo with an item count, a total card, a sliding meal
  picker, and a ±10 g stepper per item (tap to type); Confirm states the
  calories and meal, then a short check-mark moment.
- **Plan** — MacroFactor-style interpreted insights: target with the
  reason and delta, macro split bar, a scrubbable trend chart (scale dots
  + EWMA trend, 1W/1M/3M/All, range stats), goal progress with a
  projected date, and the weigh-in.
- **Settings** — iOS Settings idiom (icon tiles, checkmarks), a live
  preview of the target your edits produce, a pace picker instead of
  typing a negative number, and sex and birth year are now editable
  (the calculator already used them).

The nutrient palette changed: protein `#C2368F`, carbs `#2F7CF6`, fat
`#1F9D63`, calories = the accent. The old protein orange failed the
dataviz validator’s lightness band and was confusable with the accent;
the new set passes all checks on white.

**Why:** The user asked to adopt what award-winning and editors’-pick apps
in this space actually do, revamping freely. No pure nutrition app has
won an ADA, so the references are the closest category leaders (Cal AI,
MacroFactor) plus recent ADA winners whose craft transfers (Tide Guide —
readable full-width charts; Moonlitt — touchable data; Mela — food
photography; Gentler Streak — non-judgmental framing). Details in
`docs/DESIGN-AWARD-CRITERIA.md`.

**Also:** `app/dev.tsx` is a development-only deep link
(`/dev?seed=1&go=/plan&y=500&review=1&clear=1`) used to drive the
simulator for screenshots; it redirects to Today in production. Removed
`GlassCard`, `GlassSheet`, `MacroRing`, `Panel`, `GoalTile`, `MacroBar`,
`ScreenHeader`, `TextButton`, `WeightLine` — replaced by the components
listed in `docs/DESIGN-SYSTEM.md`. Secondary buttons are white capsules,
not clear glass (clear glass on a flat page renders as nearly invisible).

**Alternatives considered:** A live `expo-camera` viewfinder on Log
(deferred — it can’t be verified in the simulator and the picker flow
works). A dark theme (deferred — the light log was a deliberate choice
the day before; dark mode should be a proper second set of tokens, not a
flip).

---

## 2026-10-29 — Describe-first logging: voice and text, with an on-device food reference

**Decision:** Logging is no longer built around the photo. The Log tab is a
hub led by “What did you eat?” — tap the mic and talk, or type — with
Photo, Search, and Quick add one tap away and “Log again” below. Speech
uses Apple's recognizer through `expo-speech-recognition` (on-device when
the model is present, Apple's servers otherwise). A local food reference
(`src/data/foods.ts`, ~170 foods with natural units) and parser
(`src/utils/describe.ts`) turn the words into items live, as they're
spoken, without a key or a network; only unmatched words go to the user's
AI provider (`estimateFromText`, text-only, so all three providers work).
Every path still ends on the review sheet.

**This required leaving Expo Go** (user chose it): the app is now a
development build (`npx expo run:ios`, bundle id `com.adwaitmahadar.macrolens`,
`ios/` generated and git-ignored). CocoaPods is required on the Mac.

**Also in this pass:**
- Logged meals can be edited (tap) and deleted with Undo (long-press,
  toast). There was no way to change a meal before.
- A meal's “+” on Today logs into that meal and day; the Today header has
  a mic that opens Log listening.
- Review: steppers count in natural units (“2 eggs”, “1.5 cups”), a day
  picker, “Add a missed item” (search), unmatched items must be matched or
  removed, repeat adds merge, edit mode with Delete.
- Search sheet with recents, staples, and “Quick add 350 kcal” from a number.
- Meal photos are copied into Documents/meal-photos when logged (the
  picker's cache can be purged) and resolved against the current container
  path when shown.
- Review and Search are page sheets (`presentation: 'modal'`), not
  `formSheet`: react-native-screens resizes a formSheet's first ScrollView
  to the whole sheet and can't hold a pinned footer. `SheetFooter` keeps
  the action above the keyboard.
- Tests: jest-expo, 23 tests over the parser, food data sanity, the
  logging flow (AI merge, fallbacks, meal/day), and the review store.

**Alternatives considered:** Staying in Expo Go and sending recorded audio
to Gemini/OpenAI (rejected by the user: no live transcript, nothing for
Anthropic or no-key users). Sending every description to the AI (rejected:
needs a key, costs money, slower; the review sheet already catches
mistakes, so a local first pass is the better default).

---

## 2026-10-30 — Smarter describe logging, My Foods, nutrients, backups, and a quick-log bar

**Decision:**
- **AI routing.** The instant on-device match stays the live preview. The
  parser now reports `confident: false` when words go unmatched or two foods
  run together with nothing between them ("orange chicken" as two foods).
  With a key saved, a shaky match makes the primary action "Review with
  AI", which sends the **whole** description to the provider and uses its
  answer; "Use as heard" keeps the instant match. The review sheet offers
  "Ask AI" afterwards, and shows why if the AI couldn't be used. Unmatched
  words alone are no longer sent piecemeal — that left the instant
  mis-matches ("Orange", "Chicken") in place.
- **My Foods** (`useFoodLibraryStore`, on device): foods the person
  created, nutrition they corrected ("Save to My Foods" in the editor, on
  by default, skipped when nothing changed), and AI estimates they logged
  (learned, never overwriting their own). Linked phrases: resolving an
  unmatched word with "Find it" maps that phrase to the chosen food. The
  parser and search consult My Foods and links before the built-in list.
- **Reference data:** fiber, sugar, sodium, saturated fat for every food,
  and ~60 more foods (Indian staples, Chinese-American and chain dishes,
  breakfast, drinks), plus common speech misspellings. ~230 foods total.
  Today shows a Nutrients card against guide amounts scaled to the target.
- **Backups:** Export writes one versioned JSON file (meals, weigh-ins,
  goals, plan, My Foods, links, meal photos as base64; never the API key)
  and opens the Share sheet. Import validates, summarises, and replaces
  after confirmation (`expo-document-picker`, a new native module — the
  dev build must be rebuilt).
- **Capture:** Log's Speak and Photo are equal one-tap buttons; Photo
  opens the camera and the estimate happens inside the card (the separate
  photo page is gone). A **quick-log bar** — iOS 26's tab-bar
  `BottomAccessory` — puts Speak and Photo on every tab and collapses to two
  icons when the tab bar minimises. Requests reach Log through a one-shot
  `useLogIntentStore`, not route params (navigating to an open tab doesn't
  reliably replace params).
- **Sheets** (Review, Search, Food editor) use the native header (glass
  close / Cancel / Save) and Search uses the native search field. Their
  `Stack.Screen` options are memoised: inline options re-render the screen
  in a loop ("Maximum update depth exceeded").
- **Feedback:** confirming a meal closes the sheet and shows a toast
  ("Snack · 247 kcal · Undo") instead of a full-screen check.
- **Meals:** the clock calls 22:00–04:00 and 15:00–17:00 a snack. Review
  nudges ("It's 9:40 PM. Log as Dinner") only when the meal came from the
  clock or Today's "+", never when the person said it.
- **Copy:** explanatory hints removed throughout.

**Why:** The user's review of the first voice build: a Panda Express order
was mis-split and the AI didn't fix it; photo was two steps while voice was
one; too many AI-sounding labels; wanted their own foods and edits to win,
more nutrients, editable nutrition, and a way to keep data across reinstalls
until there's a backend.

**Alternatives considered:** Always sending descriptions to the AI when a
key exists (rejected: "an apple and a banana" should stay instant and free).
iCloud sync (rejected for now: needs a paid developer account's iCloud
entitlement; the backup file covers reinstalls and new phones).

## 2026-10-30 — Log composer, keyboard handling, and a full-app audit

**Decision:**
- **Composer.** The clear ✕ moved out of the field into the card's title
  row as a 32 pt gray circle — the shape iOS uses to clear a field, and
  nowhere near the mic. The add-by-voice mic sits beside Review below the
  item list. "Review as heard" is a tonal button, not a text link. The
  floating quick-log bar is hidden on Log, which has the same actions in
  its card, and the recording bar carries no "Done" label.
- **No editable transcript while listening.** The live words render as
  `Text`; the `TextInput` returns when listening stops. A multiline input
  growing under streaming text keeps scrolling its caret into view, which
  threw the page upward on every word.
- **Keyboard:** `react-native-keyboard-controller` (a new native module —
  rebuild the dev build) replaces `automaticallyAdjustKeyboardInsets` and
  `Keyboard.metrics()` everywhere: `KeyboardAwareScrollView` on every
  screen with a field, `KeyboardStickyView` for `SheetFooter`.
- **Search field** uses `placement: 'stacked'`; the integrated placement
  put it in the bottom toolbar, under the Done footer, in Add Food.
- **Badges** follow the item name so AI, edited, and manual items align.
- **Large text:** hero numbers and segmented labels shrink to fit on one
  line, units widen instead of breaking, Log's shortcuts stack at
  accessibility sizes, Plan's unit wraps under the number.
- **Portions** print as fractions ("½ avocado", not "0.5 avocados").
- **Dev builds** hide the dev menu's floating button
  (`EXDevMenuShowFloatingActionButton: false`), which sat on top of every
  sheet's close and Save buttons; shake still opens the menu.

**Why:** The user found the composer cramped (✕ and mic side by side), the
page jumping while typing or recording, Done overlapping the search field,
and badges misaligning names — and asked for every page and flow to be
checked. Every screen was then captured empty, filled, with the keyboard
up, and at accessibility text size.

**Alternatives considered:** Keeping the ✕ inside the field with more
padding (rejected: still next to the mic once text wraps); an editable
field with `scrollEnabled={false}` while listening (rejected: the caret
still drives the parent scroll view).

## 2026-10-30 — Log composer rebuilt around the meal

**Decision:** Log's card no longer stacks buttons. Empty: the meal-aware
prompt ("What's for lunch?") over two equal capture tiles. Listening: the
card glows with the voice level while the meal builds below the words.
With text: the meal as a plate — each food with a macro ring, an "Add more"
mic row closing the list, the total with a stacked macro bar and legend —
and one full-width Review. The AI choice is an As heard / With AI segmented
control at the top of the plate, shown only when the instant match is unsure
and a key is saved; "With AI" dims the preview and puts ✦ on Review. Log's
page is a plain `ScrollView` with a keyboard spacer.

**Why:** The user found the previous card's mic, "Review with AI" and
"Review as heard" read as stacked bricks. Each control now sits with the
thing it acts on: clear with the words, Add more with the list of foods,
the AI choice with how the foods are read, Review with the total. Testing
with the real on-screen keyboard showed `KeyboardAwareScrollView` threw the
page upward when Speak or Add more replaced the focused field with live
text; a plain scroll view didn't move.

**Alternatives considered:** A toolbar row (mic and camera left, Review
right) — still three shapes side by side. A switch row for AI — needed a
sentence of explanation; the two labelled segments explain themselves.


## 2026-10-30 — Plan and Settings split; units, adaptive maintenance, reminders, water

**Decision:**
- **Plan owns the plan.** Goals, body stats, activity, macros, a custom
  target, and the weekend shift moved out of Settings into a plan editor
  sheet (`/plan-editor`) opened from Plan. Settings is preferences only.
  `UserProfile` gained optional `dietStyle`, `customSplit`,
  `calorieOverride`, `weekendExtraKcal`; `AdaptivePlan` gained
  `maintenanceCalories`, `basis` (`formula` / `measured` / `custom`),
  `floored`, `weekendExtraKcal`. All optional, so old data and backups load.
- **Units are a display concern.** Data stays metric; `useSettingsStore`
  (persisted as `macrolens-settings`) holds weight / height / energy / food /
  water units, and `utils/units.ts` converts at the edge. Defaults come from
  the device region; a profile saved before this change keeps metric and a
  Sunday week (a one-time migration reads `macrolens-user`).
- **Measured maintenance (MacroFactor-style).** `utils/expenditure.ts`
  estimates expenditure from the last 28 days: average intake on logged
  days (empty days are skipped, not counted as zero) minus the trend's
  change × 7,700 kcal/kg. It needs 10 logged days and two weeks of
  weigh-ins, blends with the formula until 21 days, and is clamped to
  70–135% of the formula. A weekly check-in (7 days after the target was
  set) proposes the new target with the reason; the person updates or keeps
  it. A custom target turns check-ins off. Plan edits use the same
  maintenance the Plan tab shows. Suggested targets never go under 1,200
  (female) / 1,500 (male) / 1,350 kcal.
- **Weekend shift.** Extra kcal on Saturday and Sunday is taken evenly from
  Monday–Friday so the week's total is unchanged; protein stays fixed and
  carbs/fat absorb the difference. Today reads each day's own target.
- **Reminders** are local notifications (`expo-notifications`) scheduled one
  by one for the next 7 days rather than repeating, so a reminder is left
  out when that meal is logged or the weigh-in done, or on a weekday the
  person turned off (`Reminder.days`; the weigh-in shows day toggles, since
  many people weigh in a few set mornings a week); they resync when the
  log, weigh-ins, or settings change. Tapping one opens Log for that meal or
  Plan. No push, no server. The notification config plugin isn't used: it
  adds the push entitlement, which local notifications don't need.
- **Time and date pickers** are `@react-native-community/datetimepicker`
  (compact, inline). Both are new native modules — rebuild the dev build.
- **Water** is its own store (`macrolens-water`, ml by day) with a Today
  card; goal and glass size live in Settings.
- **Data:** CSV export (food log per item, weigh-ins, water, in the
  person's units), and Delete All Data (keeps units, reminders, the AI key).
  Backups now carry water and settings as optional fields; version stays 1.
- **Today** gained previous/next week, a set-up prompt when there's no plan,
  and a Sunday- or Monday-start week.
- **Layout:** tab screens add `spacing.tabBottom` because the automatic
  inset doesn't include the Log a meal bar above the tab bar — the last rows
  of Plan and the Settings footer were hidden behind it.

**Why:** The user asked for Plan and Settings to be separate, for proper
settings with units "for everything", and for the basic suite of the
category. MacroFactor, MyFitnessPal, Cronometer, and Lose It all ship: unit
choices including stones and kJ, goal direction with pace, diet presets and
custom macro splits, a manual target option, weekend/uneven calorie
distribution (MacroFactor, Lose It), meal and weigh-in reminders, water,
weigh-in history with edits, CSV export, and account/data deletion.
MacroFactor's measured expenditure is the core of "adaptive" in
docs/PRODUCT.md, which until now was only a formula with sample text.

**Alternatives considered:** Repeating daily notifications (can't skip a
day already logged). Storing values in the chosen unit (every unit switch
would rewrite history, and rounding would drift). Recomputing the target
from measured data on every edit without a check-in (the number would move
under people without a reason shown). Keeping body stats in Settings
(they only exist to compute the plan).

## 2026-10-31 — Home Screen quick actions

**Decision:** Four quick actions on the app icon (Say a Meal, Snap a Meal,
Search Foods, Log Weight) via `expo-quick-actions`, registered at runtime
from the tabs layout, which handles the one that launched the app. A new
native module — rebuild the dev build.

**Why:** The user asked for app icon options. Apple's HIG allows four
app-specific actions and expects at least one; the leading trackers use
them for logging food and weight. These four are the app's own entry points
(the quick-log bar, Search, the weigh-in sheet), so they behave exactly like
the buttons they mirror.

**Alternatives considered:** Static `UIApplicationShortcutItems` in
Info.plist (still needs native code to receive the tap); a "Log again: last
meal" dynamic action (only four slots, and logging food or weight are the
everyday jobs); a water action (water is a toggle-off feature).
