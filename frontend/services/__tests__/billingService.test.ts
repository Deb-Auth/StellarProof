/**
 * Tests for the live billing service: envelope handling, wire-shape mapping
 * and the sample-data fallback used while the billing endpoints are rolling
 * out.
 */

import {
  INVOICES_ENDPOINT,
  SUBSCRIPTION_CANCEL_ENDPOINT,
  SUBSCRIPTION_ENDPOINT,
  SUBSCRIPTION_RESUME_ENDPOINT,
  cancelSubscription,
  changeSubscriptionPlan,
  fetchBillingInvoices,
  fetchSubscription,
  mapApiInvoice,
  mapApiSubscription,
  resumeSubscription,
} from "../billingService";

const ORIGINAL_FETCH = global.fetch;

function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
  global.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = ORIGINAL_FETCH;
  window.localStorage.clear();
});

describe("fetchSubscription", () => {
  it("requests the subscription endpoint and maps the payload", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          planName: "Personal",
          status: "TRIALING",
          priceUsd: 9,
          interval: "month",
          currentPeriodEnd: "2026-09-01T00:00:00.000Z",
          verificationsUsed: 4,
          verificationsIncluded: 100,
        },
      }),
    );

    const result = await fetchSubscription({ email: "buyer@example.com" });

    expect(global.fetch).toHaveBeenCalledWith(SUBSCRIPTION_ENDPOINT, expect.anything());
    expect(result.source).toBe("api");
    expect(result.data).toEqual({
      planName: "Personal",
      status: "trialing",
      priceUsd: 9,
      interval: "month",
      currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      verificationsUsed: 4,
      verificationsIncluded: 100,
    });
  });

  it("sends the stored auth token as a bearer header", async () => {
    window.localStorage.setItem(
      "stellarproof_auth",
      JSON.stringify({ isAuthenticated: true, token: "jwt-123" }),
    );
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({ success: true, data: { planName: "Pro" } }),
    );

    await fetchSubscription();

    expect(global.fetch).toHaveBeenCalledWith(
      SUBSCRIPTION_ENDPOINT,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer jwt-123" }),
      }),
    );
  });

  it("falls back to sample data when the API is unreachable", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await fetchSubscription({ email: "buyer@example.com" });

    expect(result.source).toBe("sample");
    expect(result.data.planName).toBe("Pro");
  });

  it("falls back to sample data when the endpoint is missing", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({ success: false, error: "Not found" }, false, 404),
    );

    const result = await fetchSubscription();

    expect(result.source).toBe("sample");
  });

  it("propagates aborts instead of falling back", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new DOMException("The user aborted a request.", "AbortError"),
    );

    await expect(fetchSubscription()).rejects.toThrow(/aborted/i);
  });
});

describe("fetchBillingInvoices", () => {
  it("maps the API payload and sorts newest first", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          invoices: [
            {
              invoiceNumber: "INV-2026-0001",
              issuedAt: "2026-01-05T00:00:00.000Z",
              dueAt: "2026-02-04T00:00:00.000Z",
              status: "PAID",
              billedToName: "Test User",
              lineItems: [{ description: "Pro plan", quantity: 1, unitPrice: 49 }],
            },
            {
              invoiceNumber: "INV-2026-0002",
              issuedAt: "2026-02-05T00:00:00.000Z",
              dueAt: "2026-03-07T00:00:00.000Z",
              status: "overdue",
              amountUsd: 49,
            },
          ],
        },
      }),
    );

    const result = await fetchBillingInvoices({ email: "buyer@example.com" });

    expect(global.fetch).toHaveBeenCalledWith(INVOICES_ENDPOINT, expect.anything());
    expect(result.source).toBe("api");
    expect(result.data.map((invoice) => invoice.id)).toEqual([
      "INV-2026-0002",
      "INV-2026-0001",
    ]);
    // A total-only invoice is expanded into a single line item.
    expect(result.data[0].lineItems).toEqual([
      { description: "Subscription charge", quantity: 1, unitPrice: 49 },
    ]);
    expect(result.data[0].billedToEmail).toBe("buyer@example.com");
  });

  it("accepts a bare array payload", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({ success: true, data: [{ invoiceNumber: "INV-1" }] }),
    );

    const result = await fetchBillingInvoices();

    expect(result.source).toBe("api");
    expect(result.data).toHaveLength(1);
  });

  it("falls back to sample invoices on an unexpected shape", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({ success: true, data: { invoices: "nope" } }),
    );

    const result = await fetchBillingInvoices({ email: "buyer@example.com" });

    expect(result.source).toBe("sample");
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("falls back to sample invoices when the response is not JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    } as unknown as Response);

    const result = await fetchBillingInvoices();

    expect(result.source).toBe("sample");
  });
});

describe("wire-shape mapping", () => {
  it("defaults missing invoice fields", () => {
    const invoice = mapApiInvoice({}, "fallback@example.com");

    expect(invoice.id).toBe("UNKNOWN");
    expect(invoice.status).toBe("pending");
    expect(invoice.currency).toBe("USD");
    expect(invoice.billedToEmail).toBe("fallback@example.com");
    expect(invoice.lineItems).toEqual([]);
  });

  it("normalises unknown statuses and intervals", () => {
    const subscription = mapApiSubscription({
      plan: "Team",
      status: "something-else",
      interval: "week",
      cancelAtPeriodEnd: true,
    });

    expect(subscription.planName).toBe("Team");
    expect(subscription.status).toBe("active");
    expect(subscription.interval).toBe("month");
    expect(subscription.cancelAtPeriodEnd).toBe(true);
    expect(subscription.verificationsIncluded).toBeNull();
  });

  it("keeps past_due when the API hyphenates it", () => {
    expect(mapApiSubscription({ status: "past-due" }).status).toBe("past_due");
  });
});

describe("subscription mutations", () => {
  it("sends the chosen plan and interval when changing plan", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: { planName: "Business", status: "active", priceUsd: 290, interval: "year" },
      }),
    );

    const subscription = await changeSubscriptionPlan({ planId: "business", interval: "year" });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(SUBSCRIPTION_ENDPOINT);
    expect(init.method).toBe("PUT");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ planId: "business", interval: "year" });
    expect(subscription.planName).toBe("Business");
    expect(subscription.interval).toBe("year");
  });

  it("surfaces the API error instead of falling back to sample data", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({ success: false, error: "Payment method declined." }, false, 402),
    );

    await expect(
      changeSubscriptionPlan({ planId: "personal", interval: "month" }),
    ).rejects.toThrow("Payment method declined.");
  });

  it("reports an unreachable API when changing plan", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      changeSubscriptionPlan({ planId: "personal", interval: "month" }),
    ).rejects.toThrow(/Unable to reach/i);
  });

  it("posts to the cancel endpoint and maps the returned subscription", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: { planName: "Personal", cancelAtPeriodEnd: true, interval: "month" },
      }),
    );

    const subscription = await cancelSubscription();

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(SUBSCRIPTION_CANCEL_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(subscription.cancelAtPeriodEnd).toBe(true);
  });

  it("posts to the resume endpoint", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: { planName: "Personal", cancelAtPeriodEnd: false, interval: "month" },
      }),
    );

    const subscription = await resumeSubscription();

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(SUBSCRIPTION_RESUME_ENDPOINT);
    expect(subscription.cancelAtPeriodEnd).toBe(false);
  });
});
