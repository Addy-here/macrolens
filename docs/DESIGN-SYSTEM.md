# Macrolens — Design system

Light food log. The local skill `.cursor/skills/macrolens-design/SKILL.md` points here before UI changes.

Built from what the leading apps in and around this category actually ship (see `docs/DESIGN-AWARD-CRITERIA.md` for the research): Cal AI's calorie-number-plus-ring hero and photo-first meal list, MacroFactor's interpreted insights (why the target moved, trend weight, goal progress, range summaries), Tide Guide's full-width readable charts (2026 ADA, Visuals and Graphics), Moonlitt's touch-scrubbable data (2026 ADA, Interaction), Mela's food photography as the hero (2025 ADA finalist, Interaction), and Apple Fitness / Settings for system idiom.

## Principles

1. **System chrome, our content.** Every tab root is a native stack with a large title that collapses on scroll. The tab bar is `NativeTabs`. The review is a native form sheet. We draw none of these.
2. **One hero number per screen.** Today: calories left. Plan: daily target. Review: total kcal. Settings: the target your edits produce. SF Pro Rounded, proportional figures.
3. **The photo is the meal.** Logged meals are rows with their photo, the foods by name, time, and P/C/F marks. Log is a dark viewfinder frame. Review leads with the photo.
4. **Explain, don't just display.** The target shows why it moved. The goal card says when you'll arrive at this pace. Settings shows the target your edits would produce before you save.
5. **Neutral numbers.** "Left" and "over" use the same ink. Passing a target never turns red.
6. **Review before save.** The only write path for an estimate is Confirm on the review sheet, including "Log again".

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
- `Stepper` — minus / value / plus capsule; tap the value to type. VoiceOver adjustable.
- `TrendChart` — gray scale dots, monotone-smoothed accent trend line, 14% wash, hairline grid, optional goal line, end-dot. Drag to scrub with a tooltip and selection ticks. Legend + accessible summary.
- `ListRow` / `GroupLabel` — Settings idiom: icon tile, title, subtitle, value / control / checkmark / chevron.
- `SectionHeader` — 20pt title with a trailing note.
- `Icon` — SF Symbol wrapper.
- `GlassButton` — capsule. Primary is accent-tinted Liquid Glass on iOS 26 (solid accent elsewhere) with a soft accent lift. Secondary is a white capsule — clear glass on a flat page has nothing to refract and reads as missing. One primary per screen.

## Motion and feedback

Springs from `tokens.springs` for rings, bars, and segmented thumbs; all check `useReducedMotion()`. Haptics: selection on day / segment / step / scrub, light-medium impact on buttons, success on log and weigh-in, error on a failed estimate. Delight moments are tied to the job: the staged "Finding foods → Estimating portions → Adding up macros" scan, and the check-mark confirmation when a meal is logged.

## Layout

Horizontal gutter `spacing.gutter` (20). Scroll views use `contentInsetAdjustmentBehavior="automatic"` so content starts under the large title and clears the tab bar — no manual top/bottom inset math. Card stacks use 10–12pt gaps; sections open with `SectionHeader` (24pt above).

## Anti-patterns

- A custom header, tab bar, or sheet where the system has one.
- More than one hero number, or more than one filled button, on a screen.
- Red type because a target was passed.
- Nutrient color on text; a fifth nutrient hue; reassigning the four.
- Glow, gradient-filled buttons or backgrounds, mascots. (A 14% wash under a chart line is data, not decoration.)
- Clear glass on a flat background; blur on every row.
- An estimate written to the log without the review sheet.
