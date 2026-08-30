import React from "react";
import { render, screen } from "@testing-library/react";
import SearchNoResults from "@/components/ui/EmptyStates/SearchNoResults";
import EmptyVault from "@/components/ui/EmptyStates/EmptyVault";

describe("SearchNoResults", () => {
  it("renders the empty state when the search results array is empty", () => {
    const results: unknown[] = [];

    render(
      <>{results.length === 0 && <SearchNoResults query="invoice" />}</>,
    );

    expect(screen.getByTestId("search-no-results")).toBeInTheDocument();
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice/i)).toBeInTheDocument();
  });

  it("does not render when results are present", () => {
    const results = [{ id: "1" }];

    render(<>{results.length === 0 && <SearchNoResults />}</>);

    expect(screen.queryByTestId("search-no-results")).not.toBeInTheDocument();
  });
});

describe("EmptyVault", () => {
  it("renders the empty state when the vault items array is empty", () => {
    const vaultItems: unknown[] = [];

    render(<>{vaultItems.length === 0 && <EmptyVault />}</>);

    expect(screen.getByTestId("empty-vault")).toBeInTheDocument();
    expect(screen.getByText(/your vault is empty/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /secure your first file/i }),
    ).toBeInTheDocument();
  });

  it("does not render when vault items are present", () => {
    const vaultItems = [{ id: "1" }];

    render(<>{vaultItems.length === 0 && <EmptyVault />}</>);

    expect(screen.queryByTestId("empty-vault")).not.toBeInTheDocument();
  });
});
