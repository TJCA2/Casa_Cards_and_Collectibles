"use client";

// global-error.tsx catches errors thrown inside the root layout itself.
// It must include its own <html>/<body> shell — the root layout may be broken.

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111", marginBottom: "0.5rem" }}>
          Something Went Wrong
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            maxWidth: "24rem",
            marginBottom: "2rem",
          }}
        >
          A critical error occurred. Try again or return to the shop.
        </p>
        <div
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}
        >
          <button
            onClick={reset}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <a
            href="/shop"
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#374151",
              textDecoration: "none",
            }}
          >
            Return to Shop
          </a>
        </div>
      </body>
    </html>
  );
}
