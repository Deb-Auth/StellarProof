/**
 * Unit tests for the Advanced Search Filters modal and its URL syncing logic.
 *
 * Two layers are covered here:
 *
 *  1. `AdvancedFiltersModal` - the presentational modal. It owns a local
 *     draft of the filters, so the tests assert that edits stay local until
 *     "Apply Filters" is pressed and that Cancel / Reset discard them.
 *  2. `AdvancedFiltersControl` - the container that keeps the applied filters
 *     in sync with the URL. `next/navigation` (`useRouter`, `usePathname`,
 *     `useSearchParams`) is mocked so the tests can drive the query string
 *     and assert the `router.replace` calls the component makes.
 *
 * The pure serialize/parse helpers are exercised directly since they are the
 * contract between the modal state and the shareable URL.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AdvancedFiltersControl,
  AdvancedFiltersModal,
  advancedFiltersFromSearchParams,
  advancedFiltersToSearchParams,
  hasActiveAdvancedFilters,
  DEFAULT_ADVANCED_FILTERS,
  type AdvancedFilters,
} from "../AdvancedFiltersModal";

/* ------------------------------------------------------------------ */
/*                        next/navigation mock                         */
/* ------------------------------------------------------------------ */

const replace = jest.fn();
const push = jest.fn();
let currentSearchParams = new URLSearchParams();
let currentPathname = "/vault";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
}));

/* ------------------------------------------------------------------ */
/*                              Helpers                                */
/* ------------------------------------------------------------------ */

function renderModal(overrides?: {
  open?: boolean;
  filters?: AdvancedFilters;
  onClose?: () => void;
  onApply?: (filters: AdvancedFilters) => void;
}) {
  const onClose = overrides?.onClose ?? jest.fn();
  const onApply = overrides?.onApply ?? jest.fn();
  const utils = render(
    <AdvancedFiltersModal
      open={overrides?.open ?? true}
      onClose={onClose}
      filters={overrides?.filters ?? DEFAULT_ADVANCED_FILTERS}
      onApply={onApply}
    />
  );
  return { ...utils, onClose, onApply };
}

/** Open the control's modal by clicking its trigger button. */
function openControlModal() {
  fireEvent.click(
    screen.getByRole("button", { name: /advanced filters/i })
  );
}

/* ------------------------------------------------------------------ */
/*                       AdvancedFiltersModal                          */
/* ------------------------------------------------------------------ */

