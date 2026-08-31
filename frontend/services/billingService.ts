/**
 * Live billing service.
 *
 * Talks to the StellarProof backend REST API for the signed-in user's
 * subscription (`GET /api/v1/users/me/subscription`) and billing history
 * (`GET /api/v1/users/me/invoices`), following the same envelope and error
 * conventions as the certificate search service.
 *
 * The billing endpoints are not deployed on every environment yet, so both
 * loaders degrade gracefully: when the API is unreachable or does not expose
 * the route, they resolve with the mock payload from `billingMock` and mark
 * the result `source: "sample"`, letting the dashboard render something
 * useful while telling the user the figures are not live.
 *
 * Plan changes (`PUT /api/v1/users/me/subscription`) and cancel/resume
 * (`POST .../subscription/cancel` and `.../resume`) have no such fallback:
 * a write that did not reach the API is reported as an error.
 */

import type { BillingInterval } from "@/config/plans";
import {
  fetchInvoices as fetchSampleInvoices,
  fetchSubscription as fetchSampleSubscription,
  type Invoice,
  type InvoiceLineItem,
  type InvoiceStatus,
  type Subscription,
  type SubscriptionStatus,
} from "./billingMock";

export type { Invoice, InvoiceLineItem, InvoiceStatus, Subscription, SubscriptionStatus };

/* -------------------------------------------------------------------------- */
/*                              Configuration                                 */
/* -------------------------------------------------------------------------- */

/**
 * Base URL of the StellarProof backend. Configure with `NEXT_PUBLIC_API_URL`
 * (see frontend/.env.example). Defaults to the local development backend.
 */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const API_ROOT = `${API_BASE_URL.replace(/\/$/, "")}/api/v1`;

export const SUBSCRIPTION_ENDPOINT = `${API_ROOT}/users/me/subscription`;
export const SUBSCRIPTION_CANCEL_ENDPOINT = `${SUBSCRIPTION_ENDPOINT}/cancel`;
export const SUBSCRIPTION_RESUME_ENDPOINT = `${SUBSCRIPTION_ENDPOINT}/resume`;
export const INVOICES_ENDPOINT = `${API_ROOT}/users/me/invoices`;

/** Where the rendered data came from, so the UI can flag non-live figures. */
export type BillingSource = "api" | "sample";

export interface BillingResult<T> {
  data: T;
  source: BillingSource;
}

export interface FetchBillingOptions {
  /** AbortSignal so stale/unmounted requests can be cancelled. */
  signal?: AbortSignal;
  /** Email used for the sample fallback payload. */
  email?: string;
}

/* -------------------------------------------------------------------------- */
/*                         API response wire shapes                           */
/* -------------------------------------------------------------------------- */

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ApiLineItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
}

interface ApiInvoice {
  id?: string;
  _id?: string;
  invoiceNumber?: string;
  issuedAt?: string;
  createdAt?: string;
  dueAt?: string;
  dueDate?: string;
  status?: string;
  billedToName?: string;
  billedToEmail?: string;
  currency?: string;
  lineItems?: ApiLineItem[];
  /** Some backends only send a total; it is expanded into a single line item. */
  amountUsd?: number;
}

interface ApiInvoiceList {
  invoices?: ApiInvoice[];
}

interface ApiSubscription {
  planName?: string;
  plan?: string;
  status?: string;
  priceUsd?: number;
  amountUsd?: number;
  interval?: string;
  currentPeriodEnd?: string;
  renewsAt?: string;
  cancelAtPeriodEnd?: boolean;
  verificationsUsed?: number;
  verificationsIncluded?: number | null;
}

/* -------------------------------------------------------------------------- */
/*                                 Mapping                                    */
/* -------------------------------------------------------------------------- */

const INVOICE_STATUSES: InvoiceStatus[] = ["paid", "pending", "overdue"];
const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
];

function toInvoiceStatus(value?: string): InvoiceStatus {
  const status = value?.toLowerCase() as InvoiceStatus | undefined;
  return status && INVOICE_STATUSES.includes(status) ? status : "pending";
}

function toSubscriptionStatus(value?: string): SubscriptionStatus {
  const status = value?.toLowerCase().replace(/-/g, "_") as SubscriptionStatus | undefined;
  return status && SUBSCRIPTION_STATUSES.includes(status) ? status : "active";
}

