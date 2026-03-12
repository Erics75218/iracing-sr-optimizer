"use client";

import { useEffect } from "react";
import Link from "next/link";

function isChunkLoadError(error: Error): boolean {
  const msg = error.message ?? "";
  return (
    /Loading chunk .* failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    (msg.includes("chunk") && msg.includes("failed"))
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const chunkError = isChunkLoadError(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-muted/30">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {chunkError
          ? "A script failed to load (often after an update). Refreshing the page usually fixes it."
          : error.message}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {chunkError ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Refresh page
          </button>
        ) : (
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Try again
          </button>
        )}
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
