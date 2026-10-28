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
