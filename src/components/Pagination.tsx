/**
 * Pagination
 *
 * A self-contained, reusable pagination bar. Derives totalPages, hasPrev,
 * and hasNext from page / totalCount / pageSize so callers don't have to
 * store that derived state themselves.
 *
 * Props
 * ─────
 * page             number   Current 1-based page number
 * totalCount       number   Total record count returned by the backend
 * pageSize         number   Records per page
 * loading?         bool     Disables all buttons while true
 * onPageChange     fn(n)    Called with the new page number
 * onPageSizeChange fn(n)    Optional — renders a page-size selector when provided
 * pageSizeOptions? number[] Defaults to [10, 20, 50, 100]
 * className?       string   Extra class on the root .fs-pagination div
 * style?           object   Extra inline style on the root div
 */
export default function Pagination({
  page,
  totalCount,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
  style,
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrev    = page > 1;
  const hasNext    = page < totalPages;

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd   = Math.min(page * pageSize, totalCount);

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className={`fs-pagination ${className}`.trim()} style={style}>

      {/* ── Record range ── */}
      <span className="fs-page-info">
        {totalCount === 0
          ? "Showing 0 of 0"
          : `Showing ${rangeStart}–${rangeEnd} of ${totalCount.toLocaleString()}`}
      </span>

      {/* ── Current page indicator ── */}
      <span
        className="fs-page-indicator"
        aria-live="polite"
        aria-label={`Page ${page} of ${totalPages}`}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            4,
          fontFamily:     "var(--fs-font-mono)",
          fontSize:       11,
          fontWeight:     600,
          color:          "var(--fs-text-dim)",
          background:     "var(--fs-surface-2, rgba(148,163,184,0.07))",
          border:         "1px solid var(--fs-border, rgba(148,163,184,0.15))",
          borderRadius:   6,
          padding:        "3px 10px",
          letterSpacing:  "0.3px",
          userSelect:     "none",
          whiteSpace:     "nowrap",
        }}
      >
        <span style={{ color: "var(--fs-accent, #7c6af7)", fontWeight: 700 }}>
          {page}
        </span>
        <span style={{ opacity: 0.45 }}>/</span>
        <span>{totalPages}</span>
      </span>

      {/* ── Page buttons ── */}
      <div className="fs-page-btns">

        <button
          className="fs-page-btn"
          title="First page"
          onClick={() => onPageChange(1)}
          disabled={!hasPrev || loading}
        >
          «
        </button>

        <button
          className="fs-page-btn"
          title="Previous page"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev || loading}
        >
          ‹ Prev
        </button>

        {pageNumbers.map((n, i) =>
          n === "..." ? (
            <span key={`ellipsis-${i}`} className="fs-page-ellipsis">…</span>
          ) : (
            <button
              key={n}
              className={`fs-page-btn${n === page ? " fs-page-btn--active" : ""}`}
              onClick={() => onPageChange(n)}
              disabled={loading}
              aria-current={n === page ? "page" : undefined}
              style={n === page ? {
                /* Stronger active signal beyond whatever the CSS class provides */
                fontWeight:    700,
                boxShadow:     "0 0 0 2px var(--fs-accent, #7c6af7)",
                position:      "relative",
                zIndex:        1,
              } : undefined}
            >
              {n}
            </button>
          )
        )}

        <button
          className="fs-page-btn"
          title="Next page"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext || loading}
        >
          Next ›
        </button>

        <button
          className="fs-page-btn"
          title="Last page"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext || loading}
        >
          »
        </button>

      </div>

      {/* ── Page-size selector (optional) ── */}
      {onPageSizeChange && (
        <select
          className="fs-select"
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          disabled={loading}
        >
          {pageSizeOptions.map(n => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      )}

    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns an array of page numbers (and "..." sentinels) for the pagination bar.
 * Always shows first + last page; inserts ellipsis where there are gaps.
 */
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)         return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}
