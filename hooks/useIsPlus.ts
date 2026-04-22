import { useRevenueCatStore } from '@/lib/stores/revenueCatStore';

/**
 * Canonical client-side "does this user have Plus?" check.
 *
 * Reads from the Zustand store mirrored by `RevenueCatProvider`. Returns
 * `false` while loading — fail closed. For server-trusted checks (edge
 * functions, RPCs), call the `public.is_plus(uid)` Postgres RPC instead.
 */
export function useIsPlus(): boolean {
  return useRevenueCatStore((s) => s.isPlus);
}
