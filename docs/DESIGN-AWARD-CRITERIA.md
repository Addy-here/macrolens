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

## What the winners and category leaders actually ship (researched 2026-10-29)

No dedicated nutrition tracker has won an ADA. Mela was a 2025 Interaction
finalist; Speechify won Inclusivity. The 2026 winners include Tide Guide
(Visuals and Graphics) and Moonlitt (Interaction). Gentler Streak won Social
Impact in 2024. The 2025 App Store Awards went to Tiimo (iPhone) and Strava
(Watch). What transfers to Macrolens:

| Source | What they do | Where it landed |
|---|---|---|
| Cal AI (category leader) | Calorie number + ring hero, macro cards, calendar strip, recently-uploaded photo list, a correction loop on scan results | Today hero, macro meters, ringed week strip, photo-first meal rows; review stepper |
| MacroFactor (category leader) | Dashboard of *interpreted* insights: expenditure, weight trend that smooths daily noise, goal progress; summary stats per selected range | Plan: reason + delta on the target, trend chart with range picker and stats, goal card with projected date |
| Tide Guide (ADA 2026, Visuals) | Full-width charts that stay easy to read; distinctive without hiding the data | Clean full-width trend chart, hairline grid, one accent line |
| Moonlitt (ADA 2026, Interaction) | Tactile, touchable data | Drag-to-scrub chart with haptic ticks |
| Mela (ADA 2025 finalist, Interaction) | Food photography as the hero | Photo thumbnails on every meal, photo-led review, "Log again" shelf |
| Gentler Streak (ADA 2024, Social Impact) | Calm, non-judgmental framing | Neutral "left / over"; plain-language reasons |
| Apple Fitness / Settings | Rings per day, grouped lists with icon tiles | Week strip rings; Settings rows |

## Current Macrolens status against each category (as of 2026-10-29, after the revamp)

| Category | Status | Notes |
|---|---|---|
| Interaction | **Strong** | Native tabs, native collapsing large titles per tab, native form sheet. Spring segmented controls, steppers, a scrubbable chart, haptics on every control. |
| Craft and Polish | **Good** | One token set, validated nutrient palette, SF Pro Rounded figures, continuous corners. Not yet: dark mode, iPad layout. |
| Inclusivity | **Partial** | VoiceOver labels on rings, meters, rows, chart summary; Stepper is `adjustable`; delete is a VoiceOver action; all motion honours Reduce Motion; identity never by color alone. Not yet audited at the largest Dynamic Type sizes. |
| Innovation | **On track** | Adaptive plan with reasons and a projected date; still the client-side starter calculator until the backend exists. |
| Delight and Fun | **Started** | Staged scan while the model works; check-mark moment on log. Next: a moment when the weekly trend hits the planned rate. |
| Social Impact | **N/A for v1** | Not a stated goal. |

## Next actions

1. Dynamic Type pass at AX sizes (hero numbers and three-up macro cards will need to wrap).
2. Dark mode as its own token set, validated against the dark surface.
3. A weekly check-in moment tied to the adaptive plan.
4. Add a missed item on the review sheet (PRODUCT.md v1 scope).
