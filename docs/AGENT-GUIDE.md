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
│   │   ├── navigation/   # React Navigation stacks/tabs
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
- **Design tokens live in `src/theme/`, never hardcode colors/spacing in
  components.** The whole point of the glass aesthetic is consistency;
  one-off magic numbers break it fast.
- **Glass components wrap `expo-blur`'s `BlurView`.** Build reusable
  primitives (`GlassCard`, `GlassButton`, `GlassTabBar`) in
  `src/components/glass/` rather than inlining BlurView everywhere.
- **State:** Zustand stores per domain (`useFoodLogStore`, `useUserStore`,
  `usePlanStore`). Keep stores thin — business logic (macro math, TDEE calc)
  lives in `src/utils/`, stores just hold state + call utils.
- **AI vision calls are server-side**, never call the vision API directly
  from the RN app with an embedded key. The app calls our backend, which
  calls the vision provider. See `docs/DECISIONS.md` for provider choice.
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
npx expo start            # dev server (scan QR with Expo Go, or press i/a)
npx expo install <pkg>     # install a native-module-aware package (not npm install)
npx tsc --noEmit            # typecheck
```

## Current status

See `docs/DECISIONS.md` for the running log. As of repo creation: Expo app
scaffolded (blank-typescript template), core deps installed (navigation,
camera/image-picker, blur, reanimated, zustand), glass UI primitives and
4 core screens built, expo-doctor 20/20 passing, tsc clean. Backend and
vision AI integration not yet started.
