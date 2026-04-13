import Constants from "expo-constants"

type AppVersionInfo = {
  version: string | null
  build: string | null
}

function normalizeMeta(value: string | number | null | undefined): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

export function getAppVersionInfo(): AppVersionInfo {
  const version =
    normalizeMeta(Constants.nativeAppVersion) ?? normalizeMeta(Constants.expoConfig?.version) ?? null

  const build =
    normalizeMeta(Constants.nativeBuildVersion) ??
    normalizeMeta(Constants.expoConfig?.ios?.buildNumber) ??
    normalizeMeta(Constants.expoConfig?.android?.versionCode) ??
    null

  return { version, build }
}

export function getAppVersionLabel(): string {
  const { version, build } = getAppVersionInfo()

  if (!version && !build) return ""
  if (version && build) return `v${version} (build ${build})`
  if (version) return `v${version}`
  return `build ${build}`
}

