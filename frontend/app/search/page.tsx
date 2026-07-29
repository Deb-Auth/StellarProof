"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  searchCertificates,
  type CertificateSearchField,
  type ProvenanceCertificate,
} from "@/services/certificate";

type SearchState = "idle" | "loading" | "success" | "error" | "empty";

const FIELD_OPTIONS: { value: CertificateSearchField; label: string }[] = [
  { value: "id", label: "Certificate ID" },
  { value: "contentHash", label: "Content Hash" },
];

function shorten(hash: string): string {
  return hash.length > 18 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<CertificateSearchField>("id");
  const [status, setStatus] = useState<SearchState>("idle");
  const [results, setResults] = useState<ProvenanceCertificate[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFieldToggle = (next: CertificateSearchField) => {
    setField(next);
  };

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setStatus("idle");
      setResults([]);
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const { results: found, error } = await searchCertificates(trimmed, field);
      if (error) {
        setResults([]);
        setErrorMessage(error);
        setStatus("empty");
        return;
      }
      setResults(found);
      setStatus("success");
    } catch {
      setResults([]);
      setErrorMessage("Something went wrong while searching. Please try again.");
      setStatus("error");
    }
  };

  const handleClear = () => {
    setQuery("");
    setStatus("idle");
    setResults([]);
    setErrorMessage("");
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Global Certificate Search
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Look up any provenance certificate minted on StellarProof by its ID or
        content hash.
      </p>

      <form
        onSubmit={runSearch}
        role="search"
        aria-label="Certificate search"
        className="space-y-4"
      >
        <div className="relative">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              field === "id"
                ? "Search by certificate ID…"
                : "Search by content hash…"
            }
            aria-label="Search certificates"
            className={cn(
              "w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border",
              "bg-white dark:bg-darkblue-dark",
              "text-gray-800 dark:text-gray-100",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "border-gray-300 dark:border-gray-600",
              "focus:outline-none focus:ring-2 focus:ring-primary/60",
              "transition-colors"
            )}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div
          className="flex gap-2"
          role="group"
          aria-label="Search field toggle"
        >
          {FIELD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFieldToggle(opt.value)}
              aria-pressed={field === opt.value}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                field === opt.value
                  ? "bg-primary/10 text-primary border-primary/40 ring-2 ring-primary ring-offset-1 ring-offset-white dark:ring-offset-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 opacity-70 hover:opacity-100"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={status === "loading" || !query.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Search
        </button>
      </form>

      <div className="mt-8">
        {status === "loading" && (
          <div aria-live="polite" aria-busy="true">
            <TableSkeleton rows={3} />
          </div>
        )}

        {(status === "error" || status === "empty") && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}

        {status === "success" && (
          <ul aria-label="Search results" className="space-y-3">
            {results.map((cert) => (
              <li
                key={cert.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4"
              >
                <Link
                  href={`/certificate/${cert.id}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {cert.id}
                </Link>
                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    <dt className="inline font-medium">Owner: </dt>
                    <dd className="inline">{shorten(cert.ownerAddress)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Content Hash: </dt>
                    <dd className="inline">{shorten(cert.contentHash)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Minted: </dt>
                    <dd className="inline">
                      {new Date(cert.mintedAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
