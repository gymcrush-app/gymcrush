import type { Href, Router } from 'expo-router';
import { useRevenueCatStore } from '@/lib/stores/revenueCatStore';

// Cast: typedRoutes union regenerates on next `expo start`, after which
// '/paywall' will resolve via the generated route map.
const PAYWALL: Href = '/paywall' as Href;

/**
 * Runs `action` if the user has Plus, otherwise pushes the paywall modal.
 *
 *   gatePlus(() => openPremiumFeature(), router)
 *
 * Read-only access to the store — does NOT subscribe a component.
 */
export function gatePlus(action: () => void, router: Router) {
  if (useRevenueCatStore.getState().isPlus) {
    action();
  } else {
    router.push(PAYWALL);
  }
}
