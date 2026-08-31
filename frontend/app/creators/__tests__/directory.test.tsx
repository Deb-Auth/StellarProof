/**
 * Tests for the Creator Directory page.
 *
 * The page derives its data from `app/creators/services/creatorService`,
 * which is mocked here so card rendering, search input filtering and the
 * lazy-loading behaviour can be asserted deterministically. jsdom has no
 * Intersection Observer, so a controllable stub is installed that lets the
 * tests decide exactly when the sentinel "scrolls" into view.
 */
import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatorsPage from "../page";
import {
  fetchCreators,
  mergeCreators,
  groupCertificatesByCreator,
} from "../services/creatorService";
import type { Creator, CreatorPage } from "../types";
import type { SearchResult } from "../../search/types";

jest.mock("../services/creatorService", () => {
  const actual = jest.requireActual("../services/creatorService");
  return { ...actual, fetchCreators: jest.fn() };
});

// The app Header pulls in wallet/network contexts; it is not under test here.
jest.mock("../../../components/Header", () => ({
  __esModule: true,
  default: () => <header data-testid="app-header" />,
}));

const mockedFetchCreators = fetchCreators as jest.MockedFunction<
  typeof fetchCreators
>;

/* ------------------------------------------------------------------ */
/*                     Intersection Observer stub                      */
/* ------------------------------------------------------------------ */

type ObserverCallback = ConstructorParameters<typeof IntersectionObserver>[0];

/** Callbacks of every observer currently watching an element. */
let activeObservers: ObserverCallback[] = [];

class MockIntersectionObserver {
  private readonly callback: ObserverCallback;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
  }

  observe() {
    activeObservers.push(this.callback);
  }

  unobserve() {
    activeObservers = activeObservers.filter((cb) => cb !== this.callback);
  }

  disconnect() {
    this.unobserve();
  }

  takeRecords() {
    return [];
  }
}

/**
 * Simulate the sentinel scrolling into view. Wrapped in `act` because the
 * observer callback is what schedules the next page load.
 */
function scrollSentinelIntoView() {
  const entry = { isIntersecting: true } as IntersectionObserverEntry;
  act(() => {
    for (const callback of [...activeObservers]) {
      callback([entry], {} as IntersectionObserver);
    }
  });
}

/* ------------------------------------------------------------------ */
/*                              Fixtures                               */
/* ------------------------------------------------------------------ */

function creator(overrides: Partial<Creator> & { address: string }): Creator {
  return {
    assetCount: 1,
    latestMintedAt: "2026-02-01T10:00:00.000Z",
    categories: [],
    ...overrides,
  };
}

const aurora = creator({
  address: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
  name: "Aurora Studios",
  assetCount: 12,
  latestMintedAt: "2026-02-21T12:00:00.000Z",
  categories: ["Audio", "Image"],
});

const genesis = creator({
  address: "GDQP2KPQGKIHYMV727FKZ5XZ7Y7Q3O3F2K3Z3JJQNZQFCK4LVNXJKJLE",
  name: "Genesis Collective",
  assetCount: 3,
  latestMintedAt: "2026-01-12T10:42:00.000Z",
  categories: ["Image"],
});

const nova = creator({
  address: "GNOVA5555555555555555555555555555555555555555555555555",
  name: "Nova Works",
  assetCount: 7,
  latestMintedAt: "2026-01-05T08:00:00.000Z",
});

function page(creators: Creator[], hasMore = false): CreatorPage {
  return { creators, hasMore };
}

beforeEach(() => {
  activeObservers = [];
  mockedFetchCreators.mockReset();
  (
    window as unknown as { IntersectionObserver: unknown }
  ).IntersectionObserver = MockIntersectionObserver;
  (
    globalThis as unknown as { IntersectionObserver: unknown }
  ).IntersectionObserver = MockIntersectionObserver;
});

/** All creator card headings currently on screen, in DOM order. */
function renderedCreatorNames(): string[] {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent ?? "");
}

/* ------------------------------------------------------------------ */
/*                          Card rendering                             */
/* ------------------------------------------------------------------ */

