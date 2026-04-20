"use client";

import { useState, useMemo } from "react";

/* ═══════════════════════════════════════
   HOOK: client-side pagination for arrays
═══════════════════════════════════════ */
export function useClientPagination<T>(items: T[], defaultPerPage: number = 20) {
  const [page, setPage]         = useState(1);
  const [perPage, setPerPage]   = useState(defaultPerPage);

  const total     = items.length;
  const lastPage  = Math.max(1, Math.ceil(total / perPage));
  const safePage  = Math.min(page, lastPage);
  const start     = (safePage - 1) * perPage;
  const end       = Math.min(start + perPage, total);
  const paginated = useMemo(() => items.slice(start, end), [items, start, end]);

  function reset() { setPage(1); }

  return {
    page: safePage, perPage, total, lastPage, start, end,
    paginated,
    setPage, setPerPage,
    reset,
  };
}

/* ═══════════════════════════════════════
   COMPONENT
═══════════════════════════════════════ */
interface Props {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
  onPageChange: (p: number) => void;
  onPerPageChange?: (n: number) => void;
  perPageOptions?: number[];
  disabled?: boolean;
}

export default function Pagination({
  page, perPage, total, lastPage,
  onPageChange, onPerPageChange,
  perPageOptions = [10, 20, 50, 100, 200],
  disabled = false,
}: Props) {
  if (total === 0) return null;

  const start = (page - 1) * perPage + 1;
  const end   = Math.min(page * perPage, total);

  /* Build page number buttons with ellipses */
  const pages: (number | "…")[] = [];
  const push = (p: number | "…") => { if (pages[pages.length - 1] !== p) pages.push(p); };
  for (let p = 1; p <= lastPage; p++) {
    if (p === 1 || p === lastPage || Math.abs(p - page) <= 1) push(p);
    else push("…");
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px", borderTop: "1px solid var(--brd)",
      background: "var(--bg3)", flexWrap: "wrap", gap: 10,
    }}>
      <div style={{ fontSize: 11, color: "var(--tx2)", fontWeight: 600 }}>
        عرض <strong style={{ color: "var(--tx1)", fontFamily: "var(--fm)" }}>{start.toLocaleString("ar-EG")}</strong>
        {" - "}
        <strong style={{ color: "var(--tx1)", fontFamily: "var(--fm)" }}>{end.toLocaleString("ar-EG")}</strong>
        {" من "}
        <strong style={{ color: "var(--tx1)", fontFamily: "var(--fm)" }}>{total.toLocaleString("ar-EG")}</strong>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Btn onClick={() => onPageChange(1)} disabled={disabled || page === 1} title="الأولى">«</Btn>
        <Btn onClick={() => onPageChange(page - 1)} disabled={disabled || page === 1} title="السابقة">‹</Btn>

        {pages.map((p, i) => p === "…" ? (
          <span key={`e${i}`} style={{ padding: "0 6px", color: "var(--tx2)", fontSize: 12 }}>…</span>
        ) : (
          <Btn key={p} onClick={() => onPageChange(p)} disabled={disabled} active={p === page}>
            {p.toLocaleString("ar-EG")}
          </Btn>
        ))}

        <Btn onClick={() => onPageChange(page + 1)} disabled={disabled || page === lastPage} title="التالية">›</Btn>
        <Btn onClick={() => onPageChange(lastPage)} disabled={disabled || page === lastPage} title="الأخيرة">»</Btn>
      </div>

      {onPerPageChange && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--tx2)", fontWeight: 600 }}>لكل صفحة:</label>
          <select
            value={perPage}
            onChange={e => onPerPageChange(parseInt(e.target.value))}
            disabled={disabled}
            style={{ padding: "5px 8px", border: "1px solid var(--brd)", borderRadius: 5, fontSize: 11, background: "var(--bg2)", color: "var(--tx1)", fontFamily: "var(--fm)" }}
          >
            {perPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   NUMBERED BUTTON
═══════════════════════════════════════ */
function Btn({ onClick, disabled, active, children, title }: {
  onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 28, height: 28, padding: "0 8px",
        background: active ? "var(--accent)" : "var(--bg2)",
        color: active ? "#fff" : "var(--tx1)",
        border: "1px solid " + (active ? "var(--accent)" : "var(--brd)"),
        borderRadius: 5, fontSize: 11, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "var(--fm)",
        transition: "background .15s, color .15s",
      }}
    >
      {children}
    </button>
  );
}
