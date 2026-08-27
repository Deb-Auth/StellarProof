import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import GasFeeEstimator, { stroopsToXlm } from "../GasFeeEstimator";

describe("GasFeeEstimator", () => {
  it("shows a loading skeleton while no data has resolved yet", () => {
    render(<GasFeeEstimator data={null} loading />);
    expect(screen.getByLabelText("Loading fee estimate")).toBeInTheDocument();
  });

  it("shows the error message instead of fee values", () => {
    render(<GasFeeEstimator data={null} error="Failed to fetch network fee estimate." />);
    expect(screen.getByTestId("gas-fee-error")).toHaveTextContent(
      "Failed to fetch network fee estimate.",
    );
  });

  it("renders the fee in both XLM and USD", () => {
    render(
      <GasFeeEstimator
        data={{ baseFeeStroops: 100, estimatedFeeStroops: 100, xlmUsdRate: 0.1 }}
        lastUpdated={new Date()}
      />,
    );

    const values = screen.getByTestId("gas-fee-values");
    expect(values).toHaveTextContent("0.00001");
    expect(values).toHaveTextContent("XLM");
    expect(values).toHaveTextContent("USD");
    expect(values).toHaveTextContent("100 stroops");
  });

  it("falls back gracefully when the USD rate is unavailable", () => {
    render(
      <GasFeeEstimator data={{ baseFeeStroops: 100, estimatedFeeStroops: 100, xlmUsdRate: null }} />,
    );
    expect(screen.getByTestId("gas-fee-values")).toHaveTextContent("USD rate unavailable");
  });

  it("invokes onRefresh when the refresh button is clicked", () => {
    const onRefresh = jest.fn();
    render(
      <GasFeeEstimator
        data={{ baseFeeStroops: 100, estimatedFeeStroops: 100, xlmUsdRate: 0.1 }}
        onRefresh={onRefresh}
      />,
    );
    fireEvent.click(screen.getByTestId("gas-fee-refresh"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("stroopsToXlm", () => {
  it("converts stroops to XLM using the 10,000,000 stroop ratio", () => {
    expect(stroopsToXlm(10_000_000)).toBe(1);
    expect(stroopsToXlm(100)).toBe(0.00001);
  });
});