describe("CreatorsPage rendering", () => {
  it("renders a skeleton while the first page loads", async () => {
    let resolvePage: (value: CreatorPage) => void = () => {};
    mockedFetchCreators.mockReturnValueOnce(
      new Promise<CreatorPage>((resolve) => {
        resolvePage = resolve;
      })
    );

    render(<CreatorsPage />);

    expect(screen.getAllByTestId("creator-card-skeleton").length).toBeGreaterThan(
      0
    );
    expect(screen.getByRole("status")).toHaveTextContent(/loading creators/i);

    await act(async () => {
      resolvePage(page([aurora]));
    });
    expect(screen.getByText("Aurora Studios")).toBeInTheDocument();
    expect(
      screen.queryByTestId("creator-card-skeleton")
    ).not.toBeInTheDocument();
  });

  it("renders a card per creator with its details", async () => {
    mockedFetchCreators.mockResolvedValue(page([aurora, genesis]));

    render(<CreatorsPage />);

    await screen.findByText("Aurora Studios");
    const list = screen.getByRole("list", { name: /creators/i });
    // One card per creator (the nested lists are the category chips).
    expect(within(list).getAllByRole("heading", { level: 3 })).toHaveLength(2);

    expect(screen.getByText("Genesis Collective")).toBeInTheDocument();
    expect(screen.getByText("12 verified assets")).toBeInTheDocument();
    expect(screen.getByText("3 verified assets")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 creators loaded");
  });

  it("links each card to that creator's assets and shows its categories", async () => {
    mockedFetchCreators.mockResolvedValue(page([aurora]));

    render(<CreatorsPage />);

    const link = await screen.findByRole("link", {
      name: /view verified assets by aurora studios/i,
    });
    expect(link).toHaveAttribute(
      "href",
      `/search?creator=${encodeURIComponent(aurora.address)}`
    );
    expect(within(link).getByText("Audio")).toBeInTheDocument();
    expect(within(link).getByText("Image")).toBeInTheDocument();
  });

  it("falls back to a truncated address when the creator has no name", async () => {
    mockedFetchCreators.mockResolvedValue(
      page([creator({ address: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPA" })])
    );

    render(<CreatorsPage />);

    expect(
      await screen.findByRole("heading", { level: 3, name: /GBVBK2…DJPA/ })
    ).toBeInTheDocument();
  });

  it("uses the singular label for a creator with one asset", async () => {
    mockedFetchCreators.mockResolvedValue(
      page([creator({ address: "GSOLO", assetCount: 1 })])
    );

    render(<CreatorsPage />);

    expect(await screen.findByText("1 verified asset")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 creator loaded");
  });

  it("shows an empty state when the directory has no creators", async () => {
    mockedFetchCreators.mockResolvedValue(page([]));

    render(<CreatorsPage />);

    expect(
      await screen.findByText(/no creators have been indexed yet/i)
    ).toBeInTheDocument();
  });

  it("shows an error with a retry action when the request fails", async () => {
    mockedFetchCreators.mockRejectedValueOnce(new Error("Network unreachable"));

    render(<CreatorsPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Network unreachable");

    mockedFetchCreators.mockResolvedValueOnce(page([aurora]));
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Aurora Studios")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*                        Search input filtering                       */
/* ------------------------------------------------------------------ */

describe("CreatorsPage search", () => {
  it("requests the directory filtered by the typed query", async () => {
    mockedFetchCreators.mockResolvedValue(page([aurora, genesis]));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    mockedFetchCreators.mockResolvedValue(page([genesis]));
    await userEvent.type(
      screen.getByLabelText(/search creators/i),
      "genesis"
    );

    await waitFor(() =>
      expect(mockedFetchCreators).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "genesis", page: 0 })
      )
    );
    await waitFor(() =>
      expect(screen.queryByText("Aurora Studios")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Genesis Collective")).toBeInTheDocument();
  });

  it("debounces the query so typing does not fire a request per keystroke", async () => {
    mockedFetchCreators.mockResolvedValue(page([aurora]));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");
    mockedFetchCreators.mockClear();

    await userEvent.type(screen.getByLabelText(/search creators/i), "aurora");

    await waitFor(() => expect(mockedFetchCreators).toHaveBeenCalledTimes(1));
    expect(mockedFetchCreators).toHaveBeenCalledWith(
      expect.objectContaining({ search: "aurora" })
    );
  });

  it("ignores surrounding whitespace in the query", async () => {
    mockedFetchCreators.mockResolvedValue(page([aurora]));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    await userEvent.type(screen.getByLabelText(/search creators/i), "  nova  ");

    await waitFor(() =>
      expect(mockedFetchCreators).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "nova" })
      )
    );
  });

  it("restarts pagination from the first page when the query changes", async () => {
    mockedFetchCreators.mockResolvedValue(page([aurora], true));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    mockedFetchCreators.mockResolvedValue(page([genesis], true));
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() =>
      expect(mockedFetchCreators).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 })
      )
    );

    mockedFetchCreators.mockResolvedValue(page([nova], false));
    await userEvent.type(screen.getByLabelText(/search creators/i), "nova");

    await waitFor(() =>
      expect(mockedFetchCreators).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 0, search: "nova" })
      )
    );
    // The previous pages are replaced, not appended to.
    await waitFor(() => expect(renderedCreatorNames()).toEqual(["Nova Works"]));
  });

  it("shows a query-specific empty state and restores results when cleared", async () => {
    mockedFetchCreators.mockResolvedValue(page([aurora]));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    mockedFetchCreators.mockResolvedValue(page([]));
    await userEvent.type(screen.getByLabelText(/search creators/i), "zzz");
    expect(
      await screen.findByText(/no creators match/i)
    ).toHaveTextContent("zzz");

    mockedFetchCreators.mockResolvedValue(page([aurora]));
    await userEvent.click(screen.getByRole("button", { name: /clear search/i }));

    expect(await screen.findByText("Aurora Studios")).toBeInTheDocument();
    expect(screen.getByLabelText(/search creators/i)).toHaveValue("");
  });
});

