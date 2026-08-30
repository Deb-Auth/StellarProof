"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export interface PricingTier {
  name: string;
  monthlyUSD: number;
  monthlyXLM: number;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

interface PricingCardsProps {
  tiers: PricingTier[];
  currency: "USD" | "XLM";
}

export default function PricingCards({ tiers, currency }: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {tiers.map((tier, index) => (
        <motion.div
          key={tier.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`relative rounded-2xl border bg-white dark:bg-darkblue p-6 shadow-sm hover:shadow-md transition-all ${
            tier.popular
              ? "border-primary/50 ring-2 ring-primary/20"
              : "border-gray-200 dark:border-white/10"
          }`}
        >
          {tier.popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                Most Popular
              </span>
            </div>
          )}

          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {tier.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {tier.description}
          </p>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              {currency === "USD" ? (
                <>
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${tier.monthlyUSD}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {tier.monthlyXLM} XLM
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                </>
              )}
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            {tier.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>

          <Link
            href={tier.name === "Enterprise" ? "/contact" : "/verify"}
            className={`block w-full text-center px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
              tier.popular
                ? "bg-primary text-white hover:bg-primary-dark shadow-button-glow"
                : "border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary"
            }`}
          >
            {tier.cta}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
