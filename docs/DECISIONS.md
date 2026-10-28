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
