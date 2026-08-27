import { renderHook, waitFor, act } from "@testing-library/react";
import { useGasFeeEstimate } from "../useGasFeeEstimate";
import * as horizonService from "@/services/horizonService";

jest.mock("@/services/horizonService", () => ({
  fetchBaseFee: jest.fn(),
  fetchXlmUsdRate: jest.fn(),
}));

const mockedFetchBaseFee = horizonService.fetchBaseFee as jest.Mock;
const mockedFetchXlmUsdRate = horizonService.fetchXlmUsdRate as jest.Mock;

describe("useGasFeeEstimate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("combines the live base fee and USD rate into a GasFeeEstimate", async () => {
    mockedFetchBaseFee.mockResolvedValue({ baseFeeStroops: 100, modeFeeStroops: 300 });
    mockedFetchXlmUsdRate.mockResolvedValue(0.12);

    const { result } = renderHook(() => useGasFeeEstimate({ network: "testnet", refreshInterval: 0 }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({
      baseFeeStroops: 100,
      estimatedFeeStroops: 300,
      xlmUsdRate: 0.12,
    });
    expect(result.current.error).toBeNull();
    expect(mockedFetchBaseFee).toHaveBeenCalledWith("testnet");
  });

  it("surfaces an error and clears loading if the fetch fails", async () => {
    mockedFetchBaseFee.mockRejectedValue(new Error("Horizon unreachable"));
    mockedFetchXlmUsdRate.mockResolvedValue(0.12);

    const { result } = renderHook(() => useGasFeeEstimate({ network: "testnet", refreshInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to fetch network fee estimate.");
    expect(result.current.data).toBeNull();
  });

  it("refetches when refresh() is called", async () => {
    mockedFetchBaseFee.mockResolvedValue({ baseFeeStroops: 100, modeFeeStroops: 100 });
    mockedFetchXlmUsdRate.mockResolvedValue(0.1);

    const { result } = renderHook(() => useGasFeeEstimate({ network: "testnet", refreshInterval: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedFetchBaseFee).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockedFetchBaseFee).toHaveBeenCalledTimes(2));
  });
});
