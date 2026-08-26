"use client";

import { useCallback, useEffect, useState } from "react";
import type { StellarNetworkId } from "@/services/wallet";
import { fetchBaseFee, fetchXlmUsdRate } from "@/services/horizonService";
import type { GasFeeEstimate } from "@/components/web3/GasFeeEstimator";

export interface UseGasFeeEstimateOptions {
  /** Stellar network to query fee stats for. Defaults to "testnet". */
  network?: StellarNetworkId;
  /** Auto-refresh interval in ms. Pass 0 to disable. Default: 30_000. */
  refreshInterval?: number;
}

export interface UseGasFeeEstimateResult {
  data: GasFeeEstimate | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

/**
 * Fetches the current Stellar network fee (via Horizon's `/fee_stats`) and
 * the live XLM/USD exchange rate, combining them into the shape expected
 * by `GasFeeEstimator`.
 *
 * The estimated fee uses the network's recent "mode" (typical) fee rather
 * than the bare protocol minimum, so the estimate reflects real network
 * conditions instead of always showing the 100-stroop floor.
 */
export function useGasFeeEstimate({
  network = "testnet",
  refreshInterval = 30_000,
}: UseGasFeeEstimateOptions = {}): UseGasFeeEstimateResult {
  const [data, setData] = useState<GasFeeEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchBaseFee(network), fetchXlmUsdRate()])
      .then(([feeStats, xlmUsdRate]) => {
        if (cancelled) return;
        setData({
          baseFeeStroops: feeStats.baseFeeStroops,
          estimatedFeeStroops: feeStats.modeFeeStroops,
          xlmUsdRate,
        });
        setError(null);
        setLastUpdated(new Date());
      })
      .catch((err: unknown) => {
        console.error("useGasFeeEstimate error:", err);
        if (!cancelled) setError("Failed to fetch network fee estimate.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [network, refreshToken]);

  useEffect(() => {
    if (!refreshInterval) return;
    const id = setInterval(refresh, refreshInterval);
    return () => clearInterval(id);
  }, [refresh, refreshInterval]);

  return { data, loading, error, lastUpdated, refresh };
}
