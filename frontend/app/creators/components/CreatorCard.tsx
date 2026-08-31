"use client";

import React from "react";
import Link from "next/link";
import { FileCheck2, Clock } from "lucide-react";
import { formatDate, truncateAddress } from "@/app/search/components/shared";
import type { Creator } from "../types";

export interface CreatorCardProps {
  creator: Creator;
}

/** Two-letter monogram derived from the display name or the address. */
function initials(creator: Creator): string {
  const source = creator.name?.trim() || creator.address;
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * Directory card for a single creator: identity, how many verified assets
 * they own, their most recent mint and the categories they work in.
 */
export default function CreatorCard({ creator }: CreatorCardProps) {
  const displayName = creator.name?.trim() || truncateAddress(creator.address);
  const assetLabel = creator.assetCount === 1 ? "asset" : "assets";

  return (
    <li className="h-full">
      <Link
        href={`/search?creator=${encodeURIComponent(creator.address)}`}
        aria-label={`View verified assets by ${displayName}`}
        className="flex h-full flex-col gap-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue p-5 shadow-sm transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          >
            {initials(creator)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {displayName}
            </h3>
            <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
              {truncateAddress(creator.address)}
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1.5">
            <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <dt className="sr-only">Verified assets</dt>
            <dd>
              {creator.assetCount} verified {assetLabel}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <dt className="sr-only">Last mint</dt>
            <dd>{formatDate(creator.latestMintedAt)}</dd>
          </div>
        </dl>

        {creator.categories.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {creator.categories.map((category) => (
              <li
                key={category}
                className="rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300"
              >
                {category}
              </li>
            ))}
          </ul>
        )}
      </Link>
    </li>
  );
}