describe("AdvancedFiltersModal", () => {
  it("does not render dialog content when closed", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/advanced filters/i)).not.toBeInTheDocument();
  });

  it("renders all required form inputs when open", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/advanced filters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date to/i)).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /spv privacy status/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/file type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/creator/i)).toBeInTheDocument();
  });

  it("seeds the form from the filters prop", () => {
    renderModal({
      filters: {
        dateFrom: "2026-01-01",
        dateTo: "2026-02-01",
        privacyStatus: "restricted",
        fileType: "video",
        creator: "GSEEDED",
      },
    });

    expect(screen.getByLabelText(/date from/i)).toHaveValue("2026-01-01");
    expect(screen.getByLabelText(/date to/i)).toHaveValue("2026-02-01");
    expect(screen.getByLabelText(/file type/i)).toHaveValue("video");
    expect(screen.getByLabelText(/creator/i)).toHaveValue("GSEEDED");
    expect(screen.getByRole("button", { name: "Restricted" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("captures form input changes in local state", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date from/i), {
      target: { value: "2026-01-01" },
    });
    expect(screen.getByLabelText(/date from/i)).toHaveValue("2026-01-01");

    fireEvent.click(screen.getByRole("button", { name: "Private" }));
    expect(screen.getByRole("button", { name: "Private" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.change(screen.getByLabelText(/file type/i), {
      target: { value: "pdf" },
    });
    expect(screen.getByLabelText(/file type/i)).toHaveValue("pdf");

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GABCD1234" },
    });
    expect(screen.getByLabelText(/creator/i)).toHaveValue("GABCD1234");
  });

  it("keeps only one privacy status selected at a time", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Private" }));
    fireEvent.click(screen.getByRole("button", { name: "Public" }));

    expect(screen.getByRole("button", { name: "Public" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Private" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("constrains the date range so the end date cannot precede the start", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date from/i), {
      target: { value: "2026-03-10" },
    });

    expect(screen.getByLabelText(/date to/i)).toHaveAttribute(
      "min",
      "2026-03-10"
    );
  });

  it("explains the effect of a non-default privacy status", () => {
    renderModal();

    expect(
      screen.queryByText(/only .* spv entries will be shown/i)
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Private" }));

    expect(
      screen.getByText(/only private spv entries will be shown/i)
    ).toBeInTheDocument();
  });

  it("calls onApply with the full draft and closes on Apply", () => {
    const { onApply, onClose } = renderModal();

    fireEvent.change(screen.getByLabelText(/date from/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Private" }));
    fireEvent.change(screen.getByLabelText(/file type/i), {
      target: { value: "pdf" },
    });
    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GABCD1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      dateFrom: "2026-01-01",
      dateTo: "",
      privacyStatus: "private",
      fileType: "pdf",
      creator: "GABCD1234",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onApply while the user is still editing", () => {
    const { onApply } = renderModal();

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GABCD1234" },
    });

    expect(onApply).not.toHaveBeenCalled();
  });

  it("discards draft changes and calls onClose on Cancel", () => {
    const { onApply, onClose } = renderModal();

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "unsaved" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("resets the draft to defaults when Reset is clicked", () => {
    renderModal({
      filters: { ...DEFAULT_ADVANCED_FILTERS, creator: "GABCD1234" },
    });

    expect(screen.getByLabelText(/creator/i)).toHaveValue("GABCD1234");
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(screen.getByLabelText(/creator/i)).toHaveValue("");
    expect(screen.getByLabelText(/file type/i)).toHaveValue("all");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("only offers Reset while at least one filter is active", () => {
    renderModal();

    expect(
      screen.queryByRole("button", { name: /reset/i })
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GABCD1234" },
    });

    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });

  it("re-seeds the draft from the filters prop on each reopen", () => {
    const applied: AdvancedFilters = {
      ...DEFAULT_ADVANCED_FILTERS,
      creator: "GAPPLIED",
    };
    const { rerender } = renderModal({ filters: applied });

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GDISCARDED" },
    });

    rerender(
      <AdvancedFiltersModal
        open={false}
        onClose={jest.fn()}
        filters={applied}
        onApply={jest.fn()}
      />
    );
    rerender(
      <AdvancedFiltersModal
        open
        onClose={jest.fn()}
        filters={applied}
        onApply={jest.fn()}
      />
    );

    expect(screen.getByLabelText(/creator/i)).toHaveValue("GAPPLIED");
  });
});

/* ------------------------------------------------------------------ */
/*                        Active-filter helper                         */
/* ------------------------------------------------------------------ */

describe("hasActiveAdvancedFilters", () => {
  it("is false for the default filters", () => {
    expect(hasActiveAdvancedFilters(DEFAULT_ADVANCED_FILTERS)).toBe(false);
  });

  it("ignores a creator made up only of whitespace", () => {
    expect(
      hasActiveAdvancedFilters({ ...DEFAULT_ADVANCED_FILTERS, creator: "   " })
    ).toBe(false);
  });

  it.each<Partial<AdvancedFilters>>([
    { dateFrom: "2026-01-01" },
    { dateTo: "2026-01-01" },
    { privacyStatus: "public" },
    { fileType: "pdf" },
    { creator: "GABCD1234" },
  ])("is true when %o is set", (override) => {
    expect(
      hasActiveAdvancedFilters({ ...DEFAULT_ADVANCED_FILTERS, ...override })
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*                    Filters <-> URL search params                    */
/* ------------------------------------------------------------------ */

describe("advanced filters to/from URL search params", () => {
  it("omits default/empty values when serializing", () => {
    const params = advancedFiltersToSearchParams(DEFAULT_ADVANCED_FILTERS);
    expect(params.toString()).toBe("");
  });

  it("serializes only the non-default fields", () => {
    const params = advancedFiltersToSearchParams({
      dateFrom: "2026-01-01",
      dateTo: "2026-02-01",
      privacyStatus: "private",
      fileType: "pdf",
      creator: "GABCD1234",
    });

    expect(params.get("filterFrom")).toBe("2026-01-01");
    expect(params.get("filterTo")).toBe("2026-02-01");
    expect(params.get("privacy")).toBe("private");
    expect(params.get("fileType")).toBe("pdf");
    expect(params.get("creator")).toBe("GABCD1234");
  });

  it("drops the creator param when it is only whitespace", () => {
    const params = advancedFiltersToSearchParams({
      ...DEFAULT_ADVANCED_FILTERS,
      creator: "   ",
    });
    expect(params.has("creator")).toBe(false);
  });

  it("parses filters back out of search params", () => {
    const params = new URLSearchParams(
      "filterFrom=2026-01-01&filterTo=2026-02-01&privacy=private&fileType=pdf&creator=GABCD1234"
    );

    expect(advancedFiltersFromSearchParams(params)).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-02-01",
      privacyStatus: "private",
      fileType: "pdf",
      creator: "GABCD1234",
    });
  });

  it("falls back to defaults for missing values", () => {
    expect(advancedFiltersFromSearchParams(new URLSearchParams())).toEqual(
      DEFAULT_ADVANCED_FILTERS
    );
  });

  it("falls back to defaults for values outside the allowed set", () => {
    const params = new URLSearchParams(
      "privacy=not-a-real-status&fileType=not-a-real-type"
    );
    expect(advancedFiltersFromSearchParams(params)).toEqual(
      DEFAULT_ADVANCED_FILTERS
    );
  });

  it("ignores unrelated query params", () => {
    const params = new URLSearchParams("q=aurora&page=2&privacy=public");
    expect(advancedFiltersFromSearchParams(params)).toEqual({
      ...DEFAULT_ADVANCED_FILTERS,
      privacyStatus: "public",
    });
  });

  it("round-trips through serialize then parse, trimming the creator", () => {
    const original: AdvancedFilters = {
      dateFrom: "2026-03-01",
      dateTo: "",
      privacyStatus: "restricted",
      fileType: "archive",
      creator: "  GXYZ  ",
    };

    expect(
      advancedFiltersFromSearchParams(advancedFiltersToSearchParams(original))
    ).toEqual({ ...original, creator: "GXYZ" });
  });
});

/* ------------------------------------------------------------------ */
/*                      AdvancedFiltersControl                         */
/* ------------------------------------------------------------------ */

describe("AdvancedFiltersControl", () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    currentSearchParams = new URLSearchParams();
    currentPathname = "/vault";
  });

  it("reads initial filter state from the URL search params", () => {
    currentSearchParams = new URLSearchParams(
      "privacy=public&creator=GABCD1234"
    );
    render(<AdvancedFiltersControl />);

    openControlModal();

    expect(screen.getByLabelText(/creator/i)).toHaveValue("GABCD1234");
    expect(screen.getByRole("button", { name: "Public" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("notifies the parent of the filters parsed from the URL on mount", () => {
    currentSearchParams = new URLSearchParams("fileType=image");
    const onFiltersChange = jest.fn();

    render(<AdvancedFiltersControl onFiltersChange={onFiltersChange} />);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...DEFAULT_ADVANCED_FILTERS,
      fileType: "image",
    });
  });

  it("updates the URL via router.replace when filters are applied", () => {
    render(<AdvancedFiltersControl />);

    openControlModal();
    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GNEWCREATOR" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(replace).toHaveBeenCalledWith("/vault?creator=GNEWCREATOR", {
      scroll: false,
    });
  });

  it("replaces rather than pushes, so filtering does not add history entries", () => {
    render(<AdvancedFiltersControl />);

    openControlModal();
    fireEvent.click(screen.getByRole("button", { name: "Private" }));
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps the URL on the current pathname", () => {
    currentPathname = "/search";
    render(<AdvancedFiltersControl />);

    openControlModal();
    fireEvent.change(screen.getByLabelText(/file type/i), {
      target: { value: "pdf" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(replace).toHaveBeenCalledWith("/search?fileType=pdf", {
      scroll: false,
    });
  });

  it("navigates back to the bare pathname when all filters are cleared", () => {
    currentSearchParams = new URLSearchParams("creator=GABCD1234");
    render(<AdvancedFiltersControl />);

    openControlModal();
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(replace).toHaveBeenCalledWith("/vault", { scroll: false });
  });

  it("does not touch the URL when the modal is cancelled", () => {
    render(<AdvancedFiltersControl />);

    openControlModal();
    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GABCD1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(replace).not.toHaveBeenCalled();
  });

  it("re-derives its state when the search params change externally", () => {
    const onFiltersChange = jest.fn();
    const { rerender } = render(
      <AdvancedFiltersControl onFiltersChange={onFiltersChange} />
    );

    // Simulate a browser back/forward that swaps the query string.
    currentSearchParams = new URLSearchParams("creator=GFROMHISTORY");
    rerender(<AdvancedFiltersControl onFiltersChange={onFiltersChange} />);

    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_ADVANCED_FILTERS,
      creator: "GFROMHISTORY",
    });

    openControlModal();
    expect(screen.getByLabelText(/creator/i)).toHaveValue("GFROMHISTORY");
  });

  it("marks the trigger as active only while filters are applied", () => {
    currentSearchParams = new URLSearchParams("privacy=public");
    render(<AdvancedFiltersControl />);

    const trigger = screen.getByRole("button", { name: /advanced filters/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(
      screen.getByRole("button", { name: /advanced filters/i })
    ).toHaveAttribute("aria-expanded", "true");
  });
});
