"use client";

import { useMemo, useState } from "react";

/**
 * Table view for a user's digital products (assets) with sortable columns and
 * pagination.
 *
 * Clicking a sortable header cycles its sort direction; sorting is stable and
 * status is ordered by verification lifecycle rather than alphabetically.
 * Pagination splits the sorted rows into fixed-size pages, and the current page
 * is clamped so it always stays within range as the data or sort changes.
 */

type AssetStatus = "verified" | "pending" | "revoked";

interface Asset {
  id: string;
  title: string;
  type: string;
  status: AssetStatus;
  createdAt: string;
}

type SortableKey = "title" | "type" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

interface SortState {
  key: SortableKey;
  direction: SortDirection;
}

interface Column {
  key: SortableKey;
  label: string;
  sortable: boolean;
}

const COLUMNS: Column[] = [
  { key: "title", label: "Name", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "createdAt", label: "Date", sortable: true },
];

const PAGE_SIZE = 10;

/** Lifecycle order used when sorting the status column. */
const STATUS_ORDER: Record<AssetStatus, number> = {
  verified: 0,
  pending: 1,
  revoked: 2,
};

const STATUS_BADGE: Record<AssetStatus, string> = {
  verified:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  revoked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUSES: AssetStatus[] = ["verified", "pending", "revoked"];
const TYPES = ["image", "video", "audio", "document", "model"];

const MOCK_ASSETS: Asset[] = Array.from({ length: 47 }, (_, i) => ({
  id: `asset-${String(i + 1).padStart(3, "0")}`,
  title: `Digital Asset ${String(i + 1).padStart(2, "0")}`,
  type: TYPES[i % TYPES.length],
  status: STATUSES[i % STATUSES.length],
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * i).toISOString(),
}));

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Compare two assets by the given key. Returns a stable ascending ordering. */
function compareAssets(a: Asset, b: Asset, key: SortableKey): number {
  switch (key) {
    case "status":
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case "createdAt":
      return (
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    default:
      return a[key].localeCompare(b[key]);
  }
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none" aria-hidden="true">
      <svg
        className={`h-2 w-2 ${
          direction === "asc"
            ? "text-primary"
            : "text-gray-300 dark:text-gray-600"
        }`}
        viewBox="0 0 8 5"
        fill="currentColor"
      >
        <path d="M4 0l4 5H0z" />
      </svg>
      <svg
        className={`h-2 w-2 ${
          direction === "desc"
            ? "text-primary"
            : "text-gray-300 dark:text-gray-600"
        }`}
        viewBox="0 0 8 5"
        fill="currentColor"
      >
        <path d="M4 5L0 0h8z" />
      </svg>
    </span>
  );
}

interface AssetTableProps {
  /** Optional preloaded assets. Defaults to mock data. */
  assets?: Asset[];
}

export default function AssetTable({ assets = MOCK_ASSETS }: AssetTableProps) {
  const [sort, setSort] = useState<SortState>({
    key: "createdAt",
    direction: "desc",
  });
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...assets];
    copy.sort((a, b) => {
      const result = compareAssets(a, b, sort.key);
      return sort.direction === "asc" ? result : -result;
    });
    return copy;
  }, [assets, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Clamp the page so it stays valid when the data shrinks or sort changes.
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  );

  const handleSort = (key: SortableKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
    setPage(1);
  };

  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sorted.length);

  return (
    <section aria-label="Digital assets table">
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                {COLUMNS.map((column) => {
                  const isActive = sort.key === column.key;
                  const direction = isActive ? sort.direction : null;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        isActive
                          ? direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="inline-flex items-center rounded transition-colors hover:text-gray-900 dark:hover:text-white"
                        >
                          {column.label}
                          <SortIcon direction={direction} />
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-darkblue">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No assets to display.
                  </td>
                </tr>
              ) : (
                paginated.map((asset) => (
                  <tr
                    key={asset.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {asset.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-700 dark:text-gray-300">
                      {asset.type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[asset.status]}`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(asset.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {sorted.length === 0
            ? "No results"
            : `Showing ${rangeStart}-${rangeEnd} of ${sorted.length}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
          >
            Previous
          </button>
          <span className="px-2 text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
