export interface InvoiceLineItem {
  description: string;
  quantity: number;
  /** Unit price in USD. */
  unitPrice: number;
}

export type InvoiceStatus = "paid" | "pending" | "overdue";

export interface Invoice {
  id: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
  billedToName: string;
  billedToEmail: string;
  lineItems: InvoiceLineItem[];
  currency: "USD";
}

export function invoiceTotal(invoice: Invoice): number {
  return invoice.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Fetches the billing invoices for a user. Backed by mock data until a
 * billing backend exists, following the same pattern as the other
 * `*Mock.ts` services in this directory.
 */
export async function fetchInvoices(email: string): Promise<Invoice[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "INV-2026-0003",
          issuedAt: daysAgo(2),
          dueAt: daysAgo(-28),
          status: "paid",
          billedToName: "StellarProof User",
          billedToEmail: email,
          currency: "USD",
          lineItems: [
            { description: "Verification requests (Pro plan)", quantity: 1, unitPrice: 49 },
            { description: "Additional certificate mints", quantity: 12, unitPrice: 1.5 },
          ],
        },
        {
          id: "INV-2026-0002",
          issuedAt: daysAgo(33),
          dueAt: daysAgo(3),
          status: "paid",
          billedToName: "StellarProof User",
          billedToEmail: email,
          currency: "USD",
          lineItems: [
            { description: "Verification requests (Pro plan)", quantity: 1, unitPrice: 49 },
            { description: "Additional certificate mints", quantity: 4, unitPrice: 1.5 },
          ],
        },
        {
          id: "INV-2026-0001",
          issuedAt: daysAgo(64),
          dueAt: daysAgo(34),
          status: "overdue",
          billedToName: "StellarProof User",
          billedToEmail: email,
          currency: "USD",
          lineItems: [{ description: "Verification requests (Starter plan)", quantity: 1, unitPrice: 19 }],
        },
      ]);
    }, 400);
  });
}