/* ------------------------------------------------------------------ */
/*                            Lazy loading                             */
/* ------------------------------------------------------------------ */

describe("CreatorsPage lazy loading", () => {
  it("appends the next page when the sentinel scrolls into view", async () => {
    mockedFetchCreators.mockResolvedValueOnce(page([aurora], true));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    mockedFetchCreators.mockResolvedValueOnce(page([genesis], false));
    scrollSentinelIntoView();

    expect(await screen.findByText("Genesis Collective")).toBeInTheDocument();
    expect(renderedCreatorNames()).toEqual([
      "Aurora Studios",
      "Genesis Collective",
    ]);
    expect(mockedFetchCreators).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it("stops observing once the last page has loaded", async () => {
    mockedFetchCreators.mockResolvedValueOnce(page([aurora], true));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    mockedFetchCreators.mockResolvedValueOnce(page([genesis], false));
    scrollSentinelIntoView();
    await screen.findByText("Genesis Collective");

    await waitFor(() =>
      expect(
        screen.queryByTestId("infinite-scroll-sentinel")
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByText(/you have reached the end of the directory/i)
    ).toBeInTheDocument();

    const callsBefore = mockedFetchCreators.mock.calls.length;
    scrollSentinelIntoView();
    expect(mockedFetchCreators).toHaveBeenCalledTimes(callsBefore);
  });

  it("does not request the same page twice while one is in flight", async () => {
    mockedFetchCreators.mockResolvedValueOnce(page([aurora], true));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    let resolveSecond: (value: CreatorPage) => void = () => {};
    mockedFetchCreators.mockReturnValueOnce(
      new Promise<CreatorPage>((resolve) => {
        resolveSecond = resolve;
      })
    );

    scrollSentinelIntoView();
    await screen.findByText(/loading more creators/i);
    const callsAfterFirstTrigger = mockedFetchCreators.mock.calls.length;

    scrollSentinelIntoView();
    expect(mockedFetchCreators).toHaveBeenCalledTimes(callsAfterFirstTrigger);

    resolveSecond(page([genesis], false));
    await screen.findByText("Genesis Collective");
  });

  it("offers a Load more fallback for browsers without an observer", async () => {
    mockedFetchCreators.mockResolvedValueOnce(page([aurora], true));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    mockedFetchCreators.mockResolvedValueOnce(page([genesis], false));
    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(await screen.findByText("Genesis Collective")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /load more/i })
    ).not.toBeInTheDocument();
  });

  it("does not render pagination affordances for a single-page directory", async () => {
    mockedFetchCreators.mockResolvedValue(page([aurora], false));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    expect(
      screen.queryByTestId("infinite-scroll-sentinel")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /load more/i })
    ).not.toBeInTheDocument();
  });

  it("stops paginating after a failed page load", async () => {
    mockedFetchCreators.mockResolvedValueOnce(page([aurora], true));

    render(<CreatorsPage />);
    await screen.findByText("Aurora Studios");

    mockedFetchCreators.mockRejectedValueOnce(new Error("Page load failed"));
    scrollSentinelIntoView();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Page load failed"
    );
    expect(
      screen.queryByTestId("infinite-scroll-sentinel")
    ).not.toBeInTheDocument();
    // The already-loaded creators stay on screen.
    expect(screen.getByText("Aurora Studios")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*                       Directory aggregation                         */
/* ------------------------------------------------------------------ */

function certificate(overrides: Partial<SearchResult>): SearchResult {
  return {
    id: "cert-1",
    hash: "0xabc",
    creator: aurora.address,
    mintedAt: "2026-01-01T00:00:00.000Z",
    status: "verified",
    ...overrides,
  };
}

describe("groupCertificatesByCreator", () => {
  it("aggregates certificates into one entry per creator", () => {
    const grouped = groupCertificatesByCreator([
      certificate({ id: "a", type: "Image" }),
      certificate({
        id: "b",
        type: "Audio",
        mintedAt: "2026-03-01T00:00:00.000Z",
      }),
      certificate({ id: "c", creator: genesis.address, type: "Image" }),
    ]);

    expect(grouped).toHaveLength(2);
    const [newest] = grouped;
    expect(newest.address).toBe(aurora.address);
    expect(newest.assetCount).toBe(2);
    expect(newest.latestMintedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(newest.categories).toEqual(["Image", "Audio"]);
  });

  it("skips certificates with no attributable creator", () => {
    expect(
      groupCertificatesByCreator([
        certificate({ id: "a", creator: "" }),
        certificate({ id: "b", creator: "   " }),
      ])
    ).toEqual([]);
  });

  it("orders creators by most recent activity", () => {
    const grouped = groupCertificatesByCreator([
      certificate({ id: "a", mintedAt: "2026-01-01T00:00:00.000Z" }),
      certificate({
        id: "b",
        creator: genesis.address,
        mintedAt: "2026-05-01T00:00:00.000Z",
      }),
    ]);

    expect(grouped.map((entry) => entry.address)).toEqual([
      genesis.address,
      aurora.address,
    ]);
  });
});

describe("mergeCreators", () => {
  it("appends creators that are not loaded yet", () => {
    expect(mergeCreators([aurora], [genesis])).toEqual([aurora, genesis]);
  });

  it("folds a repeated creator into the loaded entry", () => {
    const merged = mergeCreators(
      [creator({ address: "GX", assetCount: 2, categories: ["Image"] })],
      [
        creator({
          address: "GX",
          assetCount: 3,
          latestMintedAt: "2026-06-01T00:00:00.000Z",
          categories: ["Image", "Video"],
        }),
      ]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].assetCount).toBe(5);
    expect(merged[0].latestMintedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(merged[0].categories).toEqual(["Image", "Video"]);
  });

  it("preserves the order of the already loaded creators", () => {
    const merged = mergeCreators(
      [aurora, genesis],
      [creator({ address: aurora.address }), nova]
    );

    expect(merged.map((entry) => entry.address)).toEqual([
      aurora.address,
      genesis.address,
      nova.address,
    ]);
  });

  it("does not mutate the arrays it is given", () => {
    const existing = [creator({ address: "GX", assetCount: 2 })];
    mergeCreators(existing, [creator({ address: "GX", assetCount: 3 })]);
    expect(existing[0].assetCount).toBe(2);
  });
});