/** Normalise an ISO-ish timestamp, falling back to the epoch when unusable. */
function toIso(value?: string): string {
  if (!value) return new Date(0).toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function mapApiInvoice(invoice: ApiInvoice, fallbackEmail: string): Invoice {
  const lineItems: InvoiceLineItem[] = Array.isArray(invoice.lineItems)
    ? invoice.lineItems.map((item) => ({
        description: item.description?.trim() || "Subscription charge",
        quantity: toNumber(item.quantity, 1),
        unitPrice: toNumber(item.unitPrice),
      }))
    : [];

  // Backends that only report a total still need one row so the table and the
  // generated PDF have something to show.
  if (lineItems.length === 0 && invoice.amountUsd !== undefined) {
    lineItems.push({
      description: "Subscription charge",
      quantity: 1,
      unitPrice: toNumber(invoice.amountUsd),
    });
  }

  return {
    id: invoice.invoiceNumber ?? invoice.id ?? invoice._id ?? "UNKNOWN",
    issuedAt: toIso(invoice.issuedAt ?? invoice.createdAt),
    dueAt: toIso(invoice.dueAt ?? invoice.dueDate ?? invoice.issuedAt ?? invoice.createdAt),
    status: toInvoiceStatus(invoice.status),
    billedToName: invoice.billedToName ?? "StellarProof User",
    billedToEmail: invoice.billedToEmail ?? fallbackEmail,
    currency: "USD",
    lineItems,
  };
}

export function mapApiSubscription(subscription: ApiSubscription): Subscription {
  return {
    planName: subscription.planName ?? subscription.plan ?? "Free",
    status: toSubscriptionStatus(subscription.status),
    priceUsd: toNumber(subscription.priceUsd ?? subscription.amountUsd),
    interval: subscription.interval === "year" ? "year" : "month",
    currentPeriodEnd: toIso(subscription.currentPeriodEnd ?? subscription.renewsAt),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
    verificationsUsed: toNumber(subscription.verificationsUsed),
    verificationsIncluded:
      typeof subscription.verificationsIncluded === "number"
        ? subscription.verificationsIncluded
        : null,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Fetch plumbing                                */
/* -------------------------------------------------------------------------- */

/**
 * Bearer token persisted by the auth context, when the session carries one.
 * The billing endpoints are authenticated, so it is forwarded whenever it is
 * available; unauthenticated calls simply come back as 401 and fall back to
 * the sample payload.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("stellarproof_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed.token === "string" && parsed.token ? parsed.token : null;
  } catch {
    return null;
  }
}

/** Raised when the request reached the API but the API refused it. */
export class BillingApiError extends Error {}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  /** JSON request body; sent with a `Content-Type: application/json` header. */
  body?: unknown;
  signal?: AbortSignal;
}

async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body: requestBody, signal } = options;
  const token = getAuthToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(requestBody !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(requestBody !== undefined ? { body: JSON.stringify(requestBody) } : {}),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Propagate cancellations untouched so callers can ignore them.
      throw err;
    }
    throw new BillingApiError("Unable to reach the StellarProof billing API.");
  }

  let body: ApiEnvelope<T> | undefined;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // Non-JSON body (proxy error page, HTML gateway response, …).
    body = undefined;
  }

  if (!response.ok) {
    throw new BillingApiError(
      body?.error ?? body?.message ?? `Billing request failed with status ${response.status}.`,
    );
  }

  if (!body || body.success === false || body.data === undefined) {
    throw new BillingApiError(
      body?.error ?? body?.message ?? "Billing request failed. Please try again.",
    );
  }

  return body.data;
}

/* -------------------------------------------------------------------------- */
/*                                Public API                                  */
/* -------------------------------------------------------------------------- */

/**
 * Loads the signed-in user's current subscription. Falls back to the sample
 * subscription when the billing API is unavailable.
 */
export async function fetchSubscription(
  options: FetchBillingOptions = {},
): Promise<BillingResult<Subscription>> {
  const { signal, email = "user@stellarproof.com" } = options;

  try {
    const payload = await requestJson<ApiSubscription>(SUBSCRIPTION_ENDPOINT, { signal });
    return { data: mapApiSubscription(payload), source: "api" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.warn("Falling back to sample subscription:", err);
    return { data: await fetchSampleSubscription(email), source: "sample" };
  }
}

/**
 * Loads the signed-in user's billing history, newest invoice first. Falls
 * back to the sample invoices when the billing API is unavailable.
 */
export async function fetchBillingInvoices(
  options: FetchBillingOptions = {},
): Promise<BillingResult<Invoice[]>> {
  const { signal, email = "user@stellarproof.com" } = options;

  try {
    const payload = await requestJson<ApiInvoice[] | ApiInvoiceList>(INVOICES_ENDPOINT, { signal });
    const raw = Array.isArray(payload) ? payload : payload.invoices;
    if (!Array.isArray(raw)) {
      throw new BillingApiError("Unexpected response shape from the invoices API.");
    }

    const invoices = raw
      .map((invoice) => mapApiInvoice(invoice, email))
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    return { data: invoices, source: "api" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.warn("Falling back to sample invoices:", err);
    return { data: await fetchSampleInvoices(email), source: "sample" };
  }
}

/* -------------------------------------------------------------------------- */
/*                          Subscription mutations                            */
/* -------------------------------------------------------------------------- */

export interface ChangePlanOptions {
  /** Plan identifier from `config/plans`. */
  planId: string;
  interval: BillingInterval;
  signal?: AbortSignal;
}

export interface SubscriptionActionOptions {
  signal?: AbortSignal;
}

/**
 * Switches the signed-in user to another plan, used for both upgrades and
 * downgrades.
 *
 * Unlike the read paths there is no sample fallback: a plan change that did
 * not reach the API must surface as an error rather than as a fake success,
 * so the caller can tell the user nothing was charged or changed.
 */
export async function changeSubscriptionPlan({
  planId,
  interval,
  signal,
}: ChangePlanOptions): Promise<Subscription> {
  const payload = await requestJson<ApiSubscription>(SUBSCRIPTION_ENDPOINT, {
    method: "PUT",
    body: { planId, interval },
    signal,
  });
  return mapApiSubscription(payload);
}

/**
 * Cancels the subscription. The plan keeps running until the end of the paid
 * period, so the API answers with the updated subscription rather than an
 * empty body.
 */
export async function cancelSubscription({
  signal,
}: SubscriptionActionOptions = {}): Promise<Subscription> {
  const payload = await requestJson<ApiSubscription>(SUBSCRIPTION_CANCEL_ENDPOINT, {
    method: "POST",
    signal,
  });
  return mapApiSubscription(payload);
}

/** Turns auto-renewal back on for a subscription that was cancelled. */
export async function resumeSubscription({
  signal,
}: SubscriptionActionOptions = {}): Promise<Subscription> {
  const payload = await requestJson<ApiSubscription>(SUBSCRIPTION_RESUME_ENDPOINT, {
    method: "POST",
    signal,
  });
  return mapApiSubscription(payload);
}
