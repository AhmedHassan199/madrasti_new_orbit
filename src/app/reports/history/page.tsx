"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { reportsApi } from "@/lib/modules-api";

const STATUS_COLORS: Record<string, string> = { completed: "#22C55E", failed: "#EF4444", processing: "#F59E0B", pending: "#6366F1" };
const STATUS_AR: Record<string, string>     = { completed: "مكتمل", failed: "فشل", processing: "جاري", pending: "معلق" };

export default function ReportsHistoryPage() {
  const { lang }              = useUi();
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = (p = 1) => {
    setLoading(true);
    reportsApi.history({ page: p, per_page: 20 })
      .then((r: any) => { setData(r.data ?? r); setHasMore(r.meta?.has_more ?? false); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
  const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)", verticalAlign: "middle" };

  return (
    <DashboardLayout title={lang === "ar" ? "سجل التقارير" : "Report History"}>
      <PageCard title={lang === "ar" ? "التقارير المُنشأة" : "Generated Reports"}>
        {loading ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
        ) : !data.length ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد تقارير" : "No reports"}</p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>{lang === "ar" ? "اسم التقرير" : "Report Name"}</th>
                    <th style={th}>{lang === "ar" ? "النوع" : "Type"}</th>
                    <th style={th}>{lang === "ar" ? "الحالة" : "Status"}</th>
                    <th style={th}>{lang === "ar" ? "تاريخ الإنشاء" : "Generated At"}</th>
                    <th style={th}>{lang === "ar" ? "منشئ بواسطة" : "Created By"}</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r: any, i) => (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                      <td style={td}>{r.id}</td>
                      <td style={{ ...td, fontWeight: 600, color: "var(--tx0)" }}>{r.name ?? r.template?.name ?? "—"}</td>
                      <td style={td}>{r.type ?? r.template?.type ?? "—"}</td>
                      <td style={td}>
                        <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: (STATUS_COLORS[r.status] ?? "#6B7280") + "20", color: STATUS_COLORS[r.status] ?? "#6B7280" }}>
                          {lang === "ar" ? (STATUS_AR[r.status] ?? r.status) : (r.status ?? "—")}
                        </span>
                      </td>
                      <td style={{ ...td, direction: "ltr" }}>{r.created_at?.slice(0, 16) ?? "—"}</td>
                      <td style={td}>{r.user?.name ?? r.created_by ?? "—"}</td>
                      <td style={td}>
                        {r.status === "completed" && (
                          <a href={r.download_url ?? "#"} target="_blank" rel="noreferrer" className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>
                            {lang === "ar" ? "تحميل" : "Download"}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button className="btn btn-g btn-sm" disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); load(p); }}>
                {lang === "ar" ? "السابق" : "Prev"}
              </button>
              <span style={{ fontSize: 12, color: "var(--tx2)", alignSelf: "center" }}>{page}</span>
              <button className="btn btn-g btn-sm" disabled={!hasMore} onClick={() => { const p = page + 1; setPage(p); load(p); }}>
                {lang === "ar" ? "التالي" : "Next"}
              </button>
            </div>
          </>
        )}
      </PageCard>
    </DashboardLayout>
  );
}
