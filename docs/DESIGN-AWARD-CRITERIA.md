# Macrolens — Apple Design Award criteria & competitor benchmark

Working reference doc, not marketing copy. Each Apple Design Award (ADA)
category below is translated into a concrete yes/no check against
Macrolens, so this can be re-run as a checklist at future milestones
instead of staying a one-time research note.

Source: Apple's published ADA judging criteria
(developer.apple.com/design/awards), current as of this research pass.

## The six ADA categories

1. **Delight and Fun** — does the app bring joy; small moments of
   craft/surprise beyond pure utility.
2. **Inclusivity** — accessibility (VoiceOver, Dynamic Type, reduced
   motion, color contrast), broad usability across ability levels and
   contexts.
3. **Innovation** — genuinely novel use of platform capability, not just
   a well-executed version of an existing pattern.
4. **Interaction** — intuitive, fluid, responsive controls; interactions
   that feel native and considered, not generic cross-platform widgets.
5. **Social Impact** — does the app meaningfully help people/communities,
   beyond engagement metrics.
6. **Visual Design / Craft and Polish** — consistent, native platform
   idiom; pixel-level attention; motion, typography, materials used
   correctly and purposefully, not decoratively.

Across almost every ADA-winning app (and in Apple's own HIG framing),
the throughline is: **use real platform primitives, don't reinvent
them.** Apple's own apps (Health, Fitness, Reminders) are the reference
implementation for what "if Apple built this" looks like — native tab
bars, native sheets, native symbols, system typography/dynamic type,
native haptics, respecting Reduce Motion/Increase Contrast.

## Competitor benchmark: MacroFactor

Chosen because it's the closest existing app to what Macrolens is
building (photo/manual food logging + adaptive weekly weight-loss plan
based on actual trend data, not static TDEE guesses) and is widely
regarded as best-in-class execution in this specific niche.

What MacroFactor does well that maps directly to ADA criteria:
- **Interaction/Craft:** native iOS components throughout — system
  sheets, system tab bar, no custom-drawn chrome competing with iOS's
  own visual language.
- **Innovation (for this category):** the adaptive-TDEE/weekly
  recalculation engine is the actual product differentiator, not the
  skin — confirms the earlier product decision to prioritize the
  adaptive-plan logic as a first-class feature, not an afterthought.
- **Craft:** review-before-save flow for logged items (never silently
  auto-commits an AI/estimate without user confirmation) — already
  adopted in Macrolens's `FoodReviewScreen` design per `PRODUCT.md`.
- **Inclusivity:** full Dynamic Type support, VoiceOver labels on all
  interactive elements, respects Reduce Motion for its animated charts.

## Current Macrolens status against each category (honest, as of 2026-10-29)

| Category | Status | Notes |
|---|---|---|
| Interaction | **Improved** | Migrated off hand-rolled `@react-navigation/bottom-tabs` to `expo-router`'s `NativeTabs` — real `UITabBarController`, real floating Liquid Glass pill on iOS 26, no manual pill-shape styling. See ADR 2026-10-29. |
| Craft and Polish | **Partial** | `GlassView`/`expo-glass-effect` gives real native glass material on supported primitives (cards, buttons, sheets, tab bar). SF Symbols via `expo-symbols` for icons. Not yet audited: Dynamic Type support, haptics on key actions (log confirm, goal save), spring/motion tuning. |
| Inclusivity | **Not started** | No VoiceOver label audit, no Dynamic Type testing, no Reduce Motion handling on any animated component (`MacroRing`'s animated progress, glass transitions). This is the single biggest gap against ADA criteria right now. |
| Innovation | **On track** | Adaptive weekly-recalculation plan (EWMA trend weight, not static TDEE) is the real differentiator already planned — matches what made MacroFactor notable. Not yet built server-side. |
| Delight and Fun | **Not started** | No deliberate micro-interaction/delight moments designed in yet (e.g. a satisfying confirm animation on logging a meal, a celebratory moment on hitting a weekly goal). |
| Social Impact | **N/A for v1** | Not a stated goal for this app; skip unless the user wants to scope it in later. |

## Concrete next actions this doc implies (not yet done, for future work)

1. Accessibility pass: add `accessibilityLabel`s to every `Pressable`/
   `GlassButton`, verify Dynamic Type doesn't break any fixed-height
   layout, wrap `MacroRing`'s animation behind a Reduce-Motion check
   (`AccessibilityInfo.isReduceMotionEnabled()`), same pattern already
   used for the web-platform guard.
2. Haptics: add `expo-haptics` light impact feedback on meal-confirm,
   goal-save, and tab switches — a concrete "Interaction" polish item
   that's cheap to add and matches what most ADA winners do.
3. One deliberate "Delight and Fun" moment: candidate is a small
   celebratory animation/haptic when a weekly weigh-in trend hits the
   target rate — ties directly into the adaptive-plan feature so it's
   not decoration bolted onto something unrelated.
