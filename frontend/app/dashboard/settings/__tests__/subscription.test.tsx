/**
 * Unit tests for the subscription plan manager: how it renders the current
 * subscription returned by the billing API, which plan actions it offers, and
 * how the upgrade, downgrade, cancel and resume calls behave.
 */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import SubscriptionSettingsPage from "../subscription/page";
import type { Subscription } from "@/services/billingMock";

jest.mock("@/app/context/AuthContext", () => ({
  useAuth: () => ({ user: { email: "buyer@example.com" } }),
}));

jest.mock("@/services/billingService", () => ({
  fetchSubscription: jest.fn(),
  changeSubscriptionPlan: jest.fn(),
  cancelSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
}));

import {
  cancelSubscription,
  changeSubscriptionPlan,
  fetchSubscription,
  resumeSubscription,
} from "@/services/billingService";

const mockFetchSubscription = fetchSubscription as jest.Mock;
const mockChangePlan = changeSubscriptionPlan as jest.Mock;
const mockCancel = cancelSubscription as jest.Mock;
const mockResume = resumeSubscription as jest.Mock;

const PERSONAL: Subscription = {
  planName: "Personal",
  status: "active",
  priceUsd: 9,
  interval: "month",
  currentPeriodEnd: new Date("2026-09-15T00:00:00.000Z").toISOString(),
  cancelAtPeriodEnd: false,
  verificationsUsed: 12,
  verificationsIncluded: null,
};

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return { ...PERSONAL, ...overrides };
}

/** Renders the page and waits for the initial load to settle. */
async function renderPage() {
  render(<SubscriptionSettingsPage />);
  await waitFor(() => expect(screen.getByTestId("current-plan-card")).toBeInTheDocument());
}

function planButton(planId: string): HTMLElement {
  return within(screen.getByTestId(`plan-card-${planId}`)).getByRole("button");
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockFetchSubscription.mockResolvedValue({ data: subscription(), source: "api" });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("subscription loading", () => {
  it("shows a skeleton until the subscription arrives", async () => {
    render(<SubscriptionSettingsPage />);

    expect(screen.getByTestId("subscription-skeleton")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId("current-plan-card")).toBeInTheDocument());
    expect(screen.queryByTestId("subscription-skeleton")).not.toBeInTheDocument();
  });

  it("renders the plan, status, renewal date and usage from the API", async () => {
    mockFetchSubscription.mockResolvedValue({
      data: subscription({ status: "trialing", verificationsIncluded: 100 }),
      source: "api",
    });

    await renderPage();

    const card = screen.getByTestId("current-plan-card");
    expect(within(card).getByRole("heading", { name: /personal plan/i })).toBeInTheDocument();
    expect(within(card).getByText("$9.00 per month")).toBeInTheDocument();
    expect(screen.getByTestId("subscription-status")).toHaveTextContent("Trial");
    expect(within(card).getByText("Renews on")).toBeInTheDocument();
    expect(within(card).getByText("12 of 100")).toBeInTheDocument();
    expect(mockFetchSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ email: "buyer@example.com" }),
    );
  });

  it("flags sample figures when the API is unavailable", async () => {
    mockFetchSubscription.mockResolvedValue({ data: subscription(), source: "sample" });

    await renderPage();

    expect(screen.getByTestId("sample-data-notice")).toBeInTheDocument();
  });

  it("hides the sample notice when the data is live", async () => {
    await renderPage();

    expect(screen.queryByTestId("sample-data-notice")).not.toBeInTheDocument();
  });

  it("offers a retry when the subscription cannot be loaded", async () => {
    const user = userEvent.setup();
    mockFetchSubscription.mockRejectedValueOnce(new Error("network down"));

    render(<SubscriptionSettingsPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not load your subscription/i);

    mockFetchSubscription.mockResolvedValue({ data: subscription(), source: "api" });
    await user.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(screen.getByTestId("current-plan-card")).toBeInTheDocument());
    expect(mockFetchSubscription).toHaveBeenCalledTimes(2);
  });
});

