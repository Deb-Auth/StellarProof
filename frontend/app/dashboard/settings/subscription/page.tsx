// frontend/app/dashboard/settings/subscription/page.tsx

import React from 'react';

// Mock Data
const MOCK_USER_USAGE = {
  currentPlanId: 'pro',
  documentsVerified: 45,
};

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    interval: 'forever',
    limit: 10,
    features: ['10 document verifications/mo', 'Standard support', 'Basic analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$15',
    interval: 'per month',
    limit: 100,
    features: ['100 document verifications/mo', 'Priority support', 'Advanced analytics', 'Custom branding'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$50',
    interval: 'per month',
    limit: 1000,
    features: ['1000 document verifications/mo', '24/7 dedicated support', 'API access', 'SLA guarantee'],
  },
];

export default function SubscriptionManagerPage() {
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === MOCK_USER_USAGE.currentPlanId) || SUBSCRIPTION_PLANS[0];
  const usagePercentage = Math.min((MOCK_USER_USAGE.documentsVerified / currentPlan.limit) * 100, 100);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your billing, plan limits, and subscription preferences.
        </p>
      </div>

      {/* Current Plan Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Current Plan: <span className="text-indigo-600 dark:text-indigo-400">{currentPlan.name}</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              You are currently billed {currentPlan.price} {currentPlan.interval}.
            </p>
          </div>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors">
            Manage Billing
          </button>
        </div>

        {/* Usage Progress Bar */}
        <div className="mt-8">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-gray-700 dark:text-gray-300">Monthly Usage</span>
            <span className="text-gray-900 dark:text-white">
              {MOCK_USER_USAGE.documentsVerified} / {currentPlan.limit} Verifications
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                usagePercentage > 85 ? 'bg-red-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Resets on the 1st of next month.
          </p>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan.id;
            const isUpgrade = plan.limit > currentPlan.limit;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 ${
                  isCurrentPlan
                    ? 'border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-600 dark:ring-indigo-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {isCurrentPlan && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                    Active Plan
                  </span>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/{plan.interval}</span>
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                      <svg className="w-5 h-5 text-green-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrentPlan}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 cursor-default'
                      : isUpgrade
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}