/**
 * Unit tests for the billing dashboard page: rendering of the subscription
 * card and invoice table from mocked API responses, plus the loading, error
 * and sample-data states.
 */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import BillingPage from "../page";
import type { Invoice, Subscription } from "@/services/billingMock";

jest.mock("@react-pdf/renderer", () => ({
  pdf: jest.fn(() => ({
    toBlob: jest.fn().mockResolvedValue(new Blob(["%PDF-1.4 fake"], { type: "application/pdf" })),
  })),
  Document: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Page: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles },
}));

jest.mock("@/utils/downloadBlob", () => ({ downloadBlob: jest.fn() }));

jest.mock("@/context/ToastContext", () => ({
  useToast: () => ({ addToast: jest.fn() }),
}));

jest.mock("@/app/context/AuthContext", () => ({
  useAuth: () => ({ user: { email: "buyer@example.com" } }),
}));

jest.mock("@/services/billingService", () => ({
  fetchSubscription: jest.fn(),
  fetchBillingInvoices: jest.fn(),
}));

import { fetchBillingInvoices, fetchSubscription } from "@/services/billingService";

const mockFetchSubscription = fetchSubscription as jest.Mock;
const mockFetchInvoices = fetchBillingInvoices as jest.Mock;

const SUBSCRIPTION: Subscription = {
  planName: "Personal",
  status: "active",
  priceUsd: 9,
  interval: "month",
  currentPeriodEnd: new Date("2026-09-15T00:00:00.000Z").toISOString(),
  cancelAtPeriodEnd: false,
  verificationsUsed: 12,
  verificationsIncluded: 100,
};

const INVOICES: Invoice[] = [
  {
    id: "INV-2026-0002",
    issuedAt: new Date("2026-08-01T00:00:00.000Z").toISOString(),
    dueAt: new Date("2026-08-31T00:00:00.000Z").toISOString(),
    status: "overdue",
    billedToName: "Test User",
    billedToEmail: "buyer@example.com",
    currency: "USD",
    lineItems: [{ description: "Personal plan", quantity: 1, unitPrice: 9 }],
  },
  {
    id: "INV-2026-0001",
    issuedAt: new Date("2026-07-01T00:00:00.000Z").toISOString(),
    dueAt: new Date("2026-07-31T00:00:00.000Z").toISOString(),
    status: "paid",
    billedToName: "Test User",
    billedToEmail: "buyer@example.com",
    currency: "USD",
    lineItems: [
      { description: "Personal plan", quantity: 1, unitPrice: 9 },
      { description: "Extra certificate mints", quantity: 2, unitPrice: 1.5 },
    ],
  },
];

function mockApiData(source: "api" | "sample" = "api") {
  mockFetchSubscription.mockResolvedValue({ data: SUBSCRIPTION, source });
  mockFetchInvoices.mockResolvedValue({ data: INVOICES, source });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiData();
});

describe("BillingPage", () => {
  it("requests the signed-in user's billing data", async () => {
    render(<BillingPage />);

    await waitFor(() => expect(screen.getByTestId("subscription-card")).toBeInTheDocument());

    expect(mockFetchSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ email: "buyer@example.com" }),
    );
    expect(mockFetchInvoices).toHaveBeenCalledWith(
      expect.objectContaining({ email: "buyer@example.com" }),
    );
  });

  it("shows skeletons while the data is loading", () => {
    mockFetchSubscription.mockReturnValue(new Promise(() => {}));
    mockFetchInvoices.mockReturnValue(new Promise(() => {}));

    render(<BillingPage />);

    expect(screen.getByTestId("subscription-skeleton")).toBeInTheDocument();
    expect(screen.getByText(/loading invoices/i)).toBeInTheDocument();
  });

  it("populates the subscription card from the API response", async () => {
    render(<BillingPage />);

    const card = await screen.findByTestId("subscription-card");

    expect(within(card).getByRole("heading", { name: /Personal plan/i })).toBeInTheDocument();
    expect(within(card).getByText("$9.00 per month")).toBeInTheDocument();
    expect(within(card).getByTestId("subscription-status")).toHaveTextContent("Active");
    expect(within(card).getByText("Renews on")).toBeInTheDocument();
    expect(within(card).getByText("12 of 100")).toBeInTheDocument();
  });

  it("populates the invoice table from the API response", async () => {
    render(<BillingPage />);

    const firstRow = await screen.findByTestId("invoice-row-INV-2026-0002");
    const secondRow = screen.getByTestId("invoice-row-INV-2026-0001");

    expect(within(firstRow).getByText("overdue")).toBeInTheDocument();
    expect(within(firstRow).getByText("$9.00")).toBeInTheDocument();

    // Totals are summed across every line item.
    expect(within(secondRow).getByText("$12.00")).toBeInTheDocument();
    expect(within(secondRow).getByText("Personal plan +1 more")).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: /Download PDF for invoice/i })).toHaveLength(2);
  });

  it("sums the outstanding balance across unpaid invoices", async () => {
    render(<BillingPage />);

    expect(await screen.findByTestId("outstanding-total")).toHaveTextContent(
      "Outstanding balance: $9.00",
    );
  });

  it("hides the outstanding balance when everything is paid", async () => {
    mockFetchInvoices.mockResolvedValue({
      data: [{ ...INVOICES[0], status: "paid" as const }, INVOICES[1]],
      source: "api",
    });

    render(<BillingPage />);

    await screen.findByTestId("invoice-row-INV-2026-0002");
    expect(screen.queryByTestId("outstanding-total")).not.toBeInTheDocument();
  });

  it("shows an empty state when the user has no invoices", async () => {
    mockFetchInvoices.mockResolvedValue({ data: [], source: "api" });

    render(<BillingPage />);

    expect(await screen.findByText("No invoices yet.")).toBeInTheDocument();
  });

  it("does not warn about sample data when both responses are live", async () => {
    render(<BillingPage />);

    await screen.findByTestId("subscription-card");
    expect(screen.queryByTestId("sample-data-notice")).not.toBeInTheDocument();
  });

  it("warns when any part of the response is sample data", async () => {
    mockFetchInvoices.mockResolvedValue({ data: INVOICES, source: "sample" });

    render(<BillingPage />);

    expect(await screen.findByTestId("sample-data-notice")).toBeInTheDocument();
  });

  it("renders the cancellation wording when auto-renewal is off", async () => {
    mockFetchSubscription.mockResolvedValue({
      data: { ...SUBSCRIPTION, cancelAtPeriodEnd: true },
      source: "api",
    });

    render(<BillingPage />);

    const card = await screen.findByTestId("subscription-card");
    expect(within(card).getByText("Access until")).toBeInTheDocument();
    expect(within(card).getByText("Auto-renewal is off")).toBeInTheDocument();
    expect(within(card).getByText("None")).toBeInTheDocument();
  });

  it("shows an error state and reloads the data on retry", async () => {
    const user = userEvent.setup();
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockFetchInvoices.mockRejectedValueOnce(new Error("boom"));

    render(<BillingPage />);

    expect(await screen.findByTestId("invoices-error")).toBeInTheDocument();

    mockApiData();
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByTestId("invoice-row-INV-2026-0002")).toBeInTheDocument();
    expect(mockFetchInvoices).toHaveBeenCalledTimes(2);
  });
});
