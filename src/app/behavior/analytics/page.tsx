"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { behaviorApi } from "@/lib/modules-api";

export default function BehaviorAnalyticsPage() {
  const { lang }              = useUi();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod]   = useState("month");

  useEffect(() => {
    setLoading(true);
    behaviorApi.analytics({ period })
      .then((r: any) => setData(r.data ?? r))
      .finally(() => setLoading(false));
  }, [period]);

  const PERIODS = [
    { v: "week",  ar: "أسبوع",  en: "Week" },
    { v: "month", ar: "شهر",    en: "Month" },
    { v: "year",  ar: "سنة",    en: "Year" },
  ];

  const COLORS = ["#E8702A", "#6366F1", "#22C55E", "#F59E0B", "#EF4444"];

  return (
    <DashboardLayout title={lang === "ar" ? "تحليلات السلوك" : "Behavior Analytics"}>
      <PageCard
        title={lang === "ar" ? "تحليلات السلوك" : "Behavior Analytics"}
        actions={
          <div style={{ display: "flex", gap: 4 }}>
            {PERIODS.map((p) => (
              <button key={p.v} className={`btn btn-sm ${period === p.v ? "btn-p" : "btn-g"}`} onClick={() => setPeriod(p.v)}>
                {lang === "ar" ? p.ar : p.en}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
        ) : !data ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد بيانات" : "No data"}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Summary KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
              {[
                { ar: "إجمالي الحوادث",    en: "Total Incidents",  val: data.total ?? 0,    color: "#EF4444" },
                { ar: "طلاب متكررون",       en: "Repeat Students",  val: data.repeat ?? 0,   color: "#F59E0B" },
                { ar: "معالجة",             en: "Resolved",         val: data.resolved ?? 0, color: "#22C55E" },
                { ar: "قيد الإجراء",        en: "Pending",          val: data.pending ?? 0,  color: "#6366F1" },
              ].map((k, i) => (
                <div key={i} style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: k.color }}>{k.val}</div>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 4 }}>{lang === "ar" ? k.ar : k.en}</div>
                </div>
              ))}
            </div>

            {/* By type bar chart */}
            {data.by_type && data.by_type.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--tx1)", marginBottom: 12 }}>
                  {lang === "ar" ? "حسب النوع" : "By Type"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.by_type.map((item: any, i: number) => {
                    const max = Math.max(...data.by_type.map((x: any) => x.count ?? 0));
                    const pct = max > 0 ? ((item.count ?? 0) / max) * 100 : 0;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 110, fontSize: 11, color: "var(--tx1)", textAlign: "right", flexShrink: 0 }}>
                          {item.type ?? item.name ?? "—"}
                        </div>
                        <div style={{ flex: 1, background: "var(--bg3)", borderRadius: 4, height: 18, overflow: "hidden" }}>
                          <div style={{ width: pct + "%", background: COLORS[i % COLORS.length], height: "100%", borderRadius: 4, transition: "width .4s", display: "flex", alignItems: "center", paddingRight: 6 }}>
                            <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{item.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By month */}
            {data.by_month && data.by_month.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--tx1)", marginBottom: 12 }}>
                  {lang === "ar" ? "حسب الشهر" : "By Month"}
                </h3>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
                  {data.by_month.map((item: any, i: number) => {
                    const max = Math.max(...data.by_month.map((x: any) => x.count ?? 0));
                    const h = max > 0 ? Math.max(4, ((item.count ?? 0) / max) * 90) : 4;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 9, color: "var(--tx2)" }}>{item.count}</span>
                        <div style={{ width: "80%", background: "#E8702A", borderRadius: "4px 4px 0 0", height: h }} />
                        <span style={{ fontSize: 9, color: "var(--tx2)", whiteSpace: "nowrap" }}>{item.month ?? item.label ?? ""}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </PageCard>
    </DashboardLayout>
  );
}
