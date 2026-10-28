# Macrolens — Design System: "Liquid Glass"

Visual language spec for the glass UI. This is what every component in
`src/components/glass/` and every screen should conform to.

## Principles

1. **Depth through light, not borders.** Surfaces are distinguished by
   blur + subtle luminance, not hard outlines. A 1px border is allowed only
   as a faint highlight (see "Edge highlight" below), never a flat solid
   line.
2. **Dark-first.** Base canvas is near-black (`#0A0A0C`). Glass surfaces
   are translucent light layered on top, so they read as "floating" over
   the dark canvas — this is what makes blur read as *glass* rather than
   *frosted paper*.
3. **One accent, used sparingly.** Coral→amber gradient (`accent` /
   `accentSecondary` in `theme/colors.ts`) for primary actions and the
   calorie ring. Macro rings (protein/carbs/fat) get their own fixed
   colors so they're always identifiable at a glance across screens.
4. **Motion is physical, not linear.** Use `react-native-reanimated`
   spring configs (not `Easing.linear`/`timing`) for anything that moves —
   sheet presentations, tab transitions, the macro rings filling. Target
   feel: iOS's own spring curves (damping ~15-20, stiffness ~150-200 as a
   starting point, tune by feel).

## Core surface: the Glass Card

Built from, in z-order:

1. `BlurView` (from `expo-blur`), `intensity` 40-60 on dark mode, `tint="dark"`.
2. A translucent fill on top of the blur — `colors.glassLight` /
   `glassMedium` / `glassStrong` depending on elevation (modals, floating
   action buttons = strongest fill since they need to stand out most).
3. A **1px edge highlight**: `colors.glassBorder` as the base border, with
   an extra lighter gradient stroke (`glassHighlight` → transparent) along
   just the *top* edge to simulate a light source from above. This is the
   single most important detail that sells "glass" vs. "grey box."
4. Border radius: 20-28px for cards, 16px for small chips/buttons, full
   pill (999) for tab bars and primary CTAs.
5. Shadow: soft, large-radius, low-opacity black shadow *beneath* the card
   (`shadowRadius` 24+, `shadowOpacity` 0.25-0.35) to lift it off the
   canvas — glass without a shadow looks flat/pasted-on.

## Typography

- Primary: system font (`San Francisco` via RN's default on iOS — do not
  substitute a webfont, the system font is part of the iOS-native feel).
- Scale: Large Title 34/Bold for screen headers, Title 22/Semibold for
  section headers, Body 17/Regular for content, Caption 13/Medium for
  metadata (timestamps, units).
- Numbers (calories, macros, weight) always use a slightly heavier weight
  than surrounding text and tabular/monospaced figures where the layout is
  a list of numbers (so digits align) — standard nutrition-app convention.

## Color usage

See `theme/colors.ts` for the literal token values. Rules for *using* them:

- Macro rings: protein = coral (`colors.protein`), carbs = sky blue
  (`colors.carbs`), fat = amber (`colors.fat`). These three are fixed and
  never reassigned — users build muscle memory for "blue = carbs."
- Calorie ring/number: neutral white/`textPrimary`, not colored — it's the
  "total," the three macros are the "parts," visually distinct from them.
- Success (`colors.success`) only for positive trend confirmations (e.g.
  "on track this week"). Warning/danger reserved for the adaptive-plan
  screen's "you're behind pace" messaging — never used for routine UI.

## Key components to build (src/components/glass/)

| Component | Notes |
|---|---|
| `GlassCard` | The base primitive described above; everything else wraps it. |
| `GlassButton` | Primary (accent-gradient fill) and secondary (glass fill) variants. |
| `GlassTabBar` | Bottom tab bar, pill-shaped glass, floats above content with margin, not edge-to-edge. |
| `MacroRing` | Animated circular progress ring, supports the 4-ring stack (calories center, macros around or as separate rings per screen — finalize in-screen when built). |
| `GlassSheet` | Bottom-sheet/modal surface for the food-review screen — this is the single most-used surface in the app (review-before-save flow), deserves its own polish pass. |
| `GlassInput` | Text input with glass fill, used sparingly (most interaction is tap/slider, not typing, to keep logging fast). |

## Reference inspiration (not to copy pixel-for-pixel, but calibrate against)

- iOS 18/26 system UI "Liquid Glass" redesign — Control Center, widgets.
- Apple Fitness app's ring UI for the macro-ring component specifically.
- MacroFactor's "Plate" review screen for layout/interaction pattern of the
  food-review-before-save flow (not visual style — MacroFactor is flat/
  light-mode, we are glass/dark-mode).

## Anti-patterns (don't do this)

- Hardcoding a color/spacing value inline in a screen component instead of
  importing from `theme/`.
- Flat, opaque card backgrounds with a drop shadow but no blur — that's
  "material design card," not glass.
- Overusing the accent color — if more than ~2 elements per screen are
  accent-colored, it's not an accent anymore.
- Linear/`Easing.out` transitions on anything the user's finger just
  touched (buttons, sheets, drags) — must feel spring-driven.
