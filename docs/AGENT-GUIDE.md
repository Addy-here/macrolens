# Macrolens — Agent Operating Guide

This file is read by any AI coding agent (Claude Code, Codex, etc.) working
on this repo. It's the persistent memory of *how* to work on Macrolens, not
*what* it does (see `README.md` / `docs/PRODUCT.md` for that).

## What this project is

An iOS-first (React Native/Expo) food & weight tracking app. Take a photo of
food → AI estimates portions and macros/micros → user reviews/adjusts →
logged. Weekly adaptive weight-loss plan recalculates targets from actual
trend data (inspired by MacroFactor's model — see `docs/DECISIONS.md`).

## Repo layout

```
macrolens/
├── app/                  # Expo React Native app (the only app for now)
│   ├── src/
│   │   ├── screens/      # One file per screen, PascalCase, suffix "Screen"
│   │   ├── components/   # Reusable UI, especially glass-surface primitives
│   │   ├── navigation/   # TabStack: native large-title stack per tab
│   │   ├── data/         # On-device food reference (foods, foodsMore, foodNutrients)
│   │   ├── dev/          # Dev-only sample data, DevBridge, dev commands
│   │   ├── store/        # Zustand stores (one per domain: logs, user, plan)
│   │   ├── theme/         # Design tokens: colors, spacing, typography, glass
│   │   ├── services/      # API clients: backend, vision AI, health kit
│   │   ├── types/          # Shared TS types/interfaces
│   │   ├── utils/           # Pure helper functions
│   │   └── hooks/            # Custom React hooks
│   ├── App.tsx
│   └── app.json
├── backend/               # (to be scaffolded) Node/Express API + DB
├── docs/
│   ├── PRODUCT.md          # What we're building, feature scope, v1 vs v2
│   ├── DECISIONS.md         # Architecture Decision Records (ADRs), append-only
│   ├── DESIGN-SYSTEM.md      # Glass UI spec: colors, blur, motion, components
│   └── AGENT-GUIDE.md        # this file (repo working conventions)
```

## Working conventions

- **Always read `docs/DECISIONS.md` before changing architecture.** If you
  make a new non-trivial technical choice (library, pattern, data model),
  append a new dated entry there — don't just make the choice silently.
- **Design tokens live in `src/theme/`.** Before changing screens, color,
  or layout, read `.cursor/skills/macrolens-design/SKILL.md` and
  `docs/DESIGN-SYSTEM.md`. Grouped lists on black, one tint for actions,
  macro colors only for protein/carbs/fat. Do not put blur on every row.
  The system tab bar is the only glass pill.
- **State:** Zustand stores per domain (`useFoodLogStore`, `useUserStore`,
  `usePlanStore`). Keep stores thin — business logic (macro math, TDEE calc)
  lives in `src/utils/`, stores just hold state + call utils.
- **AI is bring-your-own-key.** The user's key lives in the iOS keychain
  (`expo-secure-store`) and the app calls the provider they chose. Never
  embed a Macrolens-owned key. A backend proxy can replace this later;
  until then do not route around BYOK. See the BYOK ADR in
  `docs/DECISIONS.md`.
- **Review-before-save is a hard product requirement** (this is the #1
  reason MacroFactor beats Cal AI in head-to-head reviews — see PRODUCT.md).
  Never auto-commit an AI food estimate straight to the log.
- Node/npm commands on this sandbox can be slow for destructive ops
  (`rm -rf node_modules` has timed out at 60s+ here before) — run those with
  `background=true` rather than assuming failure.

## Commands

```bash
cd app
npm install              # install deps
npx expo start            # dev server; opens the Macrolens dev build (not Expo Go)
npx expo install <pkg>     # install a native-module-aware package (not npm install)
npx tsc --noEmit            # typecheck
```

### Running the app (development build, not Expo Go)

Macrolens uses native modules Expo Go doesn't ship (`expo-speech-recognition`),
so it runs as its own development build. `ios/` is generated (CNG) and
git-ignored.

```bash
brew install cocoapods     # once per Mac
npx expo run:ios           # first time, and after adding/upgrading a native module
npx expo start             # every day after that; press i to open the dev build
npm test                   # parser, logging flow, review store (jest-expo)
npm run typecheck
```

### Looking at the app in the simulator

Run Metro yourself (`npx expo start`; not `CI=1`, which turns off file
watching so edits never reach the app). Launch the dev build straight onto
it — no deep link, so no "Open in Macrolens?" prompt:

```bash
xcrun simctl launch booted com.adwaitmahadar.macrolens --initialUrl http://127.0.0.1:8081
xcrun simctl spawn booted defaults write com.adwaitmahadar.macrolens EXDevMenuShowsAtLaunch -bool false
```

The dev-only `DevBridge` (`src/dev/DevBridge.tsx`) polls a command file in
the app's Documents folder:

```bash
C=$(xcrun simctl get_app_container booted com.adwaitmahadar.macrolens data)
echo "seed=1&go=/plan&y=500" > "$C/Documents/dev-command.txt"   # sample data, a tab, scrolled
echo "say=two%20eggs%20and%20toast" > "$C/Documents/dev-command.txt"  # prefill Log
echo "action=log.review" > "$C/Documents/dev-command.txt"       # run a registered screen action
xcrun simctl io booted screenshot shot.png
```

Keys: `seed`, `clear`, `go` (URL-encoded route), `y` (`-1` scrolls to the
end; iOS doesn't clamp a large offset), `scroll` (`screen:y`, scrolls an open
screen without navigating, e.g. `plan-editor:1200`), `units` (`metric`,
`us`, `uk`, `au`, or `weight:st,energy:kJ`), `checkin` (make the weekly
check-in due), `quick` (run a Home Screen quick action: `speak`, `photo`,
`search`, `weigh`; long-press can't be done headless), `review`, `action`,
`aikey` (1/0: act as if an AI key is saved — real requests still fail),
`say` (prefill Log), `speak` (a WAV path to transcribe instead of the mic;
16 kHz mono, e.g. `say -o x.aiff "…"` + `afconvert -f WAVE -d LEI16@16000
-c 1`). Actions registered with `useDevAction`: `log.review`,
`log.reviewAsHeard`, `log.stop`, `review.confirm`, `review.delete`,
`review.editFirst`, `editor.save`, `today.editFirst`, `today.deleteFirst`,
`today.addLunch`, `search.addFirst`, `settings.export`, `toast.action`,
`log.simulateListening` (fakes a voice level and transcript, since real
recognition can't run in this simulator), `log.focus`, `log.simulatePhoto`,
`log.simulatePhotoError`, `log.pickHeard`, `log.blur`, `plan.focusWeight`,
`settings.focusKey` (on `/settings/ai`; the last two open the keyboard on that
field), `plan.saveWeight`, `plan.checkIn`, `planEditor.fill` (types weights,
since the simulator can't), `planEditor.save`, `planEditor.maintain`,
`planEditor.gain`, `planEditor.customMacros`, `planEditor.customTarget`,
`planEditor.weekends`, `weighIn.save`, `reminders.demo` (turns on breakfast
and a Mon/Wed/Fri weigh-in without the permission prompt, which can't be
answered here).

Fast Refresh doesn't pick up changes to theme tokens (`spacing`, `colors`)
used in `StyleSheet.create`; relaunch the app before judging them.
Notification permission can't be granted in the simulator, so reminder
scheduling is covered by `src/services/__tests__/reminders.test.ts`.

Test keyboard behaviour with the on-screen keyboard. If focusing a field
shows no keyboard, the simulator thinks a hardware keyboard is attached and
keyboard libraries mis-measure, so page jumps you see then aren't real.
Shut the simulator down, run `plutil -replace HardwareKeyboardLastSeen -bool NO
~/Library/Developer/CoreSimulator/Devices/<udid>/data/Library/Preferences/com.apple.keyboard.preferences.plist`,
and boot it again.

Before calling UI work done, capture every screen it touches empty, filled,
with the keyboard up, and at large text
(`xcrun simctl ui booted content_size accessibility-medium`, relaunch the
app, and set it back to `large` afterwards). The dev menu's floating button
is off (`EXDevMenuShowFloatingActionButton` in `app.json`); if an older
build still shows it over the sheets' top-right buttons, run
`xcrun simctl spawn booted defaults write com.adwaitmahadar.macrolens EXDevMenuShowFloatingActionButton -bool false`.

Known simulator limits:
- The iOS 27 simulator's on-device speech model is broken (missing
  `mini.json` in its Siri Understanding asset), so recognition fails there
  with "Failed to initialize recognizer" — from the mic or a file. Test
  voice on a device (`npx expo run:ios --device`). Everything after the
  transcript can be tested with `/log?text=…`.
- Microphone and speech-recognition permission can't both be granted with
  `simctl privacy`. With the simulator shut down, set them in its TCC
  database: `sqlite3 ~/Library/Developer/CoreSimulator/Devices/<udid>/data/Library/TCC/TCC.db`
  (`kTCCServiceMicrophone`, `kTCCServiceSpeechRecognition`, `auth_value=2`).

## Current status

See `docs/DECISIONS.md` for the running log. As of repo creation: Expo app
scaffolded (blank-typescript template), core deps installed (navigation,
camera/image-picker, blur, reanimated, zustand), glass UI primitives and
4 core screens built, expo-doctor 20/20 passing, tsc clean. Backend and
vision AI integration not yet started.
