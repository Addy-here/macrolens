# Macrolens — Design system

Light food log. The local skill `.cursor/skills/macrolens-design/SKILL.md` points here before UI changes.

Built from what the leading apps in and around this category actually ship (see `docs/DESIGN-AWARD-CRITERIA.md` for the research): Cal AI's calorie-number-plus-ring hero and photo-first meal list, MacroFactor's interpreted insights (why the target moved, trend weight, goal progress, range summaries), Tide Guide's full-width readable charts (2026 ADA, Visuals and Graphics), Moonlitt's touch-scrubbable data (2026 ADA, Interaction), Mela's food photography as the hero (2025 ADA finalist, Interaction), and Apple Fitness / Settings for system idiom.

## Principles

1. **System chrome, our content.** Every tab root is a native stack with a large title that collapses on scroll. The tab bar is `NativeTabs`. The review is a native form sheet. We draw none of these.
2. **One hero number per screen.** Today: calories left. Plan: daily target. Review: total kcal. Settings: the target your edits produce. SF Pro Rounded, proportional figures.
3. **Say it or snap it, then check it.** Log leads with “What did you eat?” — Speak and Photo as equal one-tap buttons, and a text field, with foods appearing live as you talk. Search, Library, and Quick add sit below. Review leads with what you said (or the photo), and logged meals keep their photo or a quiet utensil mark.
4. **Explain, don't just display.** The target shows why it moved. The goal card says when you'll arrive at this pace. Settings shows the target your edits would produce before you save.
5. **Neutral numbers.** "Left" and "over" use the same ink. Passing a target never turns red.
6. **Review before save.** The only write path for anything is Confirm on the review sheet — voice, typing, photo, search, log again, quick add, and edits.
7. **Nothing is a dead end.** Every meal can be edited or deleted (with Undo); a meal's “+” logs into that meal and day; unmatched words get a “Find it”; errors say what to do next.

## Color

Tokens in `app/src/theme/colors.ts`. Do not add colors in a screen.

- Page `#F2F2F7`. Card `#FFFFFF`, radius 22, continuous corners, a barely-there shadow. Inset fields `#F2F2F7`.
- Ink: primary `#111114`, secondary 70%, tertiary 42% of `#3C3C43`.
- **Accent `#FF5C1A`** — the brand. Filled button, selected day, tab tint, the trend line, and the calorie ring.
- **Nutrients** — calories `#FF5C1A`, protein `#C2368F`, carbs `#2F7CF6`, fat `#1F9D63`. Validated with the dataviz palette script on white: lightness band, chroma, CVD separation (worst ΔE 17.7), normal-vision floor, ≥3:1 contrast. The previous protein orange `#FF9F0A` failed the lightness band and sat on top of the accent.
- Tracks are the fill hue at 16% (`withAlpha`). Text never wears a nutrient color — a dot beside the label carries identity.
- `tile.*` — iOS system colors for Settings icon tiles only.
- Danger is a failed action (permission, rejected key, delete), never a meal that passed its target.

## Type

System font. SF Pro Rounded (`ui-rounded`) for figures only: `hero` 52, `statLarge` 30, `statMedium` 20, `statSmall` 15 (tabular, for columns and axes). Text styles follow iOS names: `title`, `headline`, `body`, `callout`, `subheadline`, `footnote`, `caption`, `label`. Sentence case everywhere; no all-caps eyebrows.

## Components (`app/src/components/ui`)

