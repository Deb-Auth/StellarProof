"use client";

/**
 * Subscription plan manager.
 *
 * Reads the signed-in user's current subscription from the billing API and
 * wires the upgrade, downgrade, cancel and resume actions to their API
 * counterparts. Reads degrade to sample figures when the billing endpoints
 * are not deployed (and say so); writes never pretend to succeed.
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  fetchSubscription,
  resumeSubscription,
  type BillingSource,
  type Subscription,
  type SubscriptionStatus,
} from "@/services/billingService";
import {
  SUBSCRIPTION_PLANS,
  findPlanByName,
  planPrice,
  planRelation,
  type BillingInterval,
  type SubscriptionPlan,
} from "@/config/plans";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past due",
  canceled: "Canceled",
};

const STATUS_STYLE: Record<SubscriptionStatus, string> = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
  trialing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  past_due:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
  canceled:
    "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10",
};

const RELATION_LABEL = {
  current: "Current plan",
  upgrade: "Upgrade",
  downgrade: "Downgrade",
} as const;

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Which action is in flight, so only the pressed button shows a spinner. */
type PendingAction =
  | { kind: "change"; planId: string }
  | { kind: "cancel" }
  | { kind: "resume" };

interface CurrentPlanCardProps {
  subscription: Subscription;
  plan: SubscriptionPlan | undefined;
}

