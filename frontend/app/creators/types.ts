/**
 * Domain types for the Creator Directory.
 *
 * A `Creator` is the aggregate view of one wallet that has minted at least
 * one certificate through the provenance Soroban contract: who they are,
 * how many verified assets they own and when they were last active.
 */

export interface Creator {
  /** Stellar public key (or backend user id) identifying the creator. */
  address: string;

  /** Human-readable display name, when the index knows one. */
  name?: string;

  /** Number of verified assets attributed to this creator. */
  assetCount: number;

  /** ISO 8601 timestamp of this creator's most recent mint. */
  latestMintedAt: string;

  /** Coarse asset categories this creator has minted, e.g. "Image". */
  categories: string[];
}

/** One page of the creator directory. */
export interface CreatorPage {
  creators: Creator[];
  /** True when another page can be requested for the same query. */
  hasMore: boolean;
}
