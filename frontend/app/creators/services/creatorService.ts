import {
  fetchAllCertificates,
  searchCertificates,
} from "@/app/search/services/searchService";
import type { SearchResult } from "@/app/search/types";
import type { Creator, CreatorPage } from "../types";

/**
 * Creator directory service.
 *
 * The backend has no dedicated creators endpoint yet, so the directory is
 * derived from the public global certificate index that already powers the
 * search page: certificates are requested one page at a time and grouped by
 * the creator recorded in their manifest.
 *
 * Because the grouping happens per page, a creator can legitimately appear
 * again in a later page. {@link mergeCreators} folds those repeats into the
 * already-loaded entry, so callers that append pages (infinite scroll) end
 * up with one row per creator regardless of how the certificates were
 * distributed across pages.
 */

/** Certificates requested per directory page. */
export const CREATORS_PAGE_SIZE = 12;

export interface FetchCreatorsOptions {
  /** Zero-based page index. */
  page?: number;
  /** Certificates requested per page. */
  pageSize?: number;
  /** Optional free-text query matched by the certificate index. */
  search?: string;
  /** AbortSignal so stale/unmounted requests can be cancelled. */
  signal?: AbortSignal;
}

/* -------------------------------------------------------------------------- */
/*                                Aggregation                                 */
/* -------------------------------------------------------------------------- */

/** Newest of two ISO timestamps, tolerating unparseable input. */
function laterOf(a: string, b: string): string {
  const timeA = new Date(a).getTime();
  const timeB = new Date(b).getTime();
  if (Number.isNaN(timeA)) return b;
  if (Number.isNaN(timeB)) return a;
  return timeA >= timeB ? a : b;
}

function addCategory(categories: string[], category?: string): string[] {
  if (!category || categories.includes(category)) return categories;
  return [...categories, category];
}

/**
 * Groups certificates by their creator address, newest activity first.
 * Certificates without a creator are skipped: they cannot be attributed.
 */
export function groupCertificatesByCreator(
  certificates: SearchResult[]
): Creator[] {
  const byAddress = new Map<string, Creator>();

  for (const certificate of certificates) {
    const address = certificate.creator?.trim();
    if (!address) continue;

    const existing = byAddress.get(address);
    if (existing) {
      existing.assetCount += 1;
      existing.latestMintedAt = laterOf(
        existing.latestMintedAt,
        certificate.mintedAt
      );
      existing.categories = addCategory(existing.categories, certificate.type);
      continue;
    }

    byAddress.set(address, {
      address,
      assetCount: 1,
      latestMintedAt: certificate.mintedAt,
      categories: addCategory([], certificate.type),
    });
  }

  return Array.from(byAddress.values()).sort(
    (a, b) =>
      new Date(b.latestMintedAt).getTime() -
      new Date(a.latestMintedAt).getTime()
  );
}

/**
 * Appends a freshly loaded page onto the creators already on screen,
 * folding repeats into the existing entry instead of duplicating a card.
 * The order of the already-loaded creators is preserved so the list never
 * reshuffles under the user while they scroll.
 */
export function mergeCreators(
  existing: Creator[],
  incoming: Creator[]
): Creator[] {
  const merged = existing.map((creator) => ({ ...creator }));
  const indexByAddress = new Map(
    merged.map((creator, index) => [creator.address, index])
  );

  for (const creator of incoming) {
    const index = indexByAddress.get(creator.address);
    if (index === undefined) {
      indexByAddress.set(creator.address, merged.length);
      merged.push({ ...creator });
      continue;
    }

    const target = merged[index];
    target.assetCount += creator.assetCount;
    target.latestMintedAt = laterOf(
      target.latestMintedAt,
      creator.latestMintedAt
    );
    target.categories = creator.categories.reduce(addCategory, [
      ...target.categories,
    ]);
  }

  return merged;
}

/* -------------------------------------------------------------------------- */
/*                                Public API                                  */
/* -------------------------------------------------------------------------- */

/**
 * Loads one page of the creator directory. `hasMore` is true when the
 * certificate index returned a full page, meaning another request can be
 * made for the next offset.
 */
export async function fetchCreators({
  page = 0,
  pageSize = CREATORS_PAGE_SIZE,
  search,
  signal,
}: FetchCreatorsOptions = {}): Promise<CreatorPage> {
  const query = search?.trim();
  const options = { limit: pageSize, skip: page * pageSize, signal };

  const certificates = query
    ? await searchCertificates(query, options)
    : await fetchAllCertificates(options);

  return {
    creators: groupCertificatesByCreator(certificates),
    hasMore: certificates.length === pageSize,
  };
}
