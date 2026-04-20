"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { attendanceApi } from "@/lib/attendance-api";
import Pagination, { useClientPagination } from "@/components/attendance/Pagination";

export default function TeacherNoCheckoutPage() {
  const { lang } = useUi();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r: any = await attendanceApi.teachers.noCheckout(date ? { date } : {});
      setRows(Array.isArray(r) ? r : (r?.data ?? []));
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      (r.employee?.name ?? "").toLowerCase().includes(s) ||
      (r.employee?.identifier ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  const pg = useClientPagination(filtered, 50);

  return (
    <DashboardLayout
      title={lang === "ar" ? "المعلمون بدون تسجيل خروج" : "Teachers Without Checkout"}
      subtitle={lang === "ar" ? "قائمة المعلمين الذين لم يسجلوا خروجاً" : "Teachers who did not sign out"}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <Stat label="إجمالي السجلات" value={rows.length} c="#DC2626" bg="#FEF2F2" ico="🚪" />
      </div>

      {/* FILTERS */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="ابحث بالاسم أو الهوية…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
        />
        <button onClick={load} disabled={loading} style={btnPrimary}>
          {loading ? "جاري…" : "🔍 تصفية"}
        </button>
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>✅</div>
            {rows.length ? "لا نتائج" : "جميع المعلمين سجلوا خروجاً"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                  {["#","المعلم","الهوية","التاريخ","وقت الدخول","الجهاز"].map((h, i) => (
                    <th key={i} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map((r, i) => (
                  <tr key={r.id ?? i} style={{ borderBottom: "1px solid var(--brd)" }}>
                    <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.employee?.name ?? "—"}</td>
                    <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right", color: "var(--tx2)" }}>
                      {r.employee?.identifier ?? "—"}
                    </td>
                    <td style={{ ...td, fontFamily: "var(--fm)" }}>{r.punch_date ?? "—"}</td>
                    <td style={{ ...td, fontFamily: "var(--fm)", color: "#059669", fontWeight: 600 }}>{r.punch_time ?? "—"}</td>
                    <td style={{ ...td, fontSize: 11, color: "var(--tx2)" }}>{r.terminal?.name ?? r.user_terminal?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
              onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
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
const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
