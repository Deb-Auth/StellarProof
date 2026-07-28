'use client';

/**
 * Search page — wraps the component that reads useSearchParams in a Suspense
 * boundary so Next.js can statically render the shell without de-opting the
 * entire route during production builds.
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering
 * Closes #386
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import Header from '../../components/Header';
import { Skeleton } from '../../components/ui/Skeleton';

/* ------------------------------------------------------------------ */
/*                        Skeleton fallback                            */
/* ------------------------------------------------------------------ */

function SearchPageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                   Inner component — reads searchParams              */
/* ------------------------------------------------------------------ */

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
        Search
      </h1>

      {/* Search input */}
      <div className="relative mb-8">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
          aria-hidden
        />
        <input
          type="search"
          defaultValue={query}
          aria-label="Search"
          placeholder="Search certificates, manifests…"
          className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 py-3 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
      </div>

      {/* Results placeholder */}
      {query ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing results for <span className="font-medium text-gray-900 dark:text-white">&ldquo;{query}&rdquo;</span>
        </p>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter a query above to search.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                   Page export — Suspense boundary here              */
/* ------------------------------------------------------------------ */

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]">
      <Header />
      <main id="main-content">
        {/*
         * useSearchParams() must be inside a Suspense boundary so Next.js
         * can statically render the outer shell and avoid the de-opt warning:
         * "useSearchParams() should be wrapped in a suspense boundary"
         */}
        <Suspense fallback={<SearchPageSkeleton />}>
          <SearchResults />
        </Suspense>
      </main>
    </div>
  );
}
