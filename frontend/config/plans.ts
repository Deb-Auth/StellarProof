/**
 * Catalogue of the self-serve subscription plans offered by StellarProof.
 *
 * The prices mirror the public pricing page and are what the subscription
 * manager sends to the billing API when a user switches plan. Ranking the
 * plans lets the UI label a switch as an upgrade or a downgrade without
 * hard-coding pairs of plan names.
 */

export type BillingInterval = "month" | "year";

export interface SubscriptionPlan {
  /** Stable identifier sent to the billing API. */
  id: string;
  name: string;
  /** Higher rank means a richer plan; drives upgrade vs downgrade wording. */
  rank: number;
  description: string;
  monthlyUsd: number;
  /** Yearly price: two months free compared with paying monthly. */
  yearlyUsd: number;
  /** Verifications included per billing period; null means unlimited. */
  verificationsIncluded: number | null;
  features: string[];
  /** Sales-assisted plans cannot be switched to from the dashboard. */
  contactSalesOnly?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    rank: 0,
    description: "Get started with basic verification features",
    monthlyUsd: 0,
    yearlyUsd: 0,
    verificationsIncluded: 3,
    features: [
      "3 monthly verifications",
      "Basic certificates",
      "Email support",
      "Stellar network (testnet)",
    ],
  },
  {
    id: "personal",
    name: "Personal",
    rank: 1,
    description: "Perfect for individual creators",
    monthlyUsd: 9,
    yearlyUsd: 90,
    verificationsIncluded: null,
    features: [
      "Unlimited verifications",
      "Advanced certificates",
      "Priority email support",
      "Stellar network (mainnet)",
      "Custom branding",
    ],
  },
  {
    id: "business",
    name: "Business",
    rank: 2,
    description: "For growing businesses and teams",
    monthlyUsd: 29,
    yearlyUsd: 290,
    verificationsIncluded: null,
    features: [
      "Everything in Personal",
      "Team workspace",
      "API access",
      "Analytics dashboard",
      "Dedicated account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    rank: 3,
    description: "For large organizations with custom needs",
    monthlyUsd: 99,
    yearlyUsd: 990,
    verificationsIncluded: null,
    features: [
      "Everything in Business",
      "Custom integration",
      "Onboarding & training",
      "Custom SLA",
      "Whitelabel solution",
    ],
    contactSalesOnly: true,
  },
];

/** Price of a plan for one billing period of the given interval. */
export function planPrice(plan: SubscriptionPlan, interval: BillingInterval): number {
  return interval === "year" ? plan.yearlyUsd : plan.monthlyUsd;
}

/**
 * Resolves the plan a subscription is on. Subscriptions created before a plan
 * was renamed (or by an environment with its own catalogue) may not match, so
 * callers must handle `undefined`.
 */
export function findPlanByName(name: string | undefined): SubscriptionPlan | undefined {
  if (!name) return undefined;
  const needle = name.trim().toLowerCase();
  return SUBSCRIPTION_PLANS.find(
    (plan) => plan.id === needle || plan.name.toLowerCase() === needle,
  );
}

export type PlanRelation = "current" | "upgrade" | "downgrade";

/**
 * How `plan` relates to the plan the user is on. Falls back to "upgrade" when
 * the current plan is unknown, so the action still reads sensibly.
 */
export function planRelation(
  plan: SubscriptionPlan,
  currentPlan: SubscriptionPlan | undefined,
): PlanRelation {
  if (!currentPlan) return "upgrade";
  if (plan.id === currentPlan.id) return "current";
  return plan.rank > currentPlan.rank ? "upgrade" : "downgrade";
}
