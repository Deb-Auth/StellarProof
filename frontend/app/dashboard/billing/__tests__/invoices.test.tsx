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
});
