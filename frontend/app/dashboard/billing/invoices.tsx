"use client";

import React, { useCallback, useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { AlertCircle, Download, FileText, Loader2, Receipt } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { fetchInvoices, invoiceTotal, type Invoice, type InvoiceStatus } from "@/services/billingMock";
import InvoiceTemplate from "@/components/billing/InvoiceTemplate";
import { downloadBlob } from "@/utils/downloadBlob";

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** One-line summary of what an invoice covers, shown under its id. */
function invoiceSummary(invoice: Invoice): string {
  const [first, ...rest] = invoice.lineItems;
  if (!first) return "No line items";
  return rest.length > 0 ? `${first.description} +${rest.length} more` : first.description;
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
};

/**
 * Generates the invoice PDF as a Blob (via @react-pdf/renderer) and
 * triggers a browser download of it. Exported so it can be exercised
 * directly in tests without needing a full render tree.
 */
export async function downloadInvoicePdf(invoice: Invoice): Promise<void> {
  const blob = await pdf(<InvoiceTemplate invoice={invoice} />).toBlob();
  downloadBlob(blob, `${invoice.id}.pdf`);
}

export interface InvoicesViewProps {
  /**
   * Invoices to render. When provided, the view is fully controlled and does
   * not fetch anything itself, so a parent (e.g. the billing dashboard) can
   * own the data source. When omitted, the view loads the signed-in user's
   * invoices itself.
   */
  invoices?: Invoice[];
  /** Loading flag, controlled mode only. */
  isLoading?: boolean;
  /** Error message, controlled mode only; renders the error state. */
  error?: string | null;
  /** Called when the user presses "Try again" in the error state. */
  onRetry?: () => void;
  /** Hides the title block when the parent already renders one. */
  showHeader?: boolean;
}

export default function InvoicesView({
  invoices: invoicesProp,
  isLoading: isLoadingProp,
  error: errorProp,
  onRetry,
  showHeader = true,
}: InvoicesViewProps = {}) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const email = user?.email ?? "user@stellarproof.com";
  const isControlled = invoicesProp !== undefined;

  const [ownInvoices, setOwnInvoices] = useState<Invoice[]>([]);
  const [isOwnLoading, setIsOwnLoading] = useState(true);
  const [ownError, setOwnError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (isControlled) return;

    let cancelled = false;

    fetchInvoices(email)
      .then((data) => {
        if (!cancelled) setOwnInvoices(data);
      })
      .catch((err) => {
        console.error("Failed to load invoices:", err);
        if (!cancelled) setOwnError("We could not load your invoices. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsOwnLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, isControlled, reloadToken]);

  const invoices = isControlled ? invoicesProp : ownInvoices;
  const isLoading = isControlled ? isLoadingProp === true : isOwnLoading;
  const error = isControlled ? errorProp ?? null : ownError;

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
      return;
    }
    // Re-arm the loading state here rather than in the effect, so the effect
    // body stays free of synchronous setState calls.
    setIsOwnLoading(true);
    setOwnError(null);
    setReloadToken((token) => token + 1);
  }, [onRetry]);

  const handleDownload = useCallback(
    async (invoice: Invoice) => {
      setDownloadingId(invoice.id);
      try {
        await downloadInvoicePdf(invoice);
      } catch (err) {
        console.error("Failed to generate invoice PDF:", err);
        addToast({ type: "error", message: `Failed to download ${invoice.id}. Please try again.` });
      } finally {
        setDownloadingId(null);
      }
    },
    [addToast],
  );

  return (
    <div className="w-full space-y-6">
      {showHeader && (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing &amp; Invoices</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and download PDF copies of your past invoices.
            </p>
          </div>
        </div>
      )}

      <div
        className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue shadow-sm overflow-hidden"
        data-testid="invoices-panel"
      >
        {isLoading ? (
          <div
            className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading invoices…</span>
          </div>
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16 text-center"
            role="alert"
            data-testid="invoices-error"
          >
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No invoices yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Your invoices, with issue date, due date, status, amount and a PDF download.
              </caption>
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Invoice</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Issued</th>
                  <th
                    scope="col"
                    className="hidden px-6 py-3 font-semibold text-gray-600 dark:text-gray-300 md:table-cell"
                  >
                    Due
                  </th>
                  <th scope="col" className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Amount</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">
                    <span className="sr-only">Download</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {invoices.map((invoice) => {
                  const isDownloading = downloadingId === invoice.id;
                  return (
                    <tr
                      key={invoice.id}
                      data-testid={`invoice-row-${invoice.id}`}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <span className="block font-medium text-gray-900 dark:text-white">{invoice.id}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {invoiceSummary(invoice)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600 dark:text-gray-300">
                        {formatDate(invoice.issuedAt)}
                      </td>
                      <td className="hidden whitespace-nowrap px-6 py-4 text-gray-600 dark:text-gray-300 md:table-cell">
                        {formatDate(invoice.dueAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[invoice.status]}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-gray-900 dark:text-white">
                        {formatUsd(invoiceTotal(invoice))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownload(invoice)}
                          disabled={isDownloading}
                          aria-label={`Download PDF for invoice ${invoice.id}`}
                          data-testid={`download-${invoice.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
