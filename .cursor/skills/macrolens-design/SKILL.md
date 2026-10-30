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

A light food log in the system idiom. Every tab root has a native collapsing large title (`src/navigation/TabStack.tsx`). Today: a ringed week strip, the calories-left hero with a ring, three macro meters, and photo-first meal cards (tap to edit, long-press for Log again / Delete with Undo; a meal's “+” logs into that meal). Log: “What did you eat?” with Speak and Photo as equal one-tap buttons and a text field, foods resolving live as you talk, then Search / Library / Quick add and “Log again”. A quick-log bar (tab-bar accessory) offers Speak and Photo on every tab. Review (page sheet): what you said or the photo, total, meal and day, a stepper per item in natural units, “Add a missed item”, one Confirm. Plan: the target and why it moved, the macro split, a scrubbable trend chart, goal progress, weigh-in. Settings: the iOS Settings list with a live target preview.

## Rules

- Cards are `Card` (white, radius 22). Settings rows are `ListRow` inside a `Card`.
- Orange (`colors.accent`) is the brand: primary button, selected day, tab tint, trend line, calorie ring.
- Protein `colors.protein`, carbs `colors.carbs`, fat `colors.fat` — fixed and validated. Identity is a dot; text stays in ink.
- One hero number and one primary `GlassButton` per screen.
- “Left” and “over” stay neutral. Do not turn a surplus red.
- Every ScrollView on a tab uses `contentInsetAdjustmentBehavior="automatic"`.
- Animations check `useReducedMotion()`; controls give a haptic.
- Review-before-save is the only write path for anything, including voice, “Log again”, quick add, and edits.
- Sheets with a pinned action use `presentation: 'modal'` and `SheetFooter`, not `formSheet`; memoise their `Stack.Screen` options.
- Copy is strict: no hints, no explanations of the obvious, no AI-key nudges once a key is saved.
- Screens with a text field scroll in `KeyboardAwareScrollView` (react-native-keyboard-controller); never `automaticallyAdjustKeyboardInsets`. Live transcripts render as `Text`, never an editable field.
- Source badges follow the item's name. Portions read as fractions (“½ avocado”).
- Check every touched screen at `accessibility-medium` text: one-line hero numbers, units that widen instead of breaking, chips that stack.

## Checking your work

The app runs as a development build (`npx expo run:ios`, then `npx expo start`). Drive the simulator through the dev command file and screenshot it — see “Looking at the app in the simulator” in `docs/AGENT-GUIDE.md`:

```bash
C=$(xcrun simctl get_app_container booted com.adwaitmahadar.macrolens data)
echo "seed=1&go=/plan&y=500" > "$C/Documents/dev-command.txt"
xcrun simctl io booted screenshot shot.png
```

## Do not

- Draw a header, tab bar, or sheet the system provides.
- Put clear glass on the flat page, blur on every row, or a glow anywhere.
- Add a custom font; use `ui-rounded` only for figures.
