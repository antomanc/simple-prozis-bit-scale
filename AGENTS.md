# Repo Agent Guide (simple-prozis-bit-scale)

This repository is an Expo + React Native app (TypeScript) that connects to a BLE scale.

## Quick Commands

- Install deps (canonical): `npm install`
- Start dev server: `npm run start` (runs `expo start`)
- Run on Android: `npm run android` (runs `expo run:android`)
- Run on iOS: `npm run ios` (runs `expo run:ios`)
- Run on web: `npm run web` (runs `expo start --web`)
- Lint: `npm run lint` (runs `expo lint`)

Command sources:
- Scripts: `package.json`
- iOS physical device setup: `iOS_BUILD.md`

## Tests

There is currently no test runner configured (no `test` script in `package.json`, no Jest/Vitest/Playwright config found, and no `*.test.*` / `*.spec.*` files).

If you add a test framework later, also add a `test` script to `package.json` and document:
- how to run a single file
- how to run a single test by name/pattern

## Lint / Format

- Lint entrypoint: `npm run lint` (Expo-managed ESLint)
- ESLint config: `eslint.config.js` (flat config, `eslint-config-expo/flat`)
- Prettier config exists: `.prettierrc`

Note: Prettier is configured via `.prettierrc`, but there is no `format` script in `package.json`.

## Editor / IDE Rules

VS Code workspace config: `.vscode/settings.json`

- Save-time actions are set to `explicit`:
  - `source.fixAll`: explicit
  - `source.organizeImports`: explicit
  - `source.sortMembers`: explicit

Meaning: agents should not assume imports/formatting are auto-fixed on save; run lint or apply formatting intentionally.

## Cursor / Copilot Instructions

- Cursor rules: none found (`.cursorrules` and `.cursor/rules/` not present)
- Copilot instructions: none found (`.github/copilot-instructions.md` not present)

If these files are added later, keep this section in sync.

## Project Structure

- `app/`: Expo Router entrypoints (see `app/_layout.tsx`)
- `components/`: UI components (e.g. `components/ScaleScanner.tsx`)
- `hooks/`: React hooks (e.g. `hooks/useBle.ts`)
- `hooks/bleProtocol.ts`: BLE protocol constants + payload decoding
- `constants/`: shared constants (e.g. `constants/Colors.ts`)
- `scripts/`: local scripts (e.g. `scripts/reset-project.js`)

## TypeScript Guidelines

- TypeScript strict mode is enabled (`tsconfig.json` has `"strict": true`).
- Prefer explicit state types when nullable (pattern used in `hooks/useBle.ts`):
  - `const [weight, setWeight] = useState<number | null>(null);`
  - `const [device, setDevice] = useState<Device | null>(null);`
- In `catch` blocks, keep errors typed as `unknown` and narrow:
  - Pattern: `const getErrorMessage = (error: unknown) => ...`
- Avoid suppressing types (`as any`, `@ts-ignore`, `@ts-expect-error`).

## Imports

- Use ESM `import` syntax everywhere.
- Prefer `type` imports for type-only symbols (seen in `components/ThemedText.tsx`):
  - `import { ..., type TextProps } from 'react-native';`
- Keep imports grouped and stable. This repo primarily uses relative imports.
- There is a `@/*` path alias configured in `tsconfig.json`, but it is not widely used in current files.

## Formatting (Prettier)

The repo's `.prettierrc` is the formatting contract:

- Semicolons: on (`semi: true`)
- Single quotes: on (`singleQuote: true`)
- Trailing commas: all (`trailingComma: all`)
- Print width: 80
- Indentation: 2 spaces, no tabs
- Arrow parens: always
- Line endings: LF

When modifying files, keep formatting consistent with these rules.

## React / React Native Conventions

- Components are function components.
- Hooks:
  - Name hooks `useX` (see `hooks/useBle.ts`).
  - Wrap callbacks with `useCallback` when passed to effects/handlers.
  - Prefer `useRef` for mutable instance state (e.g. `BleManager` and subscriptions in `hooks/useBle.ts`).
- Styling:
  - Prefer `StyleSheet.create` (see `components/ScaleScanner.tsx`, `components/ThemedText.tsx`).
  - Inline styles are used sparingly for small, dynamic tweaks.
- Theming:
  - UI uses `react-native-paper` (`PaperProvider`, `useTheme`).
  - Reuse theme colors rather than hard-coded colors.
  - Text should go through `components/ThemedText.tsx` for consistent typography.
- Accessibility:
  - Keep/extend `accessibilityLabel` usage for actionable UI (pattern in `components/ScaleScanner.tsx`).

## Error Handling and Logging

- Prefer user-visible error reporting for BLE operations:
  - Use `react-native-toast-message` for errors (pattern in `hooks/useBle.ts`).
- Avoid empty `catch` blocks; if you must ignore an error, document why and/or handle a safe fallback.
- Use `console.error` sparingly; prefer consistent user-facing messaging plus a useful log for debugging.

## BLE / Platform Gotchas

- BLE requires a physical device; iOS Simulator cannot use Bluetooth (documented in `iOS_BUILD.md`).
- Android BLE requires runtime permissions (see `hooks/useBle.ts`). If you change permissions, update both:
  - `app.json` android permissions
  - runtime permission request logic

## App UX Notes

- Auto-save is user-togglable (stability hold). It should ignore near-zero noise and can record removals as negative weights.

## iOS Build Notes (Physical Device)

See `iOS_BUILD.md` for the authoritative steps.

Key flow:

- Install: `npm install`
- Prebuild + pods (first time / native changes):
  - `npx expo prebuild --platform ios`
  - `npx pod-install`
- Start dev server: `npx expo start` (or `npm run start`)
- Install dev build to device: `npm run ios`

## Making Changes Safely (Agent Checklist)

- Keep changes minimal and consistent with existing patterns.
- Update both code and docs if you change developer workflow (`package.json` scripts, iOS steps, permissions).
- Run `npm run lint` after edits.
- If you introduce tests, also add:
  - `npm run test`
  - a documented "run one test" recipe in this file
