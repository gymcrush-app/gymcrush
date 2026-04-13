# Login version/build footer Implementation Plan
 
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
 
**Goal:** Replace the Supabase URL footer on the auth screens with `v<version> (build <build>)`.
 
**Architecture:** Read version/build from `expo-constants` at runtime with safe fallbacks, format as `v${version} (build ${build})`, and render that string where `{supabaseUrl}` was previously displayed.
 
**Tech Stack:** Expo SDK 54, `expo-constants`, React Native, expo-router.
 
---
 
### Task 1: Add app version label helper
 
**Files:**
- Create: `lib/utils/appVersion.ts`
 
- [ ] **Step 1: Add helper using `expo-constants`**
 
```ts
import Constants from "expo-constants"
 
type AppVersionInfo = {
  version: string | null
  build: string | null
}
 
export function getAppVersionInfo(): AppVersionInfo {
  const version =
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    null
 
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    (Constants.expoConfig?.android?.versionCode != null
      ? String(Constants.expoConfig.android.versionCode)
      : null)
 
  return { version, build }
}
 
export function getAppVersionLabel(): string {
  const { version, build } = getAppVersionInfo()
  if (!version && !build) return ""
  if (version && build) return `v${version} (build ${build})`
  if (version) return `v${version}`
  return `build ${build}`
}
```
 
### Task 2: Replace Supabase URL footer on auth screens
 
**Files:**
- Modify: `app/(auth)/login.tsx`
- Modify: `app/(auth)/signup.tsx`
 
- [ ] **Step 1: Update footer text**
  - Remove `supabaseUrl` import where no longer needed.
  - Import `getAppVersionLabel` and render it in the footer `Text`.
  - Keep existing styling/ellipsis props.
 
### Task 3: Verification
 
**Files:**
- Lint: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `lib/utils/appVersion.ts`
 
- [ ] **Step 1: Run lint**
 
Run: `npm run lint`
 
Expected: no new lint errors in edited files.