describe("plan button states", () => {
  it("labels cheaper plans as downgrades and richer plans as upgrades", async () => {
    await renderPage();

    expect(planButton("free")).toHaveTextContent("Downgrade");
    expect(planButton("business")).toHaveTextContent("Upgrade");
  });

  it("disables the plan the user is already on", async () => {
    await renderPage();

    const current = planButton("personal");
    expect(current).toHaveTextContent("Current plan");
    expect(current).toBeDisabled();
  });

  it("moves the current-plan marker when the subscription is on another plan", async () => {
    mockFetchSubscription.mockResolvedValue({
      data: subscription({ planName: "Business", priceUsd: 29 }),
      source: "api",
    });

    await renderPage();

    expect(planButton("business")).toBeDisabled();
    expect(planButton("personal")).toHaveTextContent("Downgrade");
    expect(planButton("free")).toHaveTextContent("Downgrade");
  });

  it("sends sales-assisted plans to the contact page instead of the API", async () => {
    await renderPage();

    const enterprise = within(screen.getByTestId("plan-card-enterprise"));
    expect(enterprise.getByRole("link", { name: /contact sales/i })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(enterprise.queryByRole("button")).not.toBeInTheDocument();
  });

  it("treats every plan as available when the current plan is not in the catalogue", async () => {
    mockFetchSubscription.mockResolvedValue({
      data: subscription({ planName: "Legacy Pro" }),
      source: "api",
    });

    await renderPage();

    expect(planButton("free")).toHaveTextContent("Upgrade");
    expect(planButton("free")).toBeEnabled();
    expect(planButton("business")).toBeEnabled();
  });
});

describe("changing plan", () => {
  it("upgrades through the API and shows the updated plan", async () => {
    const user = userEvent.setup();
    mockChangePlan.mockResolvedValue(subscription({ planName: "Business", priceUsd: 29 }));

    await renderPage();
    await user.click(planButton("business"));

    await waitFor(() =>
      expect(mockChangePlan).toHaveBeenCalledWith({ planId: "business", interval: "month" }),
    );
    expect(await screen.findByTestId("action-message")).toHaveTextContent(
      /now on the Business plan/i,
    );
    expect(
      within(screen.getByTestId("current-plan-card")).getByRole("heading", {
        name: /business plan/i,
      }),
    ).toBeInTheDocument();
    expect(planButton("business")).toBeDisabled();
  });

  it("downgrades through the API with a wording that matches the direction", async () => {
    const user = userEvent.setup();
    mockChangePlan.mockResolvedValue(subscription({ planName: "Free", priceUsd: 0 }));

    await renderPage();
    await user.click(planButton("free"));

    await waitFor(() =>
      expect(mockChangePlan).toHaveBeenCalledWith({ planId: "free", interval: "month" }),
    );
    expect(await screen.findByTestId("action-message")).toHaveTextContent(
      /will change to Free/i,
    );
  });

  it("switches prices and the requested interval when yearly billing is picked", async () => {
    const user = userEvent.setup();
    mockChangePlan.mockResolvedValue(subscription({ planName: "Business", priceUsd: 290, interval: "year" }));

    await renderPage();

    const business = within(screen.getByTestId("plan-card-business"));
    expect(business.getByText("$29.00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yearly" }));
    expect(business.getByText("$290.00")).toBeInTheDocument();

    await user.click(planButton("business"));

    await waitFor(() =>
      expect(mockChangePlan).toHaveBeenCalledWith({ planId: "business", interval: "year" }),
    );
  });

  it("reports a failed plan change and keeps the current plan", async () => {
    const user = userEvent.setup();
    mockChangePlan.mockRejectedValue(new Error("Payment method declined."));

    await renderPage();
    await user.click(planButton("business"));

    expect(await screen.findByTestId("action-error")).toHaveTextContent(
      "Payment method declined.",
    );
    expect(screen.queryByTestId("action-message")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("current-plan-card")).getByRole("heading", {
        name: /personal plan/i,
      }),
    ).toBeInTheDocument();
  });

  it("disables the other plan actions while a change is in flight", async () => {
    const user = userEvent.setup();
    let resolveChange: (value: Subscription) => void = () => {};
    mockChangePlan.mockReturnValue(
      new Promise<Subscription>((resolve) => {
        resolveChange = resolve;
      }),
    );

    await renderPage();
    await user.click(planButton("business"));

    await waitFor(() => expect(planButton("business")).toHaveAttribute("aria-busy", "true"));
    expect(planButton("free")).toBeDisabled();

    resolveChange(subscription({ planName: "Business", priceUsd: 29 }));
    await waitFor(() => expect(screen.getByTestId("action-message")).toBeInTheDocument());
  });
});

describe("cancelling and resuming", () => {
  it("asks for confirmation before calling the cancel API", async () => {
    const user = userEvent.setup();
    mockCancel.mockResolvedValue(subscription({ cancelAtPeriodEnd: true }));

    await renderPage();
    await user.click(screen.getByRole("button", { name: /^cancel subscription$/i }));

    expect(mockCancel).not.toHaveBeenCalled();
    expect(screen.getByText(/cancel your Personal plan\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /yes, cancel/i }));

    await waitFor(() => expect(mockCancel).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("cancel-scheduled-notice")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume subscription/i })).toBeInTheDocument();
  });

  it("keeps the plan when the confirmation is dismissed", async () => {
    const user = userEvent.setup();

    await renderPage();
    await user.click(screen.getByRole("button", { name: /^cancel subscription$/i }));
    await user.click(screen.getByRole("button", { name: /keep my plan/i }));

    expect(mockCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^cancel subscription$/i })).toBeInTheDocument();
  });

  it("does not offer cancellation on the free plan", async () => {
    mockFetchSubscription.mockResolvedValue({
      data: subscription({ planName: "Free", priceUsd: 0 }),
      source: "api",
    });

    await renderPage();

    expect(screen.getByRole("button", { name: /^cancel subscription$/i })).toBeDisabled();
  });

  it("resumes a subscription that was set to end", async () => {
    const user = userEvent.setup();
    mockFetchSubscription.mockResolvedValue({
      data: subscription({ cancelAtPeriodEnd: true }),
      source: "api",
    });
    mockResume.mockResolvedValue(subscription({ cancelAtPeriodEnd: false }));

    await renderPage();
    await user.click(screen.getByRole("button", { name: /resume subscription/i }));

    await waitFor(() => expect(mockResume).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("action-message")).toHaveTextContent(/auto-renewal is back on/i);
    expect(screen.queryByTestId("cancel-scheduled-notice")).not.toBeInTheDocument();
  });

  it("reports a failed cancellation", async () => {
    const user = userEvent.setup();
    mockCancel.mockRejectedValue(new Error("Subscription is already cancelled."));

    await renderPage();
    await user.click(screen.getByRole("button", { name: /^cancel subscription$/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel/i }));

    expect(await screen.findByTestId("action-error")).toHaveTextContent(
      "Subscription is already cancelled.",
    );
  });
});
