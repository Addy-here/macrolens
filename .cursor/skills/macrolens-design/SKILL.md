---
name: macrolens-design
description: >-
  Apply Macrolens visual and interaction rules when changing screens, layout,
  color, type, empty states, or components. Use when the user asks to revamp,
  restyle, or polish the Macrolens UI, or when editing files under app/src/screens,
  app/src/components, or app/src/theme. Read docs/DESIGN-SYSTEM.md before editing.
---

# Macrolens design

Read `docs/DESIGN-SYSTEM.md` before changing UI. Tokens live in `app/src/theme/`. Do not invent a second palette in a screen.

## What this app is

A light food log. Today is a week strip, four nutrient rings, and meals. Log is a photo frame, then a review. Plan is this week’s calories and a weight line. Settings is provider, model, and the user’s own key, then the goal numbers. The system tab bar stays the real pill. The selected day and a selected row use `GlassView` when Liquid Glass is available. Do not draw a pill.

## Rules

- Page is `colors.background` (grouped gray). Cards are white `colors.surface`, radius `radius.md`.
- Orange (`colors.accent`) tints the selected day, the filled button, text actions, the tab, and the weight line. On iOS 26 the selected day is Liquid Glass, not a flat orange disc.
- Calories, protein, carbs, and fat use `colors.calories`, `protein`, `carbs`, and `fat` on rings and on `MacroMarks`. Do not reassign them.
- “Left” and “past” stay in secondary type. Do not turn a surplus red.
- An empty Today still shows the week strip, the four tiles, and the four meal headers.
- One filled button per screen. Pinned footers and scroll ends pad `insets.bottom + spacing.xxl`.
- Review-before-save is the only write path for an estimate.

## Do not

- Return to a black form, a glow ring, or an eyebrow slogan on every tab.
- Copy Foodnoms’ search library, MacroFactor’s database, or Gentler Streak’s character.
- Add a custom font.
