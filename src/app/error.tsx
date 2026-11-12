"use client";
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="wrap" style={{ padding: 50 }}>
      <h1>This operation could not be completed.</h1>
      <p>
        Your access may have changed, the draft may conflict with a newer
        revision, or a required service may be unavailable. Export an open local
        draft before reloading.
      </p>
      {error.digest ? <p>Support reference: {error.digest}</p> : null}
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
