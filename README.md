# Macrolens

AI-powered food and weight tracker with an iOS "Liquid Glass" UI. Take a
photo of your meal, get an instant portion/macro/micro estimate you can
review and adjust, and get weekly-adaptive weight-loss plans based on your
actual measured progress — not a static formula.

## Why

Most calorie trackers make you choose between **fast photo logging**
(Cal AI) and **accurate, adaptive coaching** (MacroFactor). Macrolens aims
for both: a mandatory review-before-save step so AI estimates never get
silently logged wrong, plus a weekly-recalculated plan that adjusts targets
based on your real weight trend vs. predicted.

See `docs/PRODUCT.md` for the full spec and competitive research, and
`docs/DESIGN-SYSTEM.md` for the UI spec.

## Stack

- **App:** React Native (Expo, managed workflow), TypeScript
- **Navigation:** React Navigation (native-stack + bottom-tabs)
- **State:** Zustand
- **UI:** Custom glass components on `expo-blur` + `expo-linear-gradient` +
  `react-native-reanimated`
- **Backend:** Node/Express (planned, not yet scaffolded — see
  `docs/DECISIONS.md`)
- **Vision AI:** Cloud vision API, provider TBD (see `docs/DECISIONS.md`)

## Getting started

```bash
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go on an iOS device, or press `i` for the iOS
simulator (requires Xcode on macOS).

## Project docs

| File | What's in it |
|---|---|
| `docs/PRODUCT.md` | Feature scope, competitive research, v1 definition |
| `docs/DECISIONS.md` | Architecture decision log (append-only) |
| `docs/DESIGN-SYSTEM.md` | Glass UI visual spec |

## Status

Early scaffold. App shell + design tokens + core navigation structure in
progress. Backend and vision AI integration not yet started.
