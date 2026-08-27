"use client";

import React, { useCallback, useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Download, FileText, Loader2, Receipt } from "lucide-react";
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

export default function InvoicesView() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const email = user?.email ?? "user@stellarproof.com";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInvoices(email)
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

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
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and download PDF copies of your past invoices.
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue shadow-sm overflow-hidden"
        data-testid="invoices-panel"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading invoices…</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No invoices yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Invoice</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-300">Issued</th>
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
                    <tr key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{invoice.id}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(invoice.issuedAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[invoice.status]}`}>
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
