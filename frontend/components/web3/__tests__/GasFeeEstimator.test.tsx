import { render, screen, waitFor } from "@testing-library/react";
import GasFeeEstimator, { FALLBACK_FEE_STROOPS } from "../GasFeeEstimator";

describe("GasFeeEstimator", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("displays the standard fee when Horizon cannot be reached", async () => {
    jest.mocked(global.fetch).mockRejectedValueOnce(new TypeError("Network error"));

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

  it("displays the fee returned by Horizon", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fee_charged: { mode: "250" } }),
    } as Response);

    render(<GasFeeEstimator refreshInterval={0} />);

    await waitFor(() => {
      expect(screen.getByText(/250 stroops/)).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/using the standard Stellar fee/i),
    ).not.toBeInTheDocument();
  });
});
