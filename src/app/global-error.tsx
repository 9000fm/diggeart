"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "monospace", gap: "1rem" }}>
          <p style={{ fontSize: "14px", color: "#666" }}>Something went wrong</p>
          <button onClick={reset} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer", fontFamily: "monospace", fontSize: "12px" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
