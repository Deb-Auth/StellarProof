"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Invoice } from "@/services/billingMock";
import { invoiceTotal } from "@/services/billingMock";

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottom: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 14,
  },
  brand: { fontSize: 18, fontWeight: "bold", color: "#1e40af" },
  brandSub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  invoiceTitle: { fontSize: 20, fontWeight: "bold", color: "#1e293b", textAlign: "right" },
  invoiceId: { fontSize: 10, color: "#64748b", textAlign: "right", marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  metaBlock: { width: "48%" },
  label: { fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  value: { fontSize: 11, color: "#1e293b" },
  statusBadge: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#166534",
  },
  table: { marginTop: 8, borderTop: 1, borderTopColor: "#e2e8f0" },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
  },
  colDescription: { width: "55%", fontSize: 10, color: "#1e293b" },
  colQty: { width: "15%", fontSize: 10, color: "#1e293b", textAlign: "right" },
  colUnitPrice: { width: "15%", fontSize: 10, color: "#1e293b", textAlign: "right" },
  colAmount: { width: "15%", fontSize: 10, color: "#1e293b", textAlign: "right" },
  tableHeaderText: { fontSize: 9, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    paddingTop: 12,
    borderTop: 2,
    borderTopColor: "#1e293b",
  },
  totalLabel: { fontSize: 12, fontWeight: "bold", color: "#1e293b", marginRight: 24 },
  totalValue: { fontSize: 14, fontWeight: "bold", color: "#1e40af" },
  footer: {
    marginTop: 48,
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
    borderTop: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
  },
});

const STATUS_COLOR: Record<Invoice["status"], string> = {
  paid: "#166534",
  pending: "#92400e",
  overdue: "#991b1b",
};

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export interface InvoiceTemplateProps {
  invoice: Invoice;
}

/**
 * Printable PDF layout for a single billing invoice, rendered client-side
 * with @react-pdf/renderer. Kept as a plain <Document> (rather than wiring
 * it through PDFDownloadLink/PDFViewer) so it can be turned into a Blob
 * on demand from a click handler — see `downloadInvoicePdf` in
 * `app/dashboard/billing/invoices.tsx`.
 */
export default function InvoiceTemplate({ invoice }: InvoiceTemplateProps) {
  const total = invoiceTotal(invoice);

  return (
    <Document title={`Invoice ${invoice.id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>StellarProof</Text>
            <Text style={styles.brandSub}>Verified provenance on the Stellar network</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceId}>{invoice.id}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Billed To</Text>
            <Text style={styles.value}>{invoice.billedToName}</Text>
            <Text style={styles.value}>{invoice.billedToEmail}</Text>
          </View>
          <View style={[styles.metaBlock, { alignItems: "flex-end" }]}>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{formatDate(invoice.issuedAt)}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Due</Text>
            <Text style={styles.value}>{formatDate(invoice.dueAt)}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Status</Text>
            <Text style={[styles.statusBadge, { color: STATUS_COLOR[invoice.status] }]}>
              {invoice.status}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colUnitPrice, styles.tableHeaderText]}>Unit Price</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>Amount</Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            <View style={styles.tableRow} key={`${invoice.id}-line-${index}`}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnitPrice}>{formatUsd(item.unitPrice)}</Text>
              <Text style={styles.colAmount}>{formatUsd(item.quantity * item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Due ({invoice.currency})</Text>
          <Text style={styles.totalValue}>{formatUsd(total)}</Text>
        </View>

        <View style={styles.footer}>
          <Text>Thank you for using StellarProof.</Text>
          <Text>Questions about this invoice? Contact billing@stellarproof.io</Text>
        </View>
      </Page>
    </Document>
  );
}