function CurrentPlanCard({ subscription, plan }: CurrentPlanCardProps) {
  const included = plan?.verificationsIncluded ?? subscription.verificationsIncluded;
  const usage =
    included === null
      ? `${subscription.verificationsUsed} (unlimited)`
      : `${subscription.verificationsUsed} of ${included}`;

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-darkblue"
      aria-labelledby="current-plan-heading"
      data-testid="current-plan-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2
              id="current-plan-heading"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              {subscription.planName} plan
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatUsd(subscription.priceUsd)} per {subscription.interval}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[subscription.status]}`}
          data-testid="subscription-status"
        >
          {STATUS_LABEL[subscription.status]}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {subscription.cancelAtPeriodEnd ? "Access until" : "Renews on"}
          </dt>
          <dd className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
            {formatDate(subscription.currentPeriodEnd)}
          </dd>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Verifications used
          </dt>
          <dd className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{usage}</dd>
        </div>
      </dl>

      {subscription.cancelAtPeriodEnd && (
        <p
          className="mt-4 text-sm text-yellow-700 dark:text-yellow-400"
          data-testid="cancel-scheduled-notice"
        >
          Auto-renewal is off. Your plan ends on {formatDate(subscription.currentPeriodEnd)}.
        </p>
      )}
    </section>
  );
}

export default function SubscriptionSettingsPage() {
  const { user } = useAuth();
  const email = user?.email ?? "user@stellarproof.com";

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [source, setSource] = useState<BillingSource>("api");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    fetchSubscription({ email, signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setSubscription(result.data);
        setSource(result.source);
        setBillingInterval(result.data.interval);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        console.error("Failed to load subscription:", err);
        setLoadError("We could not load your subscription. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [email, reloadToken]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadToken((token) => token + 1);
  }, []);

  /** Runs a mutation, then reflects the subscription the API answered with. */
  const runAction = useCallback(
    async (
      action: PendingAction,
      request: () => Promise<Subscription>,
      successMessage: string,
    ) => {
      setPending(action);
      setActionError(null);
      setActionMessage(null);
      try {
        const updated = await request();
        setSubscription(updated);
        setBillingInterval(updated.interval);
        // A successful write proves the API is reachable, so what is on screen
        // is live from here on.
        setSource("api");
        setActionMessage(successMessage);
        setConfirmingCancel(false);
      } catch (err) {
        console.error("Subscription action failed:", err);
        setActionError(
          err instanceof Error
            ? err.message
            : "We could not update your subscription. Please try again.",
        );
      } finally {
        setPending(null);
      }
    },
    [],
  );

  const currentPlan = findPlanByName(subscription?.planName);

  const handleChangePlan = (plan: SubscriptionPlan) => {
    const relation = planRelation(plan, currentPlan);
    void runAction(
      { kind: "change", planId: plan.id },
      () => changeSubscriptionPlan({ planId: plan.id, interval: billingInterval }),
      relation === "downgrade"
        ? `Your plan will change to ${plan.name}.`
        : `You are now on the ${plan.name} plan.`,
    );
  };

  const handleCancel = () => {
    void runAction(
      { kind: "cancel" },
      () => cancelSubscription(),
      "Your subscription will not renew. You keep access until the end of the period.",
    );
  };

  const handleResume = () => {
    void runAction({ kind: "resume" }, () => resumeSubscription(), "Auto-renewal is back on.");
  };

  const isBusy = pending !== null;
  const canCancel =
    subscription !== null &&
    subscription.status !== "canceled" &&
    !subscription.cancelAtPeriodEnd &&
    (currentPlan === undefined || currentPlan.monthlyUsd > 0);

  return (
    <main className="min-h-screen bg-white px-4 py-10 dark:bg-darkblue-dark sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage the plan and billing interval for {email}.
          </p>
        </div>

        {!isLoading && !loadError && source === "sample" && (
          <div
            className="flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
            role="status"
            data-testid="sample-data-notice"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              The billing API is unavailable, so sample figures are shown. Plan changes made now
              will not be saved.
            </p>
          </div>
        )}

        {isLoading ? (
          <div
            className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            data-testid="subscription-skeleton"
          />
        ) : loadError ? (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
            role="alert"
          >
            <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        ) : (
          subscription && <CurrentPlanCard subscription={subscription} plan={currentPlan} />
        )}

        {actionError && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            role="alert"
            data-testid="action-error"
          >
            {actionError}
          </p>
        )}

        {actionMessage && (
          <p
            className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
            role="status"
            data-testid="action-message"
          >
            {actionMessage}
          </p>
        )}

        <section aria-labelledby="plans-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="plans-heading" className="text-lg font-bold text-gray-900 dark:text-white">
              Available plans
            </h2>
            <div
              className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-darkblue"
              role="group"
              aria-label="Billing interval"
            >
              {(["month", "year"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBillingInterval(value)}
                  aria-pressed={billingInterval === value}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    billingInterval === value
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {value === "month" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const relation = planRelation(plan, currentPlan);
              const isCurrent = relation === "current";
              const isPending = pending?.kind === "change" && pending.planId === plan.id;

              return (
                <article
                  key={plan.id}
                  data-testid={`plan-card-${plan.id}`}
                  className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm dark:bg-darkblue ${
                    isCurrent
                      ? "border-primary/50 ring-2 ring-primary/20"
                      : "border-gray-200 dark:border-white/10"
                  }`}
                >
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {plan.description}
                  </p>
                  <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                    {formatUsd(planPrice(plan, billingInterval))}
                    <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                      /{billingInterval}
                    </span>
                  </p>

                  <ul className="mt-4 mb-6 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    {plan.contactSalesOnly && !isCurrent ? (
                      <Link
                        href="/contact"
                        className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-gray-300"
                      >
                        Contact sales
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleChangePlan(plan)}
                        disabled={isCurrent || isBusy || isLoading}
                        aria-busy={isPending}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          isCurrent || isBusy || isLoading
                            ? "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-white/5 dark:text-gray-500"
                            : "bg-primary text-white hover:bg-primary/90"
                        }`}
                      >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {RELATION_LABEL[relation]}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {!isLoading && !loadError && subscription && (
          <section
            aria-labelledby="cancel-heading"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-darkblue"
          >
            <h2 id="cancel-heading" className="text-lg font-bold text-gray-900 dark:text-white">
              Cancel subscription
            </h2>

            {subscription.cancelAtPeriodEnd ? (
              <>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Your subscription is set to end on {formatDate(subscription.currentPeriodEnd)}.
                </p>
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={isBusy}
                  aria-busy={pending?.kind === "resume"}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending?.kind === "resume" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Resume subscription
                </button>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  You keep access to your paid features until the end of the current billing
                  period.
                </p>
                {confirmingCancel ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Cancel your {subscription.planName} plan?
                    </span>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isBusy}
                      aria-busy={pending?.kind === "cancel"}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pending?.kind === "cancel" && <Loader2 className="h-4 w-4 animate-spin" />}
                      Yes, cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={isBusy}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-gray-300"
                    >
                      Keep my plan
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    disabled={!canCancel || isBusy}
                    className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Cancel subscription
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
