export type SubscriptionProvider = "shopier" | "apple_iap" | "google_play";
export type EntitlementPlanId = "monthly" | "quarterly" | "yearly";

export const ENTITLEMENT_PLAN_DAYS: Record<EntitlementPlanId, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export interface UnifiedEntitlementReceipt {
  order_id: string;
  provider: SubscriptionProvider;
  plan_id?: EntitlementPlanId;
  activated_at: string;
  duration_days: number;
}

export function normalizeEntitlementDurationDays(receipt: {
  plan_id?: EntitlementPlanId;
  duration_days?: number;
}): number {
  const validDays = Object.values(ENTITLEMENT_PLAN_DAYS);
  if (typeof receipt.duration_days === "number" && validDays.includes(receipt.duration_days)) {
    return receipt.duration_days;
  }
  if (receipt.plan_id && receipt.plan_id in ENTITLEMENT_PLAN_DAYS) {
    return ENTITLEMENT_PLAN_DAYS[receipt.plan_id];
  }
  throw new Error("Geçersiz abonelik süresi veya paket kimliği.");
}
