"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUi } from "@/contexts/UiContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { dashboardApi } from "@/lib/dashboard-api";

// ── Stat card ──
function StatCard({ v, label, c, bg, brd }: { v: string|number; label: string; c: string; bg: string; brd: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 13, padding: "13px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--fm)", color: c, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx1)" }}>{label}</div>
    </div>
  );
}

const WEEK_DAYS = ["أحد","اثنين","ثلاثاء","أربعاء","خميس"];
/* kept for legacy — empty seeds, real data lives in state (weekAttendance) */
const _LEGACY_SEED: number[] = [];
const MONTHS    = ["سبتمبر","أكتوبر","نوفمبر","ديسمبر","يناير","فبراير"];
const MONTH_ATT: number[] = [];

// removed — data lives in state (violTypes)

const CLASSES_PERF: any[] = [];

// removed — data lives in state (atRiskList, activityFeed)

const QUICK_LINKS = [
  { id: "schedule",   ico: "📅", ar: "الجدول",           c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
  { id: "committees", ico: "👥", ar: "اللجان",            c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
  { id: "examdist",   ico: "📋", ar: "توزيع الاختبارات", c: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
  { id: "seatnums",   ico: "🪑", ar: "أرقام الجلوس",     c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  { id: "portfolio",  ico: "📁", ar: "ملفات الإنجاز",    c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D" },
  { id: "forms",      ico: "📊", ar: "الاستبانات",        c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
  { id: "noor",       ico: "🔗", ar: "تكامل نور",         c: "#0891B2", bg: "#F0F9FF", brd: "#BAE6FD" },
  { id: "reports",    ico: "📈", ar: "التقارير",           c: "#6D28D9", bg: "#F5F3FF", brd: "#DDD6FE" },
];

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { lang } = useUi();
  const router = useRouter();
  const roleKey = role || "teacher";
  const isPrincipal = roleKey === "principal" || roleKey === "vice";
  const isCounselor = roleKey === "counselor";

  const [kpis, setKpis] = useState<any>(null);
  const [counselorData, setCounselorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weekAttendance, setWeekAttendance]     = useState<any[]>([]);
  const [monthAttendance, setMonthAttendance]   = useState<any[]>([]);
  const [classesPerf, setClassesPerf]           = useState<any[]>([]);
  const [violTypes, setViolTypes]               = useState<any[]>([]);
  const [atRiskList, setAtRiskList]             = useState<any[]>([]);
  const [activityFeed, setActivityFeed]         = useState<any[]>([]);

  useEffect(() => {
    dashboardApi.kpis()
      .then((res: any) => {
        const root = res.data ?? res;
        setKpis(root.kpis ?? root);
        setWeekAttendance(root.weekly_attendance ?? []);
        setMonthAttendance(root.monthly_attendance ?? []);
        setClassesPerf(root.classes_performance ?? []);
        setViolTypes(root.violation_types ?? []);
        setAtRiskList(root.at_risk_students ?? []);
        setActivityFeed(root.recent_activity ?? []);
      })
      .catch(() => setKpis({}))
      .finally(() => setLoading(false));

    if (isCounselor) {
      dashboardApi.counselor()
        .then((res: any) => setCounselorData(res.data ?? res))
        .catch(() => setCounselorData({}));
    }
  }, [isCounselor]);

  // KPI cards
  const kpiCards = isCounselor ? [
    { ico: "⚠️", v: counselorData?.kpis?.atrisk_cases ?? kpis?.incidents_count ?? 0, l: "حالات في خطر",    tr: "", tc: "dn",  clr: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
    { ico: "📞", v: counselorData?.kpis?.pending_summons ?? 0,                        l: "استدعاءات معلقة", tr: "", tc: "neu", clr: "#F59E0B", bg: "#FFFBEB", brd: "#FCD34D" },
    { ico: "💼", v: counselorData?.kpis?.monthly_sessions ?? 0,                       l: "جلسات الشهر",      tr: "", tc: "up",  clr: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
    { ico: "✅", v: counselorData?.kpis?.resolved_cases ?? 0,                         l: "حالات مُعالَجة",   tr: "", tc: "up",  clr: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
    { ico: "📅", v: counselorData?.kpis?.today_sessions ?? 0,                         l: "جلسات اليوم",      tr: "", tc: "neu", clr: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
  ] : isPrincipal ? [
    { ico: "👨‍🎓", v: kpis?.students_count ?? "—", l: "إجمالي الطلاب",    tr: "",              tc: "neu", clr: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
    { ico: "✅",   v: kpis?.attendance_rate ? kpis.attendance_rate + "%" : "94.2%", l: "معدل الحضور اليوم", tr: "▲ +1.3%", tc: "up", clr: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
    { ico: "⚠️",  v: kpis?.incidents_count ?? "5",    l: "طلاب في خطر",       tr: "▲ +2 هذا الأسبوع", tc: "dn", clr: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
    { ico: "📋",  v: "12",                             l: "مخالفات هذا الأسبوع",tr: "▲ +4 عن الأسبوع", tc: "dn", clr: "#F59E0B", bg: "#FFFBEB", brd: "#FCD34D" },
    { ico: "👩‍🏫", v: kpis?.staff_count ?? "24",        l: "الكادر التعليمي",   tr: "● 22 حاضر",        tc: "up", clr: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
  ] : [
    { ico: "📚", v: kpis?.my_classes ?? "4",       l: "فصولي اليوم",    tr: "",          tc: "neu", clr: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
    { ico: "✅", v: kpis?.today_attendance ?? "28", l: "طلاب حاضرون",   tr: "",          tc: "up",  clr: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
    { ico: "📋", v: kpis?.pending_tasks ?? "5",    l: "مهام معلقة",    tr: "",          tc: "neu", clr: "#F59E0B", bg: "#FFFBEB", brd: "#FCD34D" },
    { ico: "💬", v: kpis?.new_messages ?? "3",     l: "رسائل جديدة",   tr: "",          tc: "neu", clr: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
  ];

  // SVG line chart points
  const svgPts = monthAttendance.map((v, i) => `${i * (300 / 5)},${90 - ((v - 80) / 20) * 80}`).join(" ");
  const svgFill = `M${svgPts.split(" ").join(" L")} L300,90 L0,90 Z`;

  return (
    <DashboardLayout title="لوحة التحكم" subtitle={roleKey === "principal" ? "مدير المدرسة" : roleKey === "vice" ? "الوكيل" : roleKey === "counselor" ? "المرشد الطلابي" : "المعلم"}>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpiCards.length}, 1fr)`, gap: 10, marginBottom: 14 }}>
        {kpiCards.map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.brd}`, borderRadius: 13, padding: "13px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{k.ico}</div>
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "var(--fm)", color: k.clr, lineHeight: 1 }}>{loading ? "—" : k.v}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx1)" }}>{k.l}</div>
            {k.tr && <div style={{ fontSize: 10, fontWeight: 700, color: k.tc === "up" ? "#059669" : k.tc === "dn" ? "#DC2626" : "var(--tx2)" }}>{k.tr}</div>}
          </div>
        ))}
      </div>

      {/* ── Promo banner ── */}
      {isPrincipal ? (
        <div style={{ borderRadius: 14, padding: "15px 18px", marginBottom: 14, background: "linear-gradient(135deg,#1C1008 0%,#2D1A06 50%,#1C0E00 100%)", border: "1.5px solid rgba(232,112,42,.35)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(232,112,42,.1)" }} />
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg,#E8702A,#C2410C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📊</div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 13.5, fontWeight: 900, color: "#fff" }}>تقارير ذكية مُجدولة</span>
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: "rgba(232,112,42,.3)", color: "#FFB680", fontWeight: 700 }}>✨ جديد</span>
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.55)", marginBottom: 8 }}>أنشئ تقارير أداء المدرسة تلقائياً وأرسلها للإدارة كل أسبوع.</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["PDF تلقائي", "جدولة أسبوعية", "مقارنة بالمدارس", "مشاركة فورية"].map(t => (
                  <span key={t} style={{ fontSize: 10, padding: "2px 9px", borderRadius: 5, background: "rgba(232,112,42,.18)", color: "#FFB680", fontWeight: 700, border: "1px solid rgba(232,112,42,.22)" }}>{t}</span>
                ))}
              </div>
            </div>
            <button onClick={() => router.push("/reports")} style={{ background: "#E8702A", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 800 }}>عرض التقارير ←</button>
          </div>
        </div>
      ) : (
        <div style={{ borderRadius: 14, padding: "15px 18px", marginBottom: 14, background: "linear-gradient(135deg,#071428 0%,#0D2347 50%,#060E1F 100%)", border: "1.5px solid rgba(37,99,235,.35)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg,#2563EB,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🪑</div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: "#fff", marginBottom: 5 }}>توزيع الاختبارات الذكي</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.55)" }}>وزّع الطلاب على القاعات وأرقام الجلوس تلقائياً.</div>
            </div>
            <button onClick={() => router.push("/examdist")} style={{ background: "#2563EB", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 800 }}>توزيع الاختبارات ←</button>
          </div>
        </div>
      )}

      {/* ── AI Alert ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 11, marginBottom: 14 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🤖</span>
        <div style={{ flex: 1, fontSize: 12, color: "#DC2626" }}><strong>تنبيه الذكاء الاصطناعي:</strong> {(counselorData?.priorities?.length ?? atRiskList.length ?? 0)} طلاب يحتاجون تدخلاً فورياً — راجع القائمة وخطة المتابعة</div>
        <button onClick={() => router.push("/atrisk")} className="btn btn-sm" style={{ background: "#DC2626", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>عرض</button>
      </div>

      {/* ── COUNSELOR-specific sections ── */}
      {isCounselor && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* Priorities */}
            <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>⚠️ أولويات اليوم</div>
                <button onClick={() => router.push("/atrisk")} style={{ fontSize: 10, color: "#E8702A", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>عرض الكل ←</button>
              </div>
              {(counselorData?.priorities ?? []).length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)", fontSize: 11 }}>لا أولويات حالية ✓</div>
              ) : (counselorData.priorities as any[]).slice(0, 4).map((p, i) => {
                const lvlColor = p.level === "critical" ? "#DC2626" : p.level === "high" ? "#EA580C" : p.level === "medium" ? "#B45309" : "#059669";
                return (
                  <div key={i} style={{ padding: "11px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: lvlColor + "22", color: lvlColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{p.risk}%</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{p.issue}</div>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: lvlColor + "18", color: lvlColor, border: `1px solid ${lvlColor}40`, fontWeight: 700 }}>
                      {p.level === "critical" ? "حرج" : p.level === "high" ? "مرتفع" : p.level === "medium" ? "متوسط" : "منخفض"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Today sessions */}
            <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>📅 جلسات اليوم</div>
                <span style={{ fontSize: 10, color: "var(--tx2)" }}>{(counselorData?.today_sessions ?? []).length}</span>
              </div>
              {(counselorData?.today_sessions ?? []).length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)", fontSize: 11 }}>لا جلسات مجدولة لليوم</div>
              ) : (counselorData.today_sessions as any[]).map((s: any) => (
                <div key={s.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 50, fontSize: 11, fontWeight: 700, fontFamily: "var(--fm)", color: "#E8702A" }}>{s.time ?? "—"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "var(--tx2)" }}>{s.type === "academic" ? "📚 أكاديمى" : s.type === "behavior" ? "⚠️ سلوكى" : s.type === "absence" ? "📅 غياب" : "📋 عام"}</div>
                  </div>
                  <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: s.status === "completed" ? "#ECFDF5" : "#FFFBEB", color: s.status === "completed" ? "#059669" : "#B45309", fontWeight: 700 }}>
                    {s.status === "completed" ? "✓ تمت" : s.status === "pending" ? "⏳ قادمة" : s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending summons + case distribution */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>📞 استدعاءات معلقة</div>
                <button onClick={() => router.push("/summons")} style={{ fontSize: 10, color: "#E8702A", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>الكل ←</button>
              </div>
              {(counselorData?.pending_summons ?? []).length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)", fontSize: 11 }}>لا استدعاءات معلقة ✓</div>
              ) : (counselorData.pending_summons as any[]).map((s: any) => (
                <div key={s.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FFFBEB", color: "#B45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⏳</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "var(--tx2)" }}>{s.type} · {s.date}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Response rate + case distribution */}
            <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>📊 توزيع الحالات + معدل الاستجابة</div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ position: "relative", width: 70, height: 70 }}>
                    <svg width={70} height={70} viewBox="0 0 70 70" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx={35} cy={35} r={28} fill="none" stroke="var(--bg3)" strokeWidth={6} />
                      <circle cx={35} cy={35} r={28} fill="none" stroke="#E8702A" strokeWidth={6}
                        strokeDasharray={`${(2 * Math.PI * 28) * (counselorData?.response_rate ?? 0) / 100} ${(2 * Math.PI * 28) * (1 - (counselorData?.response_rate ?? 0) / 100)}`}
                        strokeLinecap="round" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#E8702A", fontFamily: "var(--fm)" }}>{counselorData?.response_rate ?? 0}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", fontWeight: 700 }}>معدل الاستجابة</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#E8702A", marginTop: 2 }}>{counselorData?.response_rate ?? 0}%</div>
                    <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 3 }}>الاستدعاءات المحضورة / الإجمالى</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 6 }}>توزيع الحالات حسب الخطورة</div>
                {(counselorData?.case_distribution ?? []).length === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--tx2)" }}>لا بيانات</div>
                ) : (counselorData.case_distribution as any[]).map((c: any) => {
                  const total = (counselorData.case_distribution as any[]).reduce((a: number, x: any) => a + (x.count ?? 0), 0) || 1;
                  const pct = Math.round((c.count / total) * 100);
                  const color = c.label === "critical" ? "#DC2626" : c.label === "high" ? "#EA580C" : c.label === "medium" ? "#B45309" : "#059669";
                  return (
                    <div key={c.label} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span>{c.label === "critical" ? "حرج" : c.label === "high" ? "مرتفع" : c.label === "medium" ? "متوسط" : "منخفض"}</span>
                        <span style={{ color, fontWeight: 800, fontFamily: "var(--fm)" }}>{c.count}</span>
                      </div>
                      <div style={{ height: 5, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: pct + "%", background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Row 1: Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Weekly attendance bar chart */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--brd)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>📅 الحضور الأسبوعي</div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>الأسبوع الحالي — عدد الغائبين</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "3px 9px", borderRadius: 6, border: "1px solid #A7F3D0" }}>متوسط 94.2%</div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90, marginBottom: 8 }}>
              {weekAttendance.map((d: any, i: number) => {
                const maxAbs = Math.max(1, ...weekAttendance.map((x: any) => x.absent ?? 0));
                const pct = Math.round(((d.absent ?? 0) / maxAbs) * 100);
                const isToday = i === weekAttendance.length - 1;
                const rate = d.rate ?? 0;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: isToday ? "#E8702A" : "var(--tx2)" }}>{d.absent ?? 0}</div>
                    <div style={{ width: "100%", borderRadius: "5px 5px 0 0", background: isToday ? "#E8702A" : rate >= 93 ? "#22C55E" : rate >= 90 ? "#F59E0B" : "#EF4444", height: `${pct}%`, minHeight: 6 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {WEEK_DAYS.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: i === 3 ? 800 : 600, color: i === 3 ? "#E8702A" : "var(--tx2)" }}>{d}</div>)}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              {[{ c: "#22C55E", l: "≥93%" }, { c: "#F59E0B", l: "90-93%" }, { c: "#EF4444", l: "<90%" }].map(lg => (
                <span key={lg.l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "var(--tx2)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: lg.c, flexShrink: 0, display: "inline-block" }} />
                  {lg.l}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly attendance SVG */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--brd)" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>📈 منحنى الحضور الشهري</div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>سبتمبر — فبراير</div>
            </div>
            <div style={{ fontSize: 11, color: "#2563EB", fontWeight: 700 }}>+5.1% منذ بداية العام</div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            <svg viewBox="0 0 300 90" width="100%" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8702A" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#E8702A" stopOpacity={0} />
                </linearGradient>
              </defs>
              {[80, 85, 90, 95, 100].map((v) => {
                const y = 90 - ((v - 80) / 20) * 80;
                return <line key={v} x1="0" y1={y} x2="300" y2={y} stroke="var(--brd)" strokeWidth={0.5} />;
              })}
              <path d={svgFill} fill="url(#lineGrad)" />
              <polyline points={svgPts} fill="none" stroke="#E8702A" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {monthAttendance.map((v, i) => {
                const x = i * (300 / 5), y = 90 - ((v - 80) / 20) * 80;
                return <circle key={i} cx={x} cy={y} r={i === monthAttendance.length - 1 ? 5 : 3.5} fill={i === monthAttendance.length - 1 ? "#E8702A" : "#fff"} stroke="#E8702A" strokeWidth={2} />;
              })}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {MONTHS.map(m => <div key={m} style={{ fontSize: 9, color: "var(--tx2)", textAlign: "center", width: `${100 / 6}%` }}>{m}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Classes + Violations ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Classes performance */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>🏫 أداء الفصول الدراسية</div>
            <span style={{ fontSize: 10, color: "var(--tx2)" }}>الفصل الثاني</span>
          </div>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "55px 1fr 60px 60px 50px", padding: "7px 14px", background: "var(--bg3)", borderBottom: "1px solid var(--brd)", fontSize: 10, fontWeight: 800, color: "var(--tx2)" }}>
              <div>الفصل</div><div>معدل الحضور</div><div style={{ textAlign: "center" }}>م. الدرجات</div><div style={{ textAlign: "center" }}>مخالفات</div><div />
            </div>
            {classesPerf.map(cl => (
              <div key={cl.cls} style={{ display: "grid", gridTemplateColumns: "55px 1fr 60px 60px 50px", padding: "9px 14px", borderBottom: "1px solid var(--brd)", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: cl.c }}>{cl.cls}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 7, background: "var(--bg3)", borderRadius: 4, overflow: "hidden", border: "1px solid var(--brd)" }}>
                    <div style={{ height: "100%", width: `${cl.att}%`, background: cl.att >= 95 ? "#22C55E" : cl.att >= 90 ? "#E8702A" : "#EF4444", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: cl.att >= 95 ? "#059669" : cl.att >= 90 ? "#E8702A" : "#DC2626", minWidth: 28 }}>{cl.att}%</span>
                </div>
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700 }}>{cl.avg}%</div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 5, background: cl.viol > 4 ? "#FEF2F2" : cl.viol > 1 ? "#FFFBEB" : "#ECFDF5", color: cl.viol > 4 ? "#DC2626" : cl.viol > 1 ? "#B45309" : "#059669" }}>{cl.viol}</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <button onClick={() => router.push("/attendance/students/daily")} style={{ fontSize: 10, padding: "3px 7px", border: "1px solid var(--brd)", borderRadius: 6, background: "var(--bg1)", cursor: "pointer", color: "var(--tx2)", fontFamily: "inherit" }}>عرض</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Violations donut */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>⚠️ توزيع المخالفات</div>
            <div style={{ fontSize: 10, color: "var(--tx2)" }}>هذا الشهر — 12 مخالفة</div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 90, height: 90, position: "relative", flexShrink: 0 }}>
                <svg viewBox="0 0 90 90" width="90" height="90">
                  {(() => {
                    const total = violTypes.reduce((a, v) => a + v.v, 0);
                    let offset = -25;
                    return violTypes.map((vt, idx) => {
                      const pct = vt.v / total;
                      const angle = pct * 360;
                      const r = 35, cx = 45, cy = 45;
                      const startRad = (offset / 180) * Math.PI;
                      const endRad = ((offset + angle) / 180) * Math.PI;
                      const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
                      const large = angle > 180 ? 1 : 0;
                      const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
                      offset += angle;
                      return <path key={idx} d={d} fill={vt.c} opacity={0.85} stroke="var(--bg1)" strokeWidth={2} />;
                    });
                  })()}
                  <circle cx="45" cy="45" r="22" fill="var(--bg1)" />
                  <text x="45" y="41" textAnchor="middle" fontSize="13" fontWeight="900" fill="var(--tx0)">12</text>
                  <text x="45" y="52" textAnchor="middle" fontSize="7" fill="var(--tx2)">مخالفة</text>
                </svg>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                {violTypes.map(vt => (
                  <div key={vt.ar} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: vt.c, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 11 }}>{vt.ar}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: vt.c }}>{vt.v}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12, padding: "9px 12px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)", fontSize: 11, color: "var(--tx2)" }}>
              📊 مقارنة الشهر الماضي: <strong style={{ color: "#DC2626" }}>▲ +3</strong> مخالفة
            </div>
            <button className="btn btn-g btn-sm" onClick={() => router.push("/behavior")} style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: 11 }}>📋 عرض كل المخالفات</button>
          </div>
        </div>
      </div>

      {/* ── Row 3: At-risk + Quick links ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Absent students */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>🔴 الطلاب الغائبون اليوم</div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>74 غائباً — 62 لم يُبلَّغ عنهم</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-g btn-sm" style={{ fontSize: 11 }}>📨 إشعار الأولياء</button>
              <button className="btn btn-p btn-sm" style={{ fontSize: 11 }}>+ تسجيل</button>
            </div>
          </div>
          {atRiskList.map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--brd)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.riskC}18`, border: `1.5px solid ${s.riskC}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: s.riskC, flexShrink: 0 }}>{s.abs}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>فصل {s.cls} · {s.parent}</div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: `${s.riskC}15`, color: s.riskC, border: `1px solid ${s.riskC}35`, fontWeight: 700, flexShrink: 0 }}>{s.risk}</span>
              <button style={{ fontSize: 10, padding: "4px 9px", border: "1px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", cursor: "pointer", color: "var(--tx2)", flexShrink: 0, fontFamily: "inherit" }}>استدعاء</button>
            </div>
          ))}
          <div style={{ padding: "10px 16px", background: "var(--bg3)", fontSize: 11, color: "var(--tx2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>عرض كل الغائبين</span>
            <button onClick={() => router.push("/attendance/students/daily")} style={{ fontSize: 11, color: "#E8702A", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>عرض الكل ←</button>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>⚡ وصول سريع</div>
          </div>
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {QUICK_LINKS.map(m => (
              <div key={m.id} onClick={() => router.push("/" + m.id)} style={{ background: m.bg, border: `1px solid ${m.brd}`, borderRadius: 10, padding: "11px 10px", textAlign: "center", cursor: "pointer", transition: "all .15s" }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 16px rgba(0,0,0,.1)"; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
                <div style={{ fontSize: 20, marginBottom: 5 }}>{m.ico}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: m.c }}>{m.ar}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Activity log ── */}
      <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>🕐 آخر النشاطات</div>
          <span style={{ fontSize: 10, color: "var(--tx2)" }}>اليوم</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
          {activityFeed.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderBottom: "1px solid var(--brd)", borderLeft: "1px solid var(--brd)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${a.c}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "var(--tx0)", lineHeight: 1.4 }}>{a.txt}</div>
                <div style={{ fontSize: 9.5, color: "var(--tx2)", marginTop: 2 }}>{a.time} ص</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </DashboardLayout>
  );
}
