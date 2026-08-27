"use client";

import React from "react";
import { AlertCircle, Fuel, RefreshCw } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

export type FeeSpeed = "slow" | "standard" | "fast";

export interface GasFeeEstimate {
  /** Base fee in stroops (1 XLM = 10,000,000 stroops) */
  baseFeeStroops: number;
  /** Estimated fee for the selected speed, in stroops */
  estimatedFeeStroops: number;
  /** XLM/USD exchange rate used to derive the USD amount */
  xlmUsdRate: number | null;
}

export interface GasFeeEstimatorProps {
  /** Live (or mock) fee data to render. `null` while unavailable. */
  data: GasFeeEstimate | null;
  /** True while a fetch is in flight and no data has resolved yet. */
  loading?: boolean;
  /** Error message to display instead of the fee data. */
  error?: string | null;
  /** When the data was last refreshed. */
  lastUpdated?: Date | null;
  /** Called when the user requests a manual refresh. Hides the button if omitted. */
  onRefresh?: () => void;
  /** Selected fee speed, purely for label purposes (default: "standard"). */
  speed?: FeeSpeed;
  /** Optional class name for the outer container. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*                           Helpers                                   */
/* ------------------------------------------------------------------ */

const STROOPS_PER_XLM = 10_000_000;

const SPEED_LABEL: Record<FeeSpeed, string> = {
  slow: "Economy",
  standard: "Standard",
  fast: "Priority",
};

export function stroopsToXlm(stroops: number): number {
  return stroops / STROOPS_PER_XLM;
}

function formatXlm(xlm: number): string {
  const fixed = xlm.toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
  return fixed === "" ? "0" : fixed;
}

function formatUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.000001) return "< $0.000001";
  return `$${usd.toFixed(6)}`;
}

/* ------------------------------------------------------------------ */
/*                         Main Component                              */
/* ------------------------------------------------------------------ */

/**
 * Presentational network-fee estimator card.
 *
 * Renders the estimated Stellar transaction fee in both XLM and its
 * live USD equivalent. This component holds no fetching logic of its
 * own — callers supply `data` (e.g. from `useGasFeeEstimate`), which
 * keeps the estimator reusable across the wallet dashboard, the
 * verification wizard, or any other flow that submits a transaction.
 */
export default function GasFeeEstimator({
  data,
  loading = false,
  error = null,
  lastUpdated = null,
  onRefresh,
  speed = "standard",
  className,
}: GasFeeEstimatorProps) {
  const feeXlm = data ? stroopsToXlm(data.estimatedFeeStroops) : null;
  const feeUsd = data && feeXlm != null && data.xlmUsdRate != null ? feeXlm * data.xlmUsdRate : null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 dark:border-gray-700",
        "bg-white dark:bg-gray-900/60 p-4 space-y-3",
        className
      )}
      role="region"
      aria-label="Gas fee estimator"
      data-testid="gas-fee-estimator"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Network Fee &middot; {SPEED_LABEL[speed]}
          </h3>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh fee estimate"
            data-testid="gas-fee-refresh"
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500
              hover:text-primary dark:hover:text-primary
              hover:bg-gray-100 dark:hover:bg-gray-800
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        )}
      </div>

      {/* Body */}
      {error ? (
        <div
          className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          data-testid="gas-fee-error"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 dark:text-red-400 shrink-0" aria-hidden="true" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : loading && !data ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading fee estimate">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      ) : data && feeXlm != null ? (
        <div className="space-y-1" data-testid="gas-fee-values">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
            {formatXlm(feeXlm)}{" "}
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">XLM</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {feeUsd != null ? `${formatUsd(feeUsd)} USD` : "USD rate unavailable"}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            Base fee &middot; {data.baseFeeStroops.toLocaleString()} stroops
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">No fee estimate available.</p>
      )}

      {/* Footer timestamp */}
      {lastUpdated && !error && (
        <p className="text-[10px] text-gray-400 dark:text-gray-600 pt-1 border-t border-gray-100 dark:border-gray-800">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
