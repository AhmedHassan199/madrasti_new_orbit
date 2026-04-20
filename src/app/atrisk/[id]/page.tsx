"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { atRiskApi } from "@/lib/modules-api";

const RISK_CONFIG: Record<string, { color: string; ar: string; en: string }> = {
  critical: { color: "#7C3AED", ar: "حرج",   en: "Critical" },
  high:     { color: "#EF4444", ar: "مرتفع", en: "High" },
  medium:   { color: "#F59E0B", ar: "متوسط", en: "Medium" },
  low:      { color: "#22C55E", ar: "منخفض", en: "Low" },
};

const FACTOR_ICONS: Record<string, string> = {
  attendance:  "📅",
  behavior:    "⚠️",
  academic:    "📚",
  social:      "👥",
  family:      "🏠",
  health:      "🏥",
};

export default function AtRiskStudentDetailPage() {
  const { id }              = useParams<{ id: string }>();
  const { lang }            = useUi();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    atRiskApi.show(id).then((r: any) => setData(r.data ?? r)).finally(() => setLoading(false));
  }, [id]);

  const risk = data ? (RISK_CONFIG[data.risk_level] ?? { color: "#6B7280", ar: data.risk_level, en: data.risk_level }) : null;

  return (
    <DashboardLayout title={lang === "ar" ? "ملف الطالب في الخطر" : "At-Risk Student Profile"}>
      {loading ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
      ) : !data ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لم يتم العثور على البيانات" : "Not found"}</p>
      ) : (
        <>
          {/* Student header */}
          <PageCard>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: (risk?.color ?? "#6B7280") + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🚨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--tx0)" }}>{data.student?.name ?? data.name ?? "—"}</div>
                <div style={{ fontSize: 12, color: "var(--tx2)" }}>{data.student?.group?.name ?? data.group_name ?? "—"}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: (risk?.color ?? "#6B7280") + "20", color: risk?.color ?? "#6B7280" }}>
                    🔴 {lang === "ar" ? risk?.ar : risk?.en}
                  </span>
                </div>
              </div>
            </div>
          </PageCard>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { ar: "نسبة الحضور",      en: "Attendance Rate", val: `${data.attendance_rate ?? 0}%`,   color: data.attendance_rate >= 80 ? "#22C55E" : "#EF4444" },
              { ar: "الحوادث السلوكية", en: "Incidents",       val: data.incidents_count ?? 0,         color: "#F59E0B" },
              { ar: "الغيابات",          en: "Absences",        val: data.absences_count ?? 0,          color: "#EF4444" },
              { ar: "أيام التأخر",       en: "Late Days",       val: data.late_count ?? 0,              color: "#6366F1" },
              { ar: "نسبة الخطر",        en: "Risk Score",      val: `${data.risk_score ?? 0}%`,        color: risk?.color ?? "#6B7280" },
            ].map((k, i) => (
              <div key={i} style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, padding: "12px 14px", boxShadow: "var(--card-sh)" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{lang === "ar" ? k.ar : k.en}</div>
              </div>
            ))}
          </div>

          {/* Risk factors */}
          <PageCard title={lang === "ar" ? "عوامل الخطر" : "Risk Factors"}>
            {(!data.risk_factors || !data.risk_factors.length) ? (
              <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لم يتم تحديد عوامل الخطر" : "No risk factors identified"}</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                {data.risk_factors.map((factor: any, i: number) => {
                  const factorKey = typeof factor === "string" ? factor : factor.type;
                  const factorLabel = typeof factor === "string" ? factor : (lang === "ar" ? factor.label_ar : factor.label_en) ?? factor.type;
                  return (
                    <div key={i} style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 20 }}>{FACTOR_ICONS[factorKey] ?? "⚠️"}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx0)" }}>{factorLabel}</div>
                        {typeof factor === "object" && factor.value !== undefined && (
                          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{factor.value}</div>
                        )}
                        {typeof factor === "object" && factor.severity && (
                          <div style={{ fontSize: 10, color: RISK_CONFIG[factor.severity]?.color ?? "#6B7280", marginTop: 2, fontWeight: 700 }}>
                            {lang === "ar" ? RISK_CONFIG[factor.severity]?.ar : RISK_CONFIG[factor.severity]?.en}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PageCard>

          {/* Recommendations */}
          {data.recommendations && data.recommendations.length > 0 && (
            <PageCard title={lang === "ar" ? "التوصيات" : "Recommendations"}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.recommendations.map((rec: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--bg3)", borderRadius: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                    <div style={{ fontSize: 12, color: "var(--tx1)" }}>
                      {typeof rec === "string" ? rec : (lang === "ar" ? rec.ar : rec.en)}
                    </div>
                  </div>
                ))}
              </div>
            </PageCard>
          )}

          {/* Timeline / history */}
          {data.history && data.history.length > 0 && (
            <PageCard title={lang === "ar" ? "السجل الزمني" : "History Timeline"}>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {data.history.map((h: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < data.history.length - 1 ? "1px solid var(--brd)" : "none" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8702A", marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx0)" }}>{lang === "ar" ? (h.event_ar ?? h.event) : (h.event ?? h.event_ar)}</div>
                      <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2, direction: "ltr" }}>{h.date ?? h.created_at?.slice(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </PageCard>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
