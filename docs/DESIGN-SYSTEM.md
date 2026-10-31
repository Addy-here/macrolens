# Macrolens — Design system

Light food log. The local skill `.cursor/skills/macrolens-design/SKILL.md` points here before UI changes.

Built from what the leading apps in and around this category actually ship (see `docs/DESIGN-AWARD-CRITERIA.md` for the research): Cal AI's calorie-number-plus-ring hero and photo-first meal list, MacroFactor's interpreted insights (why the target moved, trend weight, goal progress, range summaries), Tide Guide's full-width readable charts (2026 ADA, Visuals and Graphics), Moonlitt's touch-scrubbable data (2026 ADA, Interaction), Mela's food photography as the hero (2025 ADA finalist, Interaction), and Apple Fitness / Settings for system idiom.

## Principles

1. **System chrome, our content.** Every tab root is a native stack with a large title that collapses on scroll. The tab bar is `NativeTabs`. The review is a native form sheet. We draw none of these.
2. **One hero number per screen.** Today: calories left. Plan: daily target. Review: total kcal. Plan editor: the target your edits produce. Settings has none — it's a list. SF Pro Rounded, proportional figures.
3. **Say it or snap it, then check it.** Log leads with “What did you eat?” — Speak and Photo as equal one-tap buttons, and a text field, with foods appearing live as you talk. Search, Library, and Quick add sit below. Review leads with what you said (or the photo), and logged meals keep their photo or a quiet utensil mark.
4. **Explain, don't just display.** The target shows why it moved. The goal card says when you'll arrive at this pace. Maintenance says whether it's estimated or measured, and from how many days. The plan editor shows the target your edits would produce before you save, and the weekly check-in says what your intake and trend implied.
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
- `water` `#30B0C7` — the water meter on Today, nothing else. Teal so it never reads as carbs.
- Danger is a failed action (permission, rejected key, delete), never a meal that passed its target.

## Brand mark

A fried egg whose yolk is a lens: food, and the camera that logs it. One white shape and one flat accent yolk with a glint, no gradients, so it reads at 16 px.

- Source: `app/assets/brand/build.py` holds the geometry, writes every flat asset as SVG (rasterize each at 1024), and writes the layered `app/assets/AppIcon.icon`.
- iOS icon: `AppIcon.icon`, an Icon Composer bundle (`ios.icon` in `app.json`). Accent fill (system dark in Dark); the egg white is a glass layer with a neutral shadow; the yolk and glint are a group in front with a chromatic shadow, so the yolk floats. iOS derives Dark, Clear, and Tinted from these layers. Open it in Icon Composer (Xcode ▸ Open Developer Tool) to adjust; check with `ictool AppIcon.icon --export-image …`. `icon.png` is the flat fallback for web and Expo Go.
- Splash: the egg on accent `#FF5C1A` (`expo-splash-screen`).
- Android: egg foreground inside the 66% safe circle on accent; a monochrome version with the yolk set off by a gap ring.
- In the app: `AppMark` (`tile` for the icon tile). Used once, in the Settings footer with the version. Not a decoration — no mark on content screens.

## Units

Stored metric (kg, cm, kcal, g, ml); shown and typed in the person's units (Settings ▸ Units): weight kg / lb / st, height cm / ft in, energy kcal / kJ, food g / oz, water ml / fl oz. Convert only at the edge — `useUnits()` (`store/useSettingsStore.ts`) gives formatters bound to the current units (`weightText`, `weightDelta`, `pace`, `heightText`, `energyText`, `energyNumber`, `energyName`, `massText`, `waterText`); `utils/units.ts` holds the math. Never print "kg" or "kcal" literally in a screen. Stones read "12 st 3.4 lb", and changes and paces in stones read in pounds. Macros and micros stay in grams and milligrams. Defaults follow the region (US imperial, UK stones and feet, AU/NZ kJ); someone upgrading from before units keeps metric.

## Plan and Settings

