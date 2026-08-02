import type { SearchResult } from "../types";

/**
 * Live certificate search service.
 *
 * Talks to the StellarProof backend REST API (`GET /api/v1/certificates`),
 * which fronts the off-chain index of certificates minted through the
 * provenance Soroban contract. Records in this index only exist after a
 * successful on-chain mint, so every row is backed by verifiable Soroban /
 * Stellar chain data.
 *
 * The backend certificate list endpoint was extended to support a public
 * global index (`creatorId` optional) plus a `search` filter that matches
 * the on-chain certificateId / transactionHash / contractAddress.
 */

/* -------------------------------------------------------------------------- */
/*                         API response wire shapes                           */
/* -------------------------------------------------------------------------- */

interface ApiAsset {
  fileName?: string;
  mimeType?: string;
  storageReferenceId?: string;
}

interface ApiManifest {
  contentHash?: string;
  creator?: string;
  metadata?: {
    description?: string;
    [key: string]: unknown;
  };
}

interface ApiCertificate {
  _id?: string;
  certificateId?: string;
  transactionHash?: string;
  contractAddress?: string;
  stellarNetwork?: string;
  ledgerSequence?: number;
  mintedAt?: string;
  createdAt?: string;
  creatorId?: string;
  assetId?: ApiAsset | string | null;
  manifestId?: ApiManifest | string | null;
}

interface CertificateListPayload {
  certificates?: ApiCertificate[];
  total?: number;
  limit?: number;
  skip?: number;
}

interface ApiEnvelope {
  success?: boolean;
  data?: CertificateListPayload;
  error?: string;
  message?: string;
}

/* -------------------------------------------------------------------------- */
/*                              Configuration                                 */
/* -------------------------------------------------------------------------- */

/**
 * Base URL of the StellarProof backend. Configure with
 * `NEXT_PUBLIC_API_URL` (see frontend/.env.example). Defaults to the local
 * development backend.
 */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const CERTIFICATES_ENDPOINT = `${API_BASE_URL.replace(/\/$/, "")}/api/v1/certificates`;

/** Default page size used for the global index + search requests. */
const DEFAULT_LIMIT = 50;

export interface FetchCertificatesOptions {
  /** AbortSignal so stale/unmounted requests can be cancelled. */
  signal?: AbortSignal;
  /** Maximum number of records (backend caps at 100). */
  limit?: number;
  /** Offset for pagination. */
  skip?: number;
}

/* -------------------------------------------------------------------------- */
/*                           Mapping to SearchResult                          */
/* -------------------------------------------------------------------------- */

/** Bucket a MIME type into the coarse category the UI displays. */
function bucketType(mimeType?: string): string | undefined {
  if (!mimeType) return undefined;
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime.startsWith("model/")) return "3D Model";
  if (mime.startsWith("text/") || mime === "application/pdf") return "Document";
  return "Other";
}

function isPopulatedAsset(asset: ApiCertificate["assetId"]): asset is ApiAsset {
  return typeof asset === "object" && asset !== null;
}

function isPopulatedManifest(
  manifest: ApiCertificate["manifestId"],
): manifest is ApiManifest {
  return typeof manifest === "object" && manifest !== null;
}

/** Normalise an ISO-ish timestamp to an ISO string. */
function toIso(value?: string): string {
  if (!value) return new Date(0).toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

/**
 * Maps a backend certificate document (the off-chain mirror of the on-chain
 * provenance certificate) onto the flat `SearchResult` consumed by the
 * search List/Grid views.
 */
export function mapCertificateToSearchResult(
  cert: ApiCertificate,
): SearchResult {
  const asset = isPopulatedAsset(cert.assetId) ? cert.assetId : undefined;
  const manifest = isPopulatedManifest(cert.manifestId)
    ? cert.manifestId
    : undefined;

  return {
    id: cert.certificateId ?? cert._id ?? "unknown",
    name: asset?.fileName?.trim() || undefined,
    description: manifest?.metadata?.description ?? undefined,
    // Prefer the content hash (what users search by); fall back to the mint tx.
    hash: manifest?.contentHash ?? cert.transactionHash ?? "",
    // The Stellar public key recorded in the manifest; fall back to the
    // owning user id when the manifest was not populated.
    creator: manifest?.creator ?? cert.creatorId ?? "",
    mintedAt: toIso(cert.mintedAt ?? cert.createdAt),
    // A document only exists in this index after a successful on-chain mint.
    status: "verified",
    network: cert.stellarNetwork
      ? `Stellar ${cert.stellarNetwork.charAt(0).toUpperCase()}${cert.stellarNetwork.slice(1)}`
      : "Stellar",
    type: bucketType(asset?.mimeType),
  };
}

/* -------------------------------------------------------------------------- */
/*                              Fetch plumbing                                */
/* -------------------------------------------------------------------------- */

/** Build the (empty-terminated) query string for the list endpoint. */
function buildUrl(params: { search?: string; limit: number; skip: number }): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  qs.set("limit", String(params.limit));
  qs.set("skip", String(params.skip));
  return `${CERTIFICATES_ENDPOINT}?${qs.toString()}`;
}

/**
 * Low-level helper that performs the GET against the certificate list
 * endpoint, unwraps the standard backend envelope (`{ success, data }`) and
 * normalises errors to plain `Error` instances with user-facing messages.
 */
async function fetchCertificates(
  options: FetchCertificatesOptions & { search?: string },
): Promise<SearchResult[]> {
  const { search, limit = DEFAULT_LIMIT, skip = 0, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl({ search, limit, skip }), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Propagate cancellations untouched so callers can ignore them.
      throw err;
    }
    throw new Error(
      "Unable to reach the StellarProof API. Check your connection and try again.",
    );
  }

  let body: ApiEnvelope | undefined;
  try {
    body = (await response.json()) as ApiEnvelope;
  } catch {
    // Non-JSON body (proxy error page, HTML gateway response, …).
    body = undefined;
  }

  if (!response.ok) {
    throw new Error(
      body?.error ??
        body?.message ??
        `Certificate search failed with status ${response.status}.`,
    );
  }

  if (!body || body.success === false) {
    throw new Error(
      body?.error ?? body?.message ?? "Certificate search failed. Please try again.",
    );
  }

  const raw = body.data?.certificates;
  if (!Array.isArray(raw)) {
    // Defensive: the endpoint contract changed underneath us.
    throw new Error("Unexpected response shape from the certificates API.");
  }

  return raw.map(mapCertificateToSearchResult);
}

/* -------------------------------------------------------------------------- */
/*                                Public API                                  */
/* -------------------------------------------------------------------------- */

/**
 * Loads the first page of the public global certificate index — every
 * certificate minted through the provenance Soroban contract, newest first.
 * Used to seed the search page before the user types a query.
 */
export async function fetchAllCertificates(
  options: FetchCertificatesOptions = {},
): Promise<SearchResult[]> {
  return fetchCertificates(options);
}

/**
 * Searches the global certificate index by id, transaction hash, contract
 * address, asset name or creator. An empty/blank query returns the full
 * index page (same payload as {@link fetchAllCertificates}).
 */
export async function searchCertificates(
  query: string,
  options: FetchCertificatesOptions = {},
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  return fetchCertificates({ ...options, search: trimmed || undefined });
}
