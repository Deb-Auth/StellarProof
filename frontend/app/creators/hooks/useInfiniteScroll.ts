"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseInfiniteScrollOptions {
  /** Called once each time the sentinel scrolls into view. */
  onLoadMore: () => void;
  /**
   * Whether the sentinel should be observed at all. Set to false while a
   * page is in flight, once the last page has loaded, or on error, so the
   * observer cannot fire redundant loads.
   */
  enabled: boolean;
  /**
   * Distance from the viewport at which loading starts, so the next page is
   * usually in place by the time the user reaches the end of the list.
   */
  rootMargin?: string;
}

/**
 * Observes a sentinel element and invokes `onLoadMore` whenever it enters
 * the viewport.
 *
 * The returned value is a ref *callback*: it re-attaches the observer when
 * the sentinel is mounted, unmounted or replaced, which matters because the
 * sentinel is only rendered while there are more pages to load.
 *
 * Environments without `IntersectionObserver` (older browsers, SSR) simply
 * never trigger a load; callers should keep a manual "Load more" control
 * available as a fallback.
 */
export function useInfiniteScroll({
  onLoadMore,
  enabled,
  rootMargin = "200px",
}: UseInfiniteScrollOptions) {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  // Keep the latest callback in a ref so changing it does not tear down and
  // rebuild the observer on every render.
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!sentinel || !enabled) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, enabled, rootMargin]);

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    setSentinel(node);
  }, []);

  return { sentinelRef };
}

export default useInfiniteScroll;
