import { render, screen } from "@testing-library/react";
import GasFeeEstimator, {
  FALLBACK_FEE_STROOPS,
  formatXlm,
  stroopsToXlm,
} from "../GasFeeEstimator";

describe("Gas fee estimator logic", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("fetches and displays the modal fee returned by Horizon", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        last_ledger_base_fee: "100",
        fee_charged: { mode: "250" },
      }),
    } as Response);

    render(<GasFeeEstimator refreshInterval={0} />);

    expect(await screen.findByText("0.000025")).toBeInTheDocument();
    expect(screen.getByText(/250 stroops/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://horizon-testnet.stellar.org/fee_stats",
      { cache: "no-store" },
    );
  });

  it("converts stroops to XLM without losing precision", () => {
    expect(stroopsToXlm(100)).toBe(0.00001);
    expect(stroopsToXlm(250)).toBe(0.000025);
    expect(formatXlm(1_000_000)).toBe("0.1");
  });

  it("uses the standard fee when Horizon returns an error", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    render(<GasFeeEstimator refreshInterval={0} />);

    expect(
      await screen.findByText(`${FALLBACK_FEE_STROOPS} stroops`, {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/using the standard Stellar fee/i),
    ).toBeInTheDocument();
  });
});
