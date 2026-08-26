"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Zap } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

interface HorizonFeeStats {
  fee_charged?: {
    mode?: string;
  };
  last_ledger_base_fee?: string;
}

interface FeeData {
  baseFeeStroops: number;
}

export interface GasFeeEstimatorProps {
  className?: string;
  /** Auto-refresh interval in milliseconds. Pass 0 to disable it. */
  refreshInterval?: number;
}

export const FALLBACK_FEE_STROOPS = 100;

const STROOPS_PER_XLM = 10_000_000;
const HORIZON_URL =
  process.env.NEXT_PUBLIC_VITE_HORIZON_URL ??
  "https://horizon-testnet.stellar.org";

async function fetchFeeData(): Promise<FeeData> {
  const response = await fetch(`${HORIZON_URL}/fee_stats`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Horizon fee fetch failed with status ${response.status}`);
  }

  const stats = (await response.json()) as HorizonFeeStats;
  const baseFeeStroops = Number(
    stats.fee_charged?.mode ?? stats.last_ledger_base_fee,
  );

  if (!Number.isFinite(baseFeeStroops) || baseFeeStroops <= 0) {
    throw new Error("Horizon returned an invalid fee");
  }

  return { baseFeeStroops };
}

export function stroopsToXlm(stroops: number): number {
  return stroops / STROOPS_PER_XLM;
}

export function formatXlm(stroops: number): string {
  return stroopsToXlm(stroops)
    .toFixed(7)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

export default function GasFeeEstimator({
  className,
  refreshInterval = 30_000,
}: GasFeeEstimatorProps) {
  const [feeData, setFeeData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchFeeData();
      setFeeData(data);
      setUsingFallback(false);
      setLastUpdated(new Date());
    } catch {
      setFeeData({ baseFeeStroops: FALLBACK_FEE_STROOPS });
      setUsingFallback(true);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => {
    if (!refreshInterval) return;

    const id = window.setInterval(() => void load(), refreshInterval);
    return () => window.clearInterval(id);
  }, [load, refreshInterval]);

  return (
    <div
      className={[
        "rounded-2xl border border-gray-200 dark:border-gray-700",
        "bg-white dark:bg-gray-900/60 p-4 space-y-3",
        className ?? "",
      ]
        .join(" ")
        .trim()}
      role="region"
      aria-label="Gas Fee Estimator"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Network Fee Estimate
          </h3>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh fee estimate"
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5${loading ? " animate-spin" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {loading && !feeData ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading fee">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      ) : feeData ? (
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
            {formatXlm(feeData.baseFeeStroops)}{" "}
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              XLM
            </span>
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            Base fee · {feeData.baseFeeStroops} stroops
          </p>
        </div>
      ) : null}

      {usingFallback && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle
            className="w-4 h-4 mt-0.5 text-amber-500 dark:text-amber-400 shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Network fee data is unavailable. Using the standard Stellar fee.
          </p>
        </div>
      )}

      {lastUpdated && !usingFallback && (
        <p className="text-[10px] text-gray-400 dark:text-gray-600 pt-1 border-t border-gray-100 dark:border-gray-800">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
