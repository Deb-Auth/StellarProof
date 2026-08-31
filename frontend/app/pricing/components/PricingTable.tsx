"use client";

/**
 * Plan comparison table for the pricing page.
 *
 * The table is dense: four plans across a dozen features. Rendering it as one
 * grid on a phone either overflows the page or squeezes the columns until the
 * labels wrap to one character per line, so the component renders two
 * layouts from the same data:
 *
 * - from `md` up, a real `<table>` inside a horizontally scrollable container
 *   with a minimum width, so the columns keep their proportions and the page
 *   itself never scrolls sideways;
 * - below `md`, one collapsible section per feature group, each listing the
 *   plans stacked, so nothing is ever cut off on a narrow viewport.
 */

import React, { useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";

/** A cell is either a capability flag or a short value such as "Unlimited". */
export type FeatureValue = boolean | string;

export interface ComparisonFeature {
  name: string;
  /** One value per plan, in the same order as `PLAN_NAMES`. */
  values: FeatureValue[];
}

export interface ComparisonGroup {
  name: string;
  features: ComparisonFeature[];
}

export const PLAN_NAMES = ["Free", "Personal", "Business", "Enterprise"] as const;

/** Index into `PLAN_NAMES` of the plan highlighted on the pricing cards. */
const POPULAR_PLAN_INDEX = 1;

export const COMPARISON_GROUPS: ComparisonGroup[] = [
  {
    name: "Verification",
    features: [
      {
        name: "Monthly verifications",
        values: ["3", "Unlimited", "Unlimited", "Unlimited"],
      },
      { name: "Certificate templates", values: ["Basic", "Advanced", "Advanced", "Custom"] },
      { name: "Stellar network", values: ["Testnet", "Mainnet", "Mainnet", "Mainnet"] },
      { name: "Bulk verification", values: [false, false, true, true] },
    ],
  },
  {
    name: "Collaboration",
    features: [
      { name: "Team workspace", values: [false, false, true, true] },
      { name: "Custom branding", values: [false, true, true, true] },
      { name: "Whitelabel solution", values: [false, false, false, true] },
    ],
  },
  {
    name: "Developer",
    features: [
      { name: "API access", values: [false, false, true, true] },
      { name: "Webhooks", values: [false, false, true, true] },
      { name: "Analytics dashboard", values: [false, false, true, true] },
      { name: "Custom integration", values: [false, false, false, true] },
    ],
  },
  {
    name: "Support",
    features: [
      { name: "Support channel", values: ["Email", "Priority email", "Priority email", "24/7"] },
      { name: "Dedicated account manager", values: [false, false, true, true] },
      { name: "Onboarding & training", values: [false, false, false, true] },
      { name: "Custom SLA", values: [false, false, false, true] },
    ],
  },
];

/** Renders a cell value, using an icon for capability flags. */
function ValueCell({ value, plan }: { value: FeatureValue; plan: string }) {
  if (typeof value === "string") {
    return <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>;
  }

  return value ? (
    <>
      <Check className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
      <span className="sr-only">Included in {plan}</span>
    </>
  ) : (
    <>
      <Minus className="mx-auto h-5 w-5 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      <span className="sr-only">Not included in {plan}</span>
    </>
  );
}

export default function PricingTable({
  groups = COMPARISON_GROUPS,
}: {
  groups?: ComparisonGroup[];
}) {
  // All groups start open on mobile so the content is reachable without
  // JavaScript-driven discovery; collapsing is there to shorten the page.
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const toggleGroup = (name: string) => {
    setCollapsedGroups((current) =>
      current.includes(name) ? current.filter((group) => group !== name) : [...current, name],
    );
  };

  return (
    <section aria-labelledby="comparison-heading" className="mt-20" data-testid="pricing-table">
      <h2
        id="comparison-heading"
        className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white"
      >
        Compare plans
      </h2>
      <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Every plan includes the core verification technology.
      </p>

      {/* Desktop and tablet: a scrollable table that keeps its column widths. */}
      <div
        className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-darkblue md:block"
        data-testid="pricing-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Plan comparison table, scrollable horizontally"
      >
        <table className="w-full min-w-[48rem] border-collapse text-left">
          <caption className="sr-only">
            Features included in the Free, Personal, Business and Enterprise plans
          </caption>
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10">
              <th scope="col" className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                Features
              </th>
              {PLAN_NAMES.map((plan, index) => (
                <th
                  key={plan}
                  scope="col"
                  className={`px-6 py-4 text-center text-sm font-semibold ${
                    index === POPULAR_PLAN_INDEX
                      ? "text-primary"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {plan}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <React.Fragment key={group.name}>
                <tr className="bg-gray-50 dark:bg-white/5">
                  <th
                    scope="colgroup"
                    colSpan={PLAN_NAMES.length + 1}
                    className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    {group.name}
                  </th>
                </tr>
                {group.features.map((feature) => (
                  <tr
                    key={feature.name}
                    className="border-b border-gray-100 last:border-0 dark:border-white/5"
                  >
                    <th
                      scope="row"
                      className="px-6 py-3 text-sm font-normal text-gray-600 dark:text-gray-300"
                    >
                      {feature.name}
                    </th>
                    {feature.values.map((value, index) => (
                      <td key={PLAN_NAMES[index]} className="px-6 py-3 text-center">
                        <ValueCell value={value} plan={PLAN_NAMES[index]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: collapsible groups, each plan on its own row. */}
      <div className="space-y-3 md:hidden" data-testid="pricing-table-mobile">
        {groups.map((group) => {
          const isOpen = !collapsedGroups.includes(group.name);
          const panelId = `comparison-panel-${group.name.toLowerCase().replace(/\s+/g, "-")}`;

          return (
            <div
              key={group.name}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-darkblue"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.name)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {group.name}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              <div id={panelId} hidden={!isOpen} className="px-4 pb-4">
                <dl className="space-y-4">
                  {group.features.map((feature) => (
                    <div key={feature.name}>
                      <dt className="text-sm font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </dt>
                      <dd className="mt-2 grid grid-cols-2 gap-2">
                        {feature.values.map((value, index) => (
                          <div
                            key={PLAN_NAMES[index]}
                            className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-white/5 dark:bg-white/5"
                          >
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {PLAN_NAMES[index]}
                            </span>
                            <ValueCell value={value} plan={PLAN_NAMES[index]} />
                          </div>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
