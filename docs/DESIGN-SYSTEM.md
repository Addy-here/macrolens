# Macrolens — Design system

Light food log. The local skill `.cursor/skills/macrolens-design/SKILL.md` points here before UI changes.

Taken from the App Store screens of Foodnoms, MacroFactor, and Gentler Streak, then fitted to four jobs: today’s meals, a photo that is reviewed before save, this week’s target, and settings. Store marketing frames are not part of the app.

## Principles

1. **The day is a log.** Today has a week strip, four goal rings, and meals grouped as breakfast, lunch, dinner, and snack. An empty day still shows that skeleton.
2. **Light page, white cards.** Background is grouped gray. Cells are white, radius 16. The system tab bar is the only glass, and it is light with the page.
3. **Orange is the action.** Selected day, filled button, text action, tab tint, and the weight line use `colors.accent`.
4. **Four nutrient colors, used twice.** Calories, protein, carbs, and fat keep fixed colors on the rings and again as marks on every food. They are not button colors.
5. **Neutral numbers.** “Left” and “past” use the same type color. Passing a target does not turn red.
6. **One sentence on Plan.** The weekly calories, why they moved, then the weight line once there are two weigh-ins.
7. **The photo is a frame.** Log is a picture well. Review shows that picture, portions, the macro marks, and one Confirm button.

## Type

System font. Large title on a tab root. Body for food names. Caption for portions, weekdays, and macro marks. Figures are tabular.

## Color

Tokens in `app/src/theme/colors.ts`.

- Page `#F2F2F7`. Card `#FFFFFF`. Inset field `#F2F2F7`.
- Label `#1C1C1E`. Secondary `rgba(60,60,67,0.64)`. Tertiary `rgba(60,60,67,0.36)`.
- Accent `#FF5C1A`. On accent, white.
- Calories `#FF4B4B`. Protein `#FF9F0A`. Carbs `#0A84FF`. Fat `#34C759`.
- Danger is a failed action (permission, rejected key), never a meal that passed its target.

## Components

- `WeekStrip` — Sunday-start week. The selected day is Liquid Glass tinted with the accent when the system glass API is available.
- `GoalTile` — name, “left” or “past”, small ring.
- `MacroMarks` — four dots and numbers, same colors as the rings.
- `WeightLine` — orange polyline. Renders nothing until there are two values.
- `Panel`, `ScreenHeader`, `GlassButton`, `TextButton` — as before. One filled button per screen.

## Layout

Horizontal inset `spacing.lg`. Scroll content and pinned footers end at `insets.bottom + spacing.xxl` so the last control clears the tab bar.

## Anti-patterns

- A black canvas with one ring and a slogan header.
- Icon inside a tinted circle as an empty state.
- Glow, gradient fill, or a mascot.
- Red type because a target was passed.
- A custom pill instead of `NativeTabs`.
