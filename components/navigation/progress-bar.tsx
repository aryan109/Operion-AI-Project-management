"use client";

import { useEffect, useState, useTransition, Suspense, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function SearchParamsListener({ onComplete }: { onComplete: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onComplete();
  }, [searchParams, onComplete]);
  return null;
}

export function ProgressBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const handleComplete = useCallback(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      try {
        const url = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);

        if (
          url.origin === currentUrl.origin &&
          (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search)
        ) {
          startTransition(() => {
            setLoading(true);
          });
        }
      } catch {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsListener onComplete={handleComplete} />
      </Suspense>
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 pointer-events-none overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 animate-pulse transition-all duration-300 shadow-[0_0_12px_rgba(99,102,241,0.8)] progress-bar-animation" />
        </div>
      )}
    </>
  );
}
