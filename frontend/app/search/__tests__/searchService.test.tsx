/**
 * Tests for the Global Certificate Search page.
 *
 * The page fetches real certificate data from the backend API through
 * `app/search/services/searchService`; the service is mocked here so the
 * tests can assert loading, success, error, debounce, cache-restore and
 * view-toggle behaviour deterministically.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchPage from "../page";
import {
  fetchAllCertificates,
  searchCertificates,
} from "../services/searchService";
import type { SearchResult } from "../types";

jest.mock("../services/searchService", () => ({
  fetchAllCertificates: jest.fn(),
  searchCertificates: jest.fn(),
}));

// The app Header pulls in wallet/network contexts; it is not under test here.
jest.mock("../../../components/Header", () => ({
  __esModule: true,
  default: () => <header data-testid="app-header" />,
}));

const mockedFetchAll = fetchAllCertificates as jest.MockedFunction<
  typeof fetchAllCertificates
>;
const mockedSearch = searchCertificates as jest.MockedFunction<
  typeof searchCertificates
>;

const aurora: SearchResult = {
  id: "cert-aurora-001",
  name: "Aurora — Limited Edition Album",
  description: "Limited release album verified on-chain",
  hash: "0xa1b2c3d4e5f6",
  creator: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
  mintedAt: "2026-01-12T10:42:00Z",
  status: "verified",
  type: "Audio",
  network: "Stellar",
};

const painting: SearchResult = {
  id: "cert-painting-003",
  name: "Genesis — Original Painting",
  description: "Original artwork anchored on Stellar",
  hash: "0xc3d4e5f6a7b8",
  creator: "GDQP2KPQGKIHYMV727FKZ5XZ7Y7Q3O3F2K3Z3JJQNZQFCK4LVNXJKJLE",
  mintedAt: "2026-02-21T12:00:00Z",
  status: "pending",
  type: "Image",
  network: "Stellar",
};

describe("SearchPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchAll.mockResolvedValue([aurora, painting]);
    mockedSearch.mockResolvedValue([aurora]);
  });

  it("loads the global certificate index from the API on mount", async () => {
    render(<SearchPage />);

    expect(
      screen.getByRole("heading", { name: /global certificate search/i }),
    ).toBeInTheDocument();

    expect(mockedFetchAll).toHaveBeenCalledTimes(1);
    expect(mockedFetchAll).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    // Certificates returned by the API are rendered into the list view.
    expect(
      await screen.findByText("Aurora — Limited Edition Album"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Genesis — Original Painting"),
    ).toBeInTheDocument();
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("shows a loading skeleton while the fetch is in flight", () => {
    mockedFetchAll.mockReturnValue(new Promise(() => {}));

    render(<SearchPage />);

    expect(
      screen.getByRole("list", { name: /loading search results/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders an error state when the initial fetch fails", async () => {
    mockedFetchAll.mockRejectedValue(new Error("network down"));

    render(<SearchPage />);

    expect(
      await screen.findByText(
        /failed to load global certificate index/i,
      ),
    ).toBeInTheDocument();
  });

  it("performs a debounced search against the API when the user types", async () => {
    const user = userEvent.setup();
    render(<SearchPage />);

    // Wait for the initial index load to finish first.
    await screen.findByText("Aurora — Limited Edition Album");

    await user.type(screen.getByRole("searchbox"), "aurora");

    await waitFor(() =>
      expect(mockedSearch).toHaveBeenCalledWith(
        "aurora",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );

    // Search response replaces the index data.
    expect(
      await screen.findByText("Aurora — Limited Edition Album"),
    ).toBeInTheDocument();
  });

  it("shows an error message when the search request fails", async () => {
    mockedSearch.mockRejectedValue(new Error("server exploded"));
    const user = userEvent.setup();
    render(<SearchPage />);

    await screen.findByText("Aurora — Limited Edition Album");
    await user.type(screen.getByRole("searchbox"), "broken");

    expect(
      await screen.findByText(/search failed\. please try again\./i),
    ).toBeInTheDocument();
  });

  it("restores the cached index when the search is cleared", async () => {
    const user = userEvent.setup();
    render(<SearchPage />);

    await screen.findByText("Genesis — Original Painting");
    await user.type(screen.getByRole("searchbox"), "aurora");
    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(1));

    // Clear restores the cached index without hitting the API again.
    await user.click(screen.getByRole("button", { name: /clear search/i }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    await waitFor(() =>
      expect(
        screen.getByText("Genesis — Original Painting"),
      ).toBeInTheDocument(),
    );
    expect(mockedFetchAll).toHaveBeenCalledTimes(1);
    expect(mockedSearch).toHaveBeenCalledTimes(1);
  });

  it("passes adapted certificate data to the grid view", async () => {
    const user = userEvent.setup();
    mockedFetchAll.mockResolvedValue([aurora]);
    render(<SearchPage />);

    await screen.findByText("Aurora — Limited Edition Album");
    expect(
      screen.queryByAltText("Aurora — Limited Edition Album"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /grid view/i }));

    // GridView receives mapped `{ id, title, thumbnailUrl, issuerName, issueDate }`.
    expect(
      screen.getByAltText("Aurora — Limited Edition Album"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /list view/i }));
    expect(
      screen.queryByAltText("Aurora — Limited Edition Album"),
    ).not.toBeInTheDocument();
  });
});
