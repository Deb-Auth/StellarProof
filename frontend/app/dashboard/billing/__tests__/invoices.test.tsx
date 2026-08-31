import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import InvoicesView, { downloadInvoicePdf } from "../invoices";
import type { Invoice } from "@/services/billingMock";

const mockToBlob = jest.fn().mockResolvedValue(new Blob(["%PDF-1.4 fake"], { type: "application/pdf" }));

jest.mock("@react-pdf/renderer", () => ({
  pdf: jest.fn(() => ({ toBlob: mockToBlob })),
  Document: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Page: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles },
}));

const mockDownloadBlob = jest.fn();
jest.mock("@/utils/downloadBlob", () => ({
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}));

const mockAddToast = jest.fn();
jest.mock("@/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("@/app/context/AuthContext", () => ({
  useAuth: () => ({ user: { email: "buyer@example.com" } }),
}));

const SAMPLE_INVOICES: Invoice[] = [
  {
    id: "INV-2026-0001",
    issuedAt: new Date("2026-06-01").toISOString(),
    dueAt: new Date("2026-06-30").toISOString(),
    status: "paid",
    billedToName: "Test User",
    billedToEmail: "buyer@example.com",
    currency: "USD",
    lineItems: [{ description: "Pro plan", quantity: 1, unitPrice: 49 }],
  },
];

jest.mock("@/services/billingMock", () => {
  const actual = jest.requireActual("@/services/billingMock");
  return {
    ...actual,
    fetchInvoices: jest.fn(),
  };
});

import { fetchInvoices } from "@/services/billingMock";

describe("downloadInvoicePdf", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the invoice to a PDF blob and triggers a download", async () => {
    await downloadInvoicePdf(SAMPLE_INVOICES[0]);
    expect(mockToBlob).toHaveBeenCalledTimes(1);
    expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), "INV-2026-0001.pdf");
  });
});

describe("InvoicesView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchInvoices as jest.Mock).mockResolvedValue(SAMPLE_INVOICES);
  });

  it("lists invoices once loaded", async () => {
    render(<InvoicesView />);
    expect(await screen.findByTestId("invoice-row-INV-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("$49.00")).toBeInTheDocument();
  });

  it("downloads a PDF when the Download PDF button is clicked", async () => {
    render(<InvoicesView />);
    const button = await screen.findByTestId("download-INV-2026-0001");

    fireEvent.click(button);

    await waitFor(() => expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), "INV-2026-0001.pdf"));
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it("shows an error toast if PDF generation fails", async () => {
    mockToBlob.mockRejectedValueOnce(new Error("render failed"));
    render(<InvoicesView />);
    const button = await screen.findByTestId("download-INV-2026-0001");

    fireEvent.click(button);

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" }),
      ),
    );
  });

  it("shows an empty state when there are no invoices", async () => {
    (fetchInvoices as jest.Mock).mockResolvedValue([]);
    render(<InvoicesView />);
    expect(await screen.findByText("No invoices yet.")).toBeInTheDocument();
  });

  it("renders the invoice summary and both dates", async () => {
    render(<InvoicesView />);
    expect(await screen.findByTestId("invoice-row-INV-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Pro plan")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Issued" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Due" })).toBeInTheDocument();
  });

  it("shows an error state and reloads when the fetch fails", async () => {
    (fetchInvoices as jest.Mock).mockRejectedValueOnce(new Error("network down"));
    render(<InvoicesView />);

    expect(await screen.findByTestId("invoices-error")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByTestId("invoice-row-INV-2026-0001")).toBeInTheDocument();
    expect(fetchInvoices).toHaveBeenCalledTimes(2);
  });
});

describe("InvoicesView (controlled)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the invoices passed in without fetching", () => {
    render(<InvoicesView invoices={SAMPLE_INVOICES} showHeader={false} />);

    expect(screen.getByTestId("invoice-row-INV-2026-0001")).toBeInTheDocument();
    expect(fetchInvoices).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: /Billing & Invoices/i })).not.toBeInTheDocument();
  });

  it("renders the loading state from props", () => {
    render(<InvoicesView invoices={[]} isLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading invoices/i);
  });

  it("renders the error from props and calls onRetry", () => {
    const onRetry = jest.fn();
    render(<InvoicesView invoices={[]} error="Billing API unavailable" onRetry={onRetry} />);

    expect(screen.getByText("Billing API unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
