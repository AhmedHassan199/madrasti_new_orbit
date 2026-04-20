"use client";

import { useState, useEffect, useMemo } from "react";
import Pagination, { useClientPagination } from "./Pagination";

interface Props {
  fetcher: (params: Record<string, any>) => Promise<any>;
}

export default function EarlyLeavesView({ fetcher }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (fromDate) params.from = fromDate;
      if (toDate)   params.to   = toDate;
      const r: any = await fetcher(params);
      setRows(Array.isArray(r) ? r : (r?.data ?? []));
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      (r.employee?.name ?? r.name ?? "").toLowerCase().includes(s) ||
      (r.employee?.identifier ?? "").toLowerCase().includes(s) ||
      (r.note ?? r.reason ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  const pg = useClientPagination(filtered, 20);

  const stats = useMemo(() => ({
    total: rows.length,
    today: rows.filter(r => r.punch_date === new Date().toISOString().slice(0, 10)).length,
    thisWeek: (() => {
      const now = Date.now();
      const weekAgo = now - 7 * 86400000;
      return rows.filter(r => {
        const d = new Date(r.punch_date ?? 0).getTime();
        return d >= weekAgo && d <= now;
      }).length;
    })(),
  }), [rows]);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <Stat label="إجمالي الاستئذانات" value={stats.total} c="#0891B2" bg="#ECFEFF" ico="📝" />
        <Stat label="اليوم" value={stats.today} c="#059669" bg="#ECFDF5" ico="📅" />
        <Stat label="هذا الأسبوع" value={stats.thisWeek} c="#D97706" bg="#FFFBEB" ico="📊" />
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="ابحث بالاسم، الهوية، أو الملاحظة…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
        />
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={dateStyle} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={dateStyle} />
        <button onClick={load} disabled={loading} style={btnPrimary}>
          {loading ? "جاري…" : "🔍 تصفية"}
        </button>
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>📝</div>
            {rows.length ? "لا نتائج" : "لا توجد استئذانات"}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                    {["#","الاسم","الهوية","التاريخ","وقت الاستئذان","ملاحظة"].map((h, i) => (
                      <th key={i} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pg.paginated.map((r, i) => (
                    <tr key={r.id ?? i} style={{ borderBottom: "1px solid var(--brd)" }}>
                      <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.employee?.name ?? r.name ?? "—"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right", color: "var(--tx2)" }}>
                        {r.employee?.identifier ?? "—"}
                      </td>
                      <td style={{ ...td, fontFamily: "var(--fm)" }}>{r.punch_date ?? "—"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", color: "#D97706", fontWeight: 600 }}>{r.punch_time ?? "—"}</td>
                      <td style={{ ...td, color: "var(--tx2)" }}>{r.note ?? r.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
              onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
            />
          </>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, c, bg, ico }: { label: string; value: number; c: string; bg: string; ico: string }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{ico}</div>
      <div>
        <div style={{ fontSize: 10, color: "var(--tx2)" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "var(--fm)" }}>{value.toLocaleString("ar-EG")}</div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "8px 14px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const dateStyle: React.CSSProperties = { padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" };
const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