- **Plan** is everything the target comes from: the target card (why it moved, macro split, weekday/weekend split), the weekly check-in when due, weight chart and weigh-in (Other Day / All Weigh-Ins), goal progress, maintenance (Estimate → Measured), and a "Your plan" list whose rows and the header's Edit open the plan editor.
- **Plan editor** (`/plan-editor`, page sheet): goal (Lose / Maintain / Gain), goal weight, pace, body, activity, macros (presets or a custom split that must add to 100%), daily target (Calculated / Custom), weekends. The preview card leads; the pinned footer is the one primary: "Save · 2,180 kcal a day", or why it can't save. Swiping away with edits asks first. First run (no profile) starts with the weights empty.
- **Weigh-ins** (`/plan/weights` list by month, `/weigh-in` sheet with date and time): tap to correct, hold or the sheet's Delete to remove, with Undo.
- **Settings** is preferences only: Units, General (week start, Reminders), Water, Food (My Foods, AI), Data (backup, CSV, Delete All Data), About. Goals and body stats never appear here.
- **Reminders**: meals and weigh-in as local notifications, a week scheduled ahead and skipped on days already logged. The weigh-in picks its days with seven day toggles in calendar order (at least one stays on). Each reminder that's on says when it fires next and why today was skipped ("Logged today · Next tomorrow"), from `planReminders` — the same plan the scheduler follows; one static footnote states the skip rule. "Send a Test" delivers one in 5 seconds. At large text the time moves to its own row.

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
- `TrendChart` — takes `unit`; gray scale dots, monotone-smoothed accent trend line, 14% wash, hairline grid, optional goal line, end-dot. Drag to scrub with a tooltip and selection ticks. Legend + accessible summary.
- `ListRow` / `GroupLabel` — Settings idiom: icon tile, title, subtitle, value / control / checkmark / chevron; `destructive` for a red delete row. Titles and values wrap to two lines rather than truncate.
- `WeightInput` / `HeightInput` / `IntegerInput` (`UnitFields`) — number fields in the person's unit that report metric; stones and feet get two boxes. `variant="hero"` is the big inset well used to weigh in.
- `SectionHeader` — 20pt title with a trailing note.
- `Icon` — SF Symbol wrapper.
- `AppMark` — the brand mark from the app icon, drawn in SVG; `tile` puts it on the orange icon tile.
- `SheetFooter` — the pinned action bar on a sheet; rides above the keyboard.
- `QuickLogBar` — the tab bar's bottom accessory: “Log a meal” with Speak and Photo on every tab except Log (which has them in its card); two icons when minimised.
- `RecordingBar` — what Log's composer becomes while listening: ✕ cancel, a live waveform with elapsed time, ✓ finish. No labels.
- Log's composer is one card in three states. The title follows the meal (“What's for lunch?”). **Empty:** the field and two equal capture tiles, Speak and Photo (a soft accent tile with the symbol in an accent disc). **Listening:** the words as plain text (never an editable field — a focused field that turns into live text jumps the page), the meal building up below, and `RecordingBar`; the card's edge and halo glow with the voice level. **With text:** a 32 pt gray ✕ in the title row clears it, then `MealPlate`, then one full-width Review (✦ when it will use the AI). No stacked buttons.
- `MealPlate` — the meal taking shape: an optional As heard / With AI `Segmented` (only when the instant match is unsure and a key is saved; With AI dims the preview), an inset tray of foods (each with its `MacroRing`, name up to two lines, portion, kcal) ending in an accent “Add more” mic row, then the total with a `MacroBar` and a Protein / Carbs / Fat legend.
- `MacroRing` — a food's calories split into protein, carbs, and fat as a 30 pt ring with 2 pt gaps; dashed gray when the food wasn't found.
- `MacroBar` — the same split as a stacked capsule with 2 pt gaps.
- Source badges — a 22 pt rounded square right after an item's name, so every name starts on the same line: ✦ AI estimate (accent), pencil edited, person My Foods. Never a text tag among the nutrients.
- Nutrient totals — macros (with color dots) and fiber / sugar / saturated fat / sodium share one type style; extra nutrients are a second row, not a footnote.
- `PhotoScan` — the photo being estimated, with a sweep and named stages; errors offer Retry.
- `ToastHost` — one short message above the tab bar, with an optional action (“Undo”). Mounted at the root.
- `GlassButton` — capsule. Primary is accent-tinted Liquid Glass on iOS 26 (solid accent elsewhere) with a soft accent lift. Secondary is a white capsule — clear glass on a flat page has nothing to refract and reads as missing. One primary per screen.

## Motion and feedback

Springs from `tokens.springs` for rings, bars, and segmented thumbs; all check `useReducedMotion()`. Haptics: selection on day / segment / step / scrub, light-medium impact on buttons, success on log and weigh-in, error on a failed estimate. Delight moments are tied to the job: the staged "Finding foods → Estimating portions → Adding up macros" scan, and the check-mark confirmation when a meal is logged.

## Sheets

Review, Search, and the food editor are page sheets (`presentation: 'modal'`) with the native header (glass close, or Cancel/Save) and, for Search, the native search field. Memoise their `Stack.Screen` options. Confirming closes the sheet and shows a toast with Undo — no full-screen celebration. Don't use `formSheet` for a sheet with a pinned footer — react-native-screens resizes its first ScrollView to the whole sheet.

## Keyboard

`react-native-keyboard-controller` owns it (`KeyboardProvider` at the root). Every screen with a text field scrolls in `KeyboardAwareScrollView` (except Log — below) — never `automaticallyAdjustKeyboardInsets` or `KeyboardAvoidingView`, which jump or mis-measure inside native stacks and sheets. `bottomOffset` 24; 64 where iOS adds a bar above the keyboard that isn't counted in its height (number pad Done, Passwords). Composers that change height while focused also set `disableScrollOnKeyboardHide`. `SheetFooter` rides the keyboard in a `KeyboardStickyView`. Search's native field is `placement: 'stacked'` so it sits under the title, clear of the footer. Log uses a plain `ScrollView` with a keyboard-height spacer at the end: its field is the first thing on the page, so nothing needs to scroll it into view, and `KeyboardAwareScrollView` jumped the page when the focused field became live text. Never give a multiline field `scrollEnabled={false}` inside a page scroll view — iOS then scrolls the page to show its caret.

## Text size

Check every screen at `accessibility-medium` (`xcrun simctl ui booted content_size accessibility-medium`, then relaunch). Hero numbers and segmented labels are one line and shrink to fit; units sit in a minimum-width column that widens rather than breaking “kcal”; a row of equal chips stacks vertically from `fontScale` 1.35; a number and its unit wrap as a pair. Portions read as people say them: “½ avocado”, “1½ cups”.

## Layout

Horizontal gutter `spacing.gutter` (20). Scroll views use `contentInsetAdjustmentBehavior="automatic"` so content starts under the large title and clears the tab bar. The automatic inset doesn't count the Log a meal bar above the tab bar, so every tab screen that shows it (all but Log) ends with `paddingBottom: spacing.tabBottom`. Card stacks use 10–12pt gaps; sections open with `SectionHeader` (24pt above).

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
