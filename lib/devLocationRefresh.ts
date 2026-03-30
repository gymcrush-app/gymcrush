/**
 * Dev-only: allows triggering a location refresh from anywhere (e.g. Profile dev button)
 * so the root layout's useLocation/useSyncLastLocation see the new override immediately.
 */
let devLocationRefreshFn: (() => void) | null = null;

export function registerDevLocationRefresh(fn: (() => void) | null): void {
  devLocationRefreshFn = fn;
}

export function triggerDevLocationRefresh(): void {
  devLocationRefreshFn?.();
}
