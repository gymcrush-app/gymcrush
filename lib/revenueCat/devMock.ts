import type { CustomerInfo, PurchasesOffering, PurchasesOfferings } from 'react-native-purchases';
import { PACKAGE_TYPE, PRODUCT_CATEGORY, PRODUCT_TYPE } from 'react-native-purchases';

/**
 * Dev-only mock offering. Used when `getOfferings` fails on the iOS simulator
 * (RC v5 drops offerings entirely when StoreKit can't resolve products — a
 * change from v4 that the simulator is unable to satisfy without a properly
 * wired .storekit config). The mock lets the UI render realistic data so we
 * can iterate on the paywall without fighting Xcode scheme configuration.
 *
 * Shape mirrors `com.gymcrushdating.app` ASC catalog.
 */

function buildPackage(
  packageId: string,
  packageType: PACKAGE_TYPE,
  productId: string,
  title: string,
  priceString: string,
  price: number,
  subscriptionPeriod: string,
  offeringIdentifier: string,
) {
  const presentedContext = {
    offeringIdentifier,
    placementIdentifier: null,
    targetingContext: null,
  };
  return {
    identifier: packageId,
    packageType,
    offeringIdentifier,
    presentedOfferingContext: presentedContext,
    product: {
      identifier: productId,
      description: `Unlock GymCrush Plus features — ${title}.`,
      title,
      price,
      priceString,
      currencyCode: 'USD',
      introPrice: null,
      discounts: null,
      productCategory: PRODUCT_CATEGORY.SUBSCRIPTION,
      productType: PRODUCT_TYPE.AUTO_RENEWABLE_SUBSCRIPTION,
      subscriptionPeriod,
      defaultOption: null,
      subscriptionOptions: null,
      presentedOfferingIdentifier: offeringIdentifier,
      presentedOfferingContext: presentedContext,
      pricePerWeek: null,
      pricePerMonth: null,
      pricePerYear: null,
      pricePerWeekString: null,
      pricePerMonthString: null,
      pricePerYearString: null,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

export function buildMockOfferings(): PurchasesOfferings {
  const offeringId = 'default';

  const monthly = buildPackage(
    '$rc_monthly',
    PACKAGE_TYPE.MONTHLY,
    'gymcrush_plus_monthly',
    'GymCrush Plus (Monthly)',
    '$14.99',
    14.99,
    'P1M',
    offeringId,
  );
  const threeMonth = buildPackage(
    '$rc_three_month',
    PACKAGE_TYPE.THREE_MONTH,
    'gymcrush_plus_3month',
    'GymCrush Plus (3 Months)',
    '$29.99',
    29.99,
    'P3M',
    offeringId,
  );
  const annual = buildPackage(
    '$rc_annual',
    PACKAGE_TYPE.ANNUAL,
    'gymcrush_plus_annual',
    'GymCrush Plus (Annual)',
    '$83.99',
    83.99,
    'P1Y',
    offeringId,
  );

  const availablePackages = [monthly, threeMonth, annual];

  const offering: PurchasesOffering = {
    identifier: offeringId,
    serverDescription: '[DEV MOCK] default offering',
    metadata: { dev_mock: true },
    availablePackages,
    lifetime: null,
    annual,
    sixMonth: null,
    threeMonth,
    twoMonth: null,
    monthly,
    weekly: null,
    paywall_components: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return {
    all: { [offeringId]: offering },
    current: offering,
  };
}

/**
 * Dev-only mock CustomerInfo with an active "plus" entitlement. Used to
 * simulate a completed purchase in simulator when RC can't actually process
 * one. Expires 30 days out so the app's pre-renewal logic can also be tested.
 */
export function buildMockCustomerInfo(productId: string): CustomerInfo {
  const now = new Date();
  const expiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const entitlement = {
    identifier: 'plus',
    isActive: true,
    willRenew: true,
    periodType: 'TRIAL',
    latestPurchaseDate: now.toISOString(),
    originalPurchaseDate: now.toISOString(),
    expirationDate: expiration.toISOString(),
    store: 'APP_STORE',
    productIdentifier: productId,
    productPlanIdentifier: null,
    isSandbox: true,
    unsubscribeDetectedAt: null,
    billingIssueDetectedAt: null,
    ownershipType: 'PURCHASED',
    verification: 'NOT_REQUESTED',
  };

  return {
    entitlements: {
      active: { plus: entitlement },
      all: { plus: entitlement },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    activeSubscriptions: [productId],
    allPurchasedProductIdentifiers: [productId],
    allPurchaseDates: { [productId]: now.toISOString() },
    allExpirationDates: { [productId]: expiration.toISOString() },
    originalAppUserId: '[DEV-MOCK-USER]',
    requestDate: now.toISOString(),
    latestExpirationDate: expiration.toISOString(),
    firstSeen: now.toISOString(),
    originalApplicationVersion: null,
    originalPurchaseDate: now.toISOString(),
    managementURL: null,
    nonSubscriptionTransactions: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
