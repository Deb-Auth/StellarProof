/**
 * Tests for the plan comparison table, focused on the two layouts it renders
 * and on the mobile behaviour that keeps a dense table usable on a phone.
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import PricingTable, { COMPARISON_GROUPS, PLAN_NAMES } from "../components/PricingTable";

describe("PricingTable", () => {
  it("renders a column for every plan", () => {
    render(<PricingTable />);

    const table = screen.getByRole("table");
    PLAN_NAMES.forEach((plan) => {
      expect(within(table).getByRole("columnheader", { name: plan })).toBeInTheDocument();
    });
  });

  it("renders every feature row from the comparison data", () => {
    render(<PricingTable />);

    const table = screen.getByRole("table");
    COMPARISON_GROUPS.forEach((group) => {
      group.features.forEach((feature) => {
        expect(within(table).getByRole("rowheader", { name: feature.name })).toBeInTheDocument();
      });
    });
  });

  it("shows plan-specific values rather than only icons", () => {
    render(<PricingTable />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Testnet")).toBeInTheDocument();
    expect(within(table).getAllByText("Unlimited").length).toBe(3);
  });

  it("keeps the wide table inside its own horizontally scrollable region", () => {
    render(<PricingTable />);

    // The table is wider than a phone viewport on purpose; the page must not
    // scroll sideways, so the overflow is owned by this container.
    const scroller = screen.getByTestId("pricing-table-scroll");
    expect(scroller).toHaveClass("overflow-x-auto");
    expect(scroller).toContainElement(screen.getByRole("table"));

    // Reachable by keyboard, since a scroll container with no focusable child
    // cannot otherwise be scrolled without a pointer.
    expect(scroller).toHaveAttribute("tabindex", "0");
  });

  it("stacks the same data into collapsible groups for small screens", () => {
    render(<PricingTable />);

    const mobile = within(screen.getByTestId("pricing-table-mobile"));
    COMPARISON_GROUPS.forEach((group) => {
      expect(mobile.getByRole("button", { name: new RegExp(group.name, "i") })).toBeInTheDocument();
    });
    expect(mobile.queryByRole("table")).not.toBeInTheDocument();
  });

  it("opens the mobile groups by default and collapses them on demand", async () => {
    const user = userEvent.setup();
    render(<PricingTable />);

    const mobile = within(screen.getByTestId("pricing-table-mobile"));
    const verification = mobile.getByRole("button", { name: /verification/i });

    expect(verification).toHaveAttribute("aria-expanded", "true");
    expect(mobile.getByText("Bulk verification")).toBeVisible();

    await user.click(verification);

    expect(verification).toHaveAttribute("aria-expanded", "false");
    expect(mobile.getByText("Bulk verification")).not.toBeVisible();

    await user.click(verification);

    expect(verification).toHaveAttribute("aria-expanded", "true");
    expect(mobile.getByText("Bulk verification")).toBeVisible();
  });

  it("collapses only the group that was toggled", async () => {
    const user = userEvent.setup();
    render(<PricingTable />);

    const mobile = within(screen.getByTestId("pricing-table-mobile"));
    await user.click(mobile.getByRole("button", { name: /verification/i }));

    expect(mobile.getByRole("button", { name: /support/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("labels each plan next to its value in the mobile layout", () => {
    render(<PricingTable />);

    const mobile = within(screen.getByTestId("pricing-table-mobile"));
    PLAN_NAMES.forEach((plan) => {
      expect(mobile.getAllByText(plan).length).toBeGreaterThan(0);
    });
  });

  it("describes capability icons for screen readers", () => {
    render(<PricingTable />);

    const table = within(screen.getByRole("table"));
    expect(table.getAllByText("Included in Business").length).toBeGreaterThan(0);
    expect(table.getAllByText("Not included in Free").length).toBeGreaterThan(0);
  });
});
