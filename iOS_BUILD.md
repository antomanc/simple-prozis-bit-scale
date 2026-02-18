# iOS Build + Run (Physical iPhone)

This app uses BLE, so you must run on a physical iPhone (the iOS Simulator cannot use Bluetooth).

## Prerequisites (Mac)

- Xcode 15+ installed
- Xcode Command Line Tools installed: `xcode-select --install`
- CocoaPods installed (recommended via Homebrew): `brew install cocoapods`
- Node.js + npm installed

## First-time setup

From the project root:

```bash
npm install
```

Generate the iOS native project and install pods:

```bash
npx expo prebuild --platform ios
npx pod-install
```

## Run on your iPhone

1) Plug your iPhone into your Mac via USB.

2) Trust the computer on your iPhone.

3) Open the generated Xcode project:

```bash
open ios/*.xcworkspace
```

4) In Xcode:

- Select your iPhone as the run target.
- Go to Signing & Capabilities and select your Apple Developer Team.

5) Start the dev server (project root):

```bash
npx expo start
```

6) Build + install the dev build on your phone:

```bash
npm run ios
```

## Common issues

- If you see Bluetooth permission errors, confirm iOS shows the Bluetooth permission prompt and that Bluetooth is enabled.
- If Xcode complains about signing, set a Team under Signing & Capabilities for the app target.
- If pods fail, try rerunning `npx pod-install`.
