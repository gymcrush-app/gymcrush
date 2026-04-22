import { create } from 'zustand';
import type { CustomerInfo, PurchasesOffering, PurchasesOfferings } from 'react-native-purchases';
import { buildMockCustomerInfo } from '@/lib/revenueCat/devMock';

interface RevenueCatState {
  // Raw RC state
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  offeringsError: string | null;

  // Derived — fail-closed until RC SDK reports in
  isPlus: boolean;

  // Lifecycle
  isConfigured: boolean;
  isLoading: boolean;

  // Actions
  setCustomerInfo: (info: CustomerInfo | null) => void;
  setOfferings: (offerings: PurchasesOfferings | null) => void;
  setOfferingsError: (err: string | null) => void;
  setConfigured: (configured: boolean) => void;
  setLoading: (loading: boolean) => void;
  /** DEV-ONLY: simulate a successful purchase by injecting a mock CustomerInfo. */
  simulateDevPurchase: (productId: string) => void;
  reset: () => void;
}

const ENTITLEMENT_ID = 'plus';

function computeIsPlus(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return info.entitlements.active[ENTITLEMENT_ID]?.isActive === true;
}

export const useRevenueCatStore = create<RevenueCatState>((set) => ({
  customerInfo: null,
  offerings: null,
  currentOffering: null,
  offeringsError: null,
  isPlus: false,
  isConfigured: false,
  isLoading: false,

  setCustomerInfo: (info) =>
    set({
      customerInfo: info,
      isPlus: computeIsPlus(info),
    }),

  setOfferings: (offerings) =>
    set({
      offerings,
      currentOffering: offerings?.current ?? null,
      offeringsError: null,
    }),

  setOfferingsError: (offeringsError) => set({ offeringsError }),

  setConfigured: (isConfigured) => set({ isConfigured }),
  setLoading: (isLoading) => set({ isLoading }),

  simulateDevPurchase: (productId) => {
    const info = buildMockCustomerInfo(productId);
    console.log('[RC-DEBUG] simulateDevPurchase', {
      productId,
      entitlement: 'plus',
      expirationDate: info.latestExpirationDate,
    });
    set({ customerInfo: info, isPlus: computeIsPlus(info) });
  },

  reset: () =>
    set({
      customerInfo: null,
      offerings: null,
      currentOffering: null,
      offeringsError: null,
      isPlus: false,
    }),
}));
