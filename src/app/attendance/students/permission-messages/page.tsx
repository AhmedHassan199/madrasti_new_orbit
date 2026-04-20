"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { attendanceApi } from "@/lib/attendance-api";
import Pagination, { useClientPagination } from "@/components/attendance/Pagination";

export default function StudentPermissionMessagesPage() {
  const { lang } = useUi();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r: any = await attendanceApi.students.permissionMessages({});
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
      (r.employee?.identifier ?? "").toLowerCase().includes(s) ||
      (r.body ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  const pg = useClientPagination(filtered, 20);

  return (
    <DashboardLayout
      title={lang === "ar" ? "رسائل الاستئذان — الطلاب" : "Permission Messages — Students"}
      subtitle={lang === "ar" ? "الرسائل المرسلة للاستئذان والإذن بالخروج المبكر" : "Sent leave-request messages"}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📝</div>
          <div>
            <div style={{ fontSize: 10, color: "var(--tx2)" }}>رسائل الاستئذان</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#D97706", fontFamily: "var(--fm)" }}>{rows.length.toLocaleString("ar-EG")}</div>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <input
          type="text" placeholder="بحث…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
        />
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>لا توجد رسائل</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                {["#","الطالب","الهوية","النص","التاريخ"].map((h, i) => (
                  <th key={i} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.paginated.map((m, i) => (
                <tr key={m.id ?? i} style={{ borderBottom: "1px solid var(--brd)" }}>
                  <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{m.employee?.name ?? "—"}</td>
                  <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{m.employee?.identifier ?? "—"}</td>
                  <td style={{ ...td, maxWidth: 360 }}>
                    <div style={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {m.body ?? m.message_body ?? "—"}
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: "var(--fm)", fontSize: 11, color: "var(--tx2)", whiteSpace: "nowrap" }}>
                    {m.created_at ? m.created_at.slice(0, 16).replace("T", " ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
          onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
        />
      </div>
    </DashboardLayout>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12, verticalAlign: "top" };