- `Card` — white card, pads itself by default (`padded={false}` for edge-to-edge rows).
- `ProgressRing` — springs to its value, honours Reduce Motion, stays full past 100%.
- `ProgressBar` — capsule meter on a light step of its own hue.
- `WeekStrip` — Sunday-start week; every past day carries a thin calorie ring; the selected day is accent Liquid Glass (solid accent off iOS 26); future days are disabled.
- `MacroMarks` — P / C / F with a colored dot and neutral ink.
- `FoodThumb` — the meal photo as a rounded square, or a quiet utensil mark.
- `Segmented` — iOS segmented control with a spring-sliding thumb and selection haptics.
- `Stepper` — minus / value / plus capsule; tap the value to type. Counts in the food's own unit when it has one (“2 eggs”, half steps for big units), grams otherwise, calories for quick add. VoiceOver adjustable.
- `TrendChart` — gray scale dots, monotone-smoothed accent trend line, 14% wash, hairline grid, optional goal line, end-dot. Drag to scrub with a tooltip and selection ticks. Legend + accessible summary.
- `ListRow` / `GroupLabel` — Settings idiom: icon tile, title, subtitle, value / control / checkmark / chevron.
- `SectionHeader` — 20pt title with a trailing note.
- `Icon` — SF Symbol wrapper.
- `SheetFooter` — the pinned action bar on a sheet; rides above the keyboard.
- `QuickLogBar` — the tab bar's bottom accessory: “Log a meal” with Speak and Photo on every tab except Log (which has them in its card); two icons when minimised.
- `RecordingBar` — what Log's composer becomes while listening: ✕ cancel, a live waveform with elapsed time, ✓ finish. No labels.
- Log's composer has three states: empty (inset field + equal Speak and Photo buttons), listening (`RecordingBar`), and with text (clear ⓧ and an add-by-voice mic inside the field; full-width Review, or Review with AI over a tonal Review as heard).
- Source badges — a 22 pt rounded square before an item's name: ✦ AI estimate (accent), pencil edited, person My Foods. Never a text tag among the nutrients.
- Nutrient totals — macros (with color dots) and fiber / sugar / saturated fat / sodium share one type style; extra nutrients are a second row, not a footnote.
- `PhotoScan` — the photo being estimated, with a sweep and named stages; errors offer Retry.
- `ToastHost` — one short message above the tab bar, with an optional action (“Undo”). Mounted at the root.
- `GlassButton` — capsule. Primary is accent-tinted Liquid Glass on iOS 26 (solid accent elsewhere) with a soft accent lift. Secondary is a white capsule — clear glass on a flat page has nothing to refract and reads as missing. One primary per screen.

## Motion and feedback

Springs from `tokens.springs` for rings, bars, and segmented thumbs; all check `useReducedMotion()`. Haptics: selection on day / segment / step / scrub, light-medium impact on buttons, success on log and weigh-in, error on a failed estimate. Delight moments are tied to the job: the staged "Finding foods → Estimating portions → Adding up macros" scan, and the check-mark confirmation when a meal is logged.

## Sheets

Review, Search, and the food editor are page sheets (`presentation: 'modal'`) with the native header (glass close, or Cancel/Save) and, for Search, the native search field. Memoise their `Stack.Screen` options. Confirming closes the sheet and shows a toast with Undo — no full-screen celebration. Don't use `formSheet` for a sheet with a pinned footer — react-native-screens resizes its first ScrollView to the whole sheet.

## Layout

Horizontal gutter `spacing.gutter` (20). Scroll views use `contentInsetAdjustmentBehavior="automatic"` so content starts under the large title and clears the tab bar — no manual top/bottom inset math. Card stacks use 10–12pt gaps; sections open with `SectionHeader` (24pt above).

## Copy

Labels name things; they don't explain them. No hints under controls, no “tap to…”, no instructions a person discovers by using the screen, and nothing about adding an AI key once one is saved. Errors say what happened and what to do, in one line.

## Anti-patterns

- A custom header, tab bar, or sheet where the system has one.
- More than one hero number, or more than one filled button, on a screen.
- Red type because a target was passed.
- Nutrient color on text; a fifth nutrient hue; reassigning the four.
- Glow, gradient-filled buttons or backgrounds, mascots. (A 14% wash under a chart line is data, not decoration.)
- Clear glass on a flat background; blur on every row.
- An estimate written to the log without the review sheet.
