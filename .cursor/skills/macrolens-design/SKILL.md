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

A light food log in the system idiom. Every tab root has a native collapsing large title (`src/navigation/TabStack.tsx`). Today: a ringed week strip, the calories-left hero with a ring, three macro meters, and photo-first meal cards. Log: a dark viewfinder frame, a staged scan while the model works, and "Log again". Review: photo, total, meal picker, a stepper per item, one Confirm. Plan: the target and why it moved, the macro split, a scrubbable trend chart with range stats, goal progress with a date, and a weigh-in. Settings: the iOS Settings list with a live target preview.

## Rules

- Cards are `Card` (white, radius 22). Settings rows are `ListRow` inside a `Card`.
- Orange (`colors.accent`) is the brand: primary button, selected day, tab tint, trend line, calorie ring.
- Protein `colors.protein`, carbs `colors.carbs`, fat `colors.fat` — fixed and validated. Identity is a dot; text stays in ink.
- One hero number and one primary `GlassButton` per screen.
- “Left” and “over” stay neutral. Do not turn a surplus red.
- Every ScrollView on a tab uses `contentInsetAdjustmentBehavior="automatic"`.
- Animations check `useReducedMotion()`; controls give a haptic.
- Review-before-save is the only write path for an estimate, including “Log again”.

## Checking your work

With Metro running and the iOS simulator booted, drive the app with the dev deep link and screenshot it:

```bash
xcrun simctl openurl booted "exp://127.0.0.1:8081/--/dev?seed=1&go=/plan&y=500"
xcrun simctl io booted screenshot shot.png
```

`seed=1` loads sample data, `clear=1` wipes it, `go` picks a tab, `y` scrolls it, `review=1` opens a staged review sheet. Dev builds only.

## Do not

- Draw a header, tab bar, or sheet the system provides.
- Put clear glass on the flat page, blur on every row, or a glow anywhere.
- Add a custom font; use `ui-rounded` only for figures.
