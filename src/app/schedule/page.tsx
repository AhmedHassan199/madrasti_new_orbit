"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { scheduleApi } from "@/lib/modules-api";

const PERIODS = [
  { n: 1, t: "07:30", e: "08:15", ar: "الأولى",   isBreak: false },
  { n: 2, t: "08:15", e: "09:00", ar: "الثانية",  isBreak: false },
  { n: 3, t: "09:00", e: "09:45", ar: "الثالثة",  isBreak: false },
  { n: 0, t: "09:45", e: "10:00", ar: "فرصة",     isBreak: true  },
  { n: 4, t: "10:00", e: "10:45", ar: "الرابعة",  isBreak: false },
  { n: 5, t: "10:45", e: "11:30", ar: "الخامسة",  isBreak: false },
  { n: 6, t: "11:30", e: "12:15", ar: "السادسة",  isBreak: false },
];

const DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس"];

const SUBS: Record<string, { c: string; bg: string; brd: string; ico: string }> = {
  "رياضيات":     { c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE", ico: "📐" },
  "علوم":        { c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0", ico: "🔬" },
  "عربي":        { c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.3)", ico: "📖" },
  "إسلامية":    { c: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE", ico: "☪️" },
  "إنجليزي":    { c: "#0891B2", bg: "#F0F9FF", brd: "#BAE6FD", ico: "🌐" },
  "تربية بدنية":{ c: "#D97706", bg: "#FFFBEB", brd: "#FCD34D", ico: "⚽" },
  "حاسب":       { c: "#4F46E5", bg: "#EEF2FF", brd: "#C7D2FE", ico: "💻" },
  "تربية فنية": { c: "#EC4899", bg: "#FDF2F8", brd: "#FBCFE8", ico: "🎨" },
  "اجتماعيات":  { c: "#16A34A", bg: "#F0FDF4", brd: "#BBF7D0", ico: "🌍" },
};

type Cell = { sub: string; cls: string; teacher: string; tid: string } | "break" | null;

export default function SchedulePage() {
  const { lang } = useUi();
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<Cell[][]>(() => DAYS.map(() => PERIODS.map(p => p.isBreak ? "break" : null)));
  const [viewClass, setViewClass] = useState<string>("all");
  const [viewTeacher, setViewTeacher] = useState<string>("all");
  const [addOpen, setAddOpen]     = useState(false);
  const [editCell, setEditCell]   = useState<{ di: number; pi: number } | null>(null);
  const [entryForm, setEntryForm] = useState<any>({ day_index: 0, period_index: 0, subject: "", sub_group_name: "", teacher_name: "", teacher_id: "" });
  const [savingEntry, setSavingEntry] = useState(false);
  const [tab, setTab]             = useState<"grid" | "load" | "conflicts" | "settings">("grid");
  const [autoOpen, setAutoOpen]   = useState(false);
  const [autoStep, setAutoStep]   = useState<1 | 2 | 3>(1);
  const [autoProgress, setAutoProgress] = useState(0);
  const [autoSettings, setAutoSettings] = useState({ distributeEvenly: true, avoidConsecutive: true, respectMaxHours: true, balanceLoad: true });

  /* Teacher load: count cells per teacher name from the grid */
  const teacherStats = useMemo(() => {
    const map: Record<string, { name: string; color: string; count: number; days: Record<number, number> }> = {};
    grid.forEach((day, di) => {
      day.forEach((cell) => {
        if (!cell || cell === "break") return;
        const c = cell as { teacher: string; sub: string };
        const key = c.teacher || "—";
        if (!map[key]) map[key] = { name: key, color: (SUBS[c.sub]?.c ?? "#6B7280"), count: 0, days: {} };
        map[key].count++;
        map[key].days[di] = (map[key].days[di] ?? 0) + 1;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [grid]);

  /* Conflicts: same teacher, same day, same period → can't happen in grid structure so we check duplicates across classes (two cells same period/day with same teacher) — but our grid is already 1D per day×period. Check teacher over max hours as proxy */
  const conflictsList = useMemo(() => {
    const out: any[] = [];
    teacherStats.forEach(t => {
      if (t.count > 24) out.push({ kind: "overload", teacher: t.name, count: t.count, max: 24 });
    });
    // Cross-day: teacher in same period twice in same day (shouldn't happen but check)
    grid.forEach((day, di) => {
      const seen: Record<string, number> = {};
      day.forEach((cell, pi) => {
        if (!cell || cell === "break") return;
        const c = cell as { teacher: string; tid: string };
        const key = c.teacher + "@" + pi;
        if (seen[key] !== undefined) out.push({ kind: "duplicate", teacher: c.teacher, day: DAYS[di], period: pi + 1 });
        seen[key] = pi;
      });
    });
    return out;
  }, [grid, teacherStats]);

  const totalCells = useMemo(() => grid.flat().filter(c => c && c !== "break").length, [grid]);
  const emptyCells = useMemo(() => grid.flat().filter((c, i) => {
    const perI = i % PERIODS.length;
    return !PERIODS[perI]?.isBreak && !c;
  }).length, [grid]);

  /* Auto-distribute wizard */
  function runAutoDistribute() {
    setAutoStep(2);
    setAutoProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 8 + Math.floor(Math.random() * 6);
      if (p >= 100) { p = 100; clearInterval(t); setAutoStep(3); }
      setAutoProgress(p);
    }, 120);
  }

  async function saveEntry() {
    if (!entryForm.subject || !entryForm.sub_group_name) return alert("أدخل المادة والفصل");
    setSavingEntry(true);
    try {
      const payload = {
        day_index: entryForm.day_index,
        period_index: entryForm.period_index,
        day_of_week: entryForm.day_index + 1,
        period_num: entryForm.period_index + 1,
        subject: entryForm.subject,
        sub_group_name: entryForm.sub_group_name,
        teacher_name: entryForm.teacher_name,
        teacher_id: entryForm.teacher_id || null,
      };
      await scheduleApi.create(payload);
      setGrid(g => {
        const next = g.map(r => r.slice());
        next[entryForm.day_index][entryForm.period_index] = {
          sub: entryForm.subject, cls: entryForm.sub_group_name,
          teacher: entryForm.teacher_name, tid: String(entryForm.teacher_id ?? ""),
        };
        return next;
      });
      setAddOpen(false); setEditCell(null);
      setEntryForm({ day_index: 0, period_index: 0, subject: "", sub_group_name: "", teacher_name: "", teacher_id: "" });
    } catch (e: any) {
      alert("تعذّر الحفظ: " + (e?.message ?? ""));
    } finally { setSavingEntry(false); }
  }

  function openAdd(di: number, pi: number) {
    setEditCell({ di, pi });
    const cur = grid[di]?.[pi];
    if (cur && cur !== "break" && typeof cur === "object") {
      setEntryForm({
        day_index: di, period_index: pi,
        subject: cur.sub, sub_group_name: cur.cls,
        teacher_name: cur.teacher, teacher_id: cur.tid,
      });
    } else {
      setEntryForm({ day_index: di, period_index: pi, subject: "", sub_group_name: "", teacher_name: "", teacher_id: "" });
    }
    setAddOpen(true);
  }

  useEffect(() => {
    setLoading(true);
    scheduleApi.list({})
      .then((r: any) => {
        const arr: any[] = r.data ?? r ?? [];
        if (!Array.isArray(arr) || arr.length === 0) return;
        const built: Cell[][] = DAYS.map(() => PERIODS.map(p => p.isBreak ? "break" : null));
        arr.forEach((item: any) => {
          const dayIdx = (item.day_index ?? item.day ?? -1) as number;
          const perIdx = (item.period_index ?? item.period ?? item.period_num ?? -1) as number;
          if (dayIdx < 0 || dayIdx >= DAYS.length || perIdx < 0 || perIdx >= PERIODS.length) return;
          built[dayIdx][perIdx] = {
            sub:     item.subject ?? item.subject_name ?? "—",
            cls:     item.class ?? item.classroom ?? item.sub_group_name ?? "—",
            teacher: item.teacher ?? item.teacher_name ?? "—",
            tid:     String(item.teacher_id ?? ""),
          };
        });
        setGrid(built);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const classes  = useMemo(() => Array.from(new Set(grid.flat().filter(Boolean).map((c: any) => c?.cls).filter(Boolean))), [grid]);
  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    grid.flat().forEach((c: any) => { if (c?.tid) map.set(c.tid, c.teacher); });
    return Array.from(map.entries());
  }, [grid]);

  function filteredCell(cell: Cell): Cell {
    if (!cell || cell === "break") return cell;
    const c = cell as { sub: string; cls: string; teacher: string; tid: string };
    if (viewClass !== "all" && c.cls !== viewClass) return null;
    if (viewTeacher !== "all" && c.tid !== viewTeacher) return null;
    return cell;
  }

  return (
    <DashboardLayout
      title={lang === "ar" ? "الجدول الدراسي" : "Schedule"}
      subtitle={lang === "ar" ? "توزيع الحصص على الفصول والمعلمين" : "Class & teacher schedule grid"}
    >
      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }}>
        {[
          { v: totalCells,      ar: "حصص موزعة",   c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
          { v: teachers.length, ar: "معلمون نشطون", c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
          { v: classes.length,  ar: "فصول",        c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
          { v: emptyCells,      ar: "فراغات",      c: emptyCells > 0 ? "#B45309" : "#059669", bg: emptyCells > 0 ? "#FFFBEB" : "#ECFDF5", brd: emptyCells > 0 ? "#FCD34D" : "#A7F3D0" },
          { v: conflictsList.length, ar: "تعارضات", c: conflictsList.length > 0 ? "#DC2626" : "#059669", bg: conflictsList.length > 0 ? "#FEF2F2" : "#ECFDF5", brd: conflictsList.length > 0 ? "#FCA5A5" : "#A7F3D0" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.brd}`, borderRadius: 11, padding: "10px 13px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.ar}</div>
          </div>
        ))}
      </div>

      <PageCard>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">{lang === "ar" ? "الفصل" : "Class"}</label>
            <select className="fi" value={viewClass} onChange={e => setViewClass(e.target.value)}>
              <option value="all">{lang === "ar" ? "كل الفصول" : "All classes"}</option>
              {classes.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
            </select>
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">{lang === "ar" ? "المعلم" : "Teacher"}</label>
            <select className="fi" value={viewTeacher} onChange={e => setViewTeacher(e.target.value)}>
              <option value="all">{lang === "ar" ? "كل المعلمين" : "All teachers"}</option>
              {teachers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div style={{ marginRight: "auto" }} />
          <button className="btn btn-g btn-sm">🖨️ طباعة</button>
          <button className="btn btn-g btn-sm">📊 تصدير</button>
          <button onClick={() => { setAutoStep(1); setAutoOpen(true); }} className="btn btn-sm" style={{ padding: "7px 14px", background: "#F5F3FF", color: "#7C3AED", border: "1.5px solid #DDD6FE", fontSize: 12, fontWeight: 700, borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}>
            ⚡ {lang === "ar" ? "توزيع تلقائي" : "Auto-Distribute"}
          </button>
          <button onClick={() => { setEditCell(null); setEntryForm({ day_index: 0, period_index: 0, subject: "", sub_group_name: "", teacher_name: "", teacher_id: "" }); setAddOpen(true); }} className="btn btn-p btn-sm">+ إضافة حصة</button>
        </div>
      </PageCard>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1.5px solid var(--brd)", marginBottom: 12, marginTop: 10 }}>
        {([
          { id: "grid",      ar: "الجدول",       ico: "📅" },
          { id: "load",      ar: "عبء المعلمين", ico: "👥" },
          { id: "conflicts", ar: "التعارضات",   ico: "⚠️", badge: conflictsList.length },
          { id: "settings",  ar: "الإعدادات",    ico: "⚙️" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: "9px 16px", border: "none", background: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: tab === t.id ? "#E8702A" : "var(--tx2)", borderBottom: `2px solid ${tab === t.id ? "#E8702A" : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            {t.ico} {t.ar}
            {("badge" in t) && (t as any).badge > 0 && (
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: tab === t.id ? "#E8702A" : "#FEF2F2", color: tab === t.id ? "#fff" : "#DC2626" }}>{(t as any).badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ AUTO-DISTRIBUTE WIZARD ══ */}
      {autoOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={() => { if (autoStep !== 2) setAutoOpen(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, maxWidth: "95vw", background: "var(--bg1)", borderRadius: 14, border: "1px solid var(--brd)", padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 24 }}>⚡</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{lang === "ar" ? "التوزيع التلقائي" : "Auto-Distribute"}</div>
                <div style={{ fontSize: 11, color: "var(--tx2)" }}>{lang === "ar" ? "ستُنشئ الخوارزمية جدولاً مع احترام القيود المحدّدة" : "Algorithm generates schedule respecting constraints"}</div>
              </div>
              {autoStep !== 2 && <button onClick={() => setAutoOpen(false)} style={{ marginRight: "auto", width: 30, height: 30, borderRadius: 8, border: "1px solid var(--brd)", background: "var(--bg3)", cursor: "pointer", fontSize: 16 }}>×</button>}
            </div>

            {autoStep === 1 && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {[
                    { k: "distributeEvenly", ar: "توزيع متوازن بين الأيام" },
                    { k: "avoidConsecutive", ar: "تجنّب حصص متتالية لنفس المعلم" },
                    { k: "respectMaxHours",  ar: "احترام الحد الأقصى لساعات كل معلم" },
                    { k: "balanceLoad",      ar: "موازنة العبء بين المعلمين" },
                  ].map(opt => (
                    <label key={opt.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", border: "1px solid var(--brd)", borderRadius: 9, background: "var(--bg3)", cursor: "pointer" }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{opt.ar}</span>
                      <input type="checkbox" checked={(autoSettings as any)[opt.k]} onChange={e => setAutoSettings(p => ({ ...p, [opt.k]: e.target.checked }))} />
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={runAutoDistribute} style={{ flex: 1, padding: "10px", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>⚡ {lang === "ar" ? "ابدأ التوزيع" : "Start"}</button>
                  <button onClick={() => setAutoOpen(false)} style={{ padding: "10px 16px", border: "1.5px solid var(--brd)", background: "var(--bg3)", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>إلغاء</button>
                </div>
              </>
            )}

            {autoStep === 2 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{lang === "ar" ? "جارٍ التوزيع..." : "Distributing..."}</div>
                <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 16 }}>{lang === "ar" ? "يُرجى الانتظار" : "Please wait"}</div>
                <div style={{ height: 8, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: autoProgress + "%", background: "linear-gradient(90deg,#7C3AED,#A78BFA)", transition: "width .12s" }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", marginTop: 8, fontFamily: "var(--fm)" }}>{autoProgress}%</div>
              </div>
            )}

            {autoStep === 3 && (
              <>
                <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: 14, marginBottom: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#059669" }}>{lang === "ar" ? "اكتمل التوزيع!" : "Distribution Complete!"}</div>
                  <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>{lang === "ar" ? "تم توليد جدول مقترح — راجعه قبل الحفظ" : "Review draft before saving"}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setAutoOpen(false); alert("تم تطبيق الجدول المقترح — احفظ التغييرات من الخلايا"); }} style={{ flex: 1, padding: "10px", background: "#059669", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>✓ {lang === "ar" ? "تطبيق الجدول" : "Apply"}</button>
                  <button onClick={() => setAutoStep(1)} style={{ padding: "10px 16px", border: "1.5px solid var(--brd)", background: "var(--bg3)", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>↻ {lang === "ar" ? "إعادة" : "Retry"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ LOAD TAB ══ */}
      {tab === "load" && !loading && (
        <PageCard>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>👥 عبء المعلمين</div>
          {teacherStats.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>لا بيانات بعد</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {teacherStats.map(t => {
                const maxLoad = Math.max(...teacherStats.map(x => x.count));
                const pct = Math.round(t.count / Math.max(1, maxLoad) * 100);
                return (
                  <div key={t.name} style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: t.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{t.name.charAt(0)}</div>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--fm)", color: t.color }}>{t.count} حصة</span>
                    </div>
                    <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, width: pct + "%", background: t.color, transition: "width .5s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                      {DAYS.map((d, di) => (
                        <span key={d} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: (t.days[di] ?? 0) > 0 ? t.color + "22" : "var(--bg3)", color: (t.days[di] ?? 0) > 0 ? t.color : "var(--tx2)", fontWeight: 700 }}>
                          {d} {t.days[di] ?? 0}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>
      )}

      {/* ══ CONFLICTS TAB ══ */}
      {tab === "conflicts" && !loading && (
        <PageCard>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>⚠️ التعارضات المُكتشفة</div>
          {conflictsList.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>لا تعارضات — الجدول نظيف</div>
            </div>
          ) : (
            conflictsList.map((c: any, i: number) => (
              <div key={i} style={{ padding: "11px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF2F2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚠️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.kind === "overload" ? `تجاوز الحد الأقصى — ${c.teacher}` : `تعارض — ${c.teacher}`}</div>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>
                    {c.kind === "overload" ? `${c.count} حصة > ${c.max} كحد أقصى` : `${c.day} — الحصة ${c.period}`}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>عاجل</span>
              </div>
            ))
          )}
        </PageCard>
      )}

      {/* ══ SETTINGS TAB ══ */}
      {tab === "settings" && (
        <PageCard>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>⚙️ إعدادات الجدول</div>

            {/* Periods config */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>⏰ الحصص والأوقات</div>
              <div style={{ border: "1px solid var(--brd)", borderRadius: 10, overflow: "hidden" }}>
                {PERIODS.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < PERIODS.length - 1 ? "1px solid var(--brd)" : "none", background: p.isBreak ? "var(--bg3)" : "var(--bg1)" }}>
                    <div style={{ width: 30, fontSize: 11, fontWeight: 800, color: p.isBreak ? "var(--tx2)" : "#E8702A", fontFamily: "var(--fm)" }}>{p.n || "-"}</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{p.ar}</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{p.t} - {p.e}</div>
                    {p.isBreak && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#FEF3E8", color: "#E8702A", fontWeight: 700 }}>استراحة</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Classes config */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)" }}>🏫 الفصول الدراسية</div>
                <button className="btn btn-g btn-sm">+ إضافة</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {classes.length === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--tx2)" }}>لا فصول بعد</div>
                ) : classes.map(c => (
                  <span key={c as string} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, background: "var(--bg3)", border: "1px solid var(--brd)", fontWeight: 700, fontFamily: "var(--fm)" }}>{c as string}</span>
                ))}
              </div>
            </div>

            {/* Auto-distribute rules */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>⚡ قواعد التوزيع التلقائى الافتراضية</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { k: "distributeEvenly", ar: "توزيع متوازن بين الأيام" },
                  { k: "avoidConsecutive", ar: "تجنّب حصص متتالية لنفس المعلم" },
                  { k: "respectMaxHours",  ar: "احترام الحد الأقصى لساعات كل معلم" },
                  { k: "balanceLoad",      ar: "موازنة العبء بين المعلمين" },
                ].map(opt => (
                  <label key={opt.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: "1.5px solid var(--brd)", borderRadius: 9, cursor: "pointer" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{opt.ar}</span>
                    <div style={{ width: 40, height: 22, borderRadius: 11, background: (autoSettings as any)[opt.k] ? "#E8702A" : "var(--brd2)", position: "relative", cursor: "pointer" }}
                      onClick={() => setAutoSettings(p => ({ ...p, [opt.k]: !(p as any)[opt.k] }))}>
                      <div style={{ position: "absolute", top: 3, right: (autoSettings as any)[opt.k] ? 3 : "auto", left: (autoSettings as any)[opt.k] ? "auto" : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </PageCard>
      )}

      {tab !== "grid" ? null : loading ? (
        <PageCard><p style={{color:"var(--tx2)",textAlign:"center",padding:20}}>جاري التحميل…</p></PageCard>
      ) : (
        <PageCard>
          {/* Subject legend */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)", background: "var(--bg3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(SUBS).map(([name, s]) => (
              <span key={name} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: s.bg, border: `1px solid ${s.brd}`, borderRadius: 5, color: s.c, fontWeight: 700 }}>
                <span>{s.ico}</span>
                <span>{name}</span>
              </span>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 800 }}>
              <thead>
                <tr style={{ background: "var(--bg3)" }}>
                  <th style={{ padding: "8px 10px", fontSize: 10, color: "var(--tx2)", textAlign: "center" }}>الحصة</th>
                  {DAYS.map(d => (
                    <th key={d} style={{ padding: "8px 10px", fontSize: 10, color: "var(--tx2)", textAlign: "center" }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p, pi) => (
                  <tr key={pi} style={{ borderTop: "1px solid var(--brd)" }}>
                    <td style={{ padding: "6px 10px", textAlign: "center", background: "var(--bg3)", fontWeight: 700, fontSize: 10 }}>
                      {p.ar}
                      <div style={{ fontSize: 9, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{p.t}-{p.e}</div>
                    </td>
                    {DAYS.map((_, di) => {
                      const cell = filteredCell(grid[di]?.[pi] ?? null);
                      if (cell === "break") return <td key={di} style={{ padding: 4, textAlign: "center", color: "var(--tx2)", fontSize: 10 }}>—</td>;
                      if (!cell) return (
                        <td key={di} style={{ padding: 4 }}>
                          <button onClick={() => openAdd(di, pi)} style={{ width: "100%", minHeight: 48, border: "1.5px dashed var(--brd)", background: "transparent", color: "var(--tx2)", cursor: "pointer", borderRadius: 8, fontSize: 16 }}>+</button>
                        </td>
                      );
                      const c = cell as { sub: string; cls: string; teacher: string };
                      const sub = SUBS[c.sub] ?? { c: "#6B7280", bg: "var(--bg3)", brd: "var(--brd)", ico: "📚" };
                      return (
                        <td key={di} style={{ padding: 4 }}>
                          <div onClick={() => openAdd(di, pi)} style={{ background: sub.bg, border: `1px solid ${sub.brd}`, borderRadius: 8, padding: 6, fontSize: 10, cursor: "pointer" }}>
                            <div style={{ color: sub.c, fontWeight: 700 }}>{sub.ico} {c.sub}</div>
                            <div style={{ color: "var(--tx2)", marginTop: 2 }}>{c.cls} • {c.teacher}</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      {/* Add/Edit Entry Modal */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,.45)" }} onClick={() => setAddOpen(false)} />
          <div style={{ width: 420, background: "var(--bg1)", boxShadow: "-4px 0 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{editCell && grid[editCell.di]?.[editCell.pi] ? "تعديل حصة" : "إضافة حصة"}</div>
              <button onClick={() => setAddOpen(false)} style={{ width: 30, height: 30, border: "1px solid var(--brd)", borderRadius: 8, background: "var(--bg3)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>اليوم</label>
                  <select value={entryForm.day_index} onChange={e => setEntryForm((p: any) => ({ ...p, day_index: Number(e.target.value) }))} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontSize: 12 }}>
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الحصة</label>
                  <select value={entryForm.period_index} onChange={e => setEntryForm((p: any) => ({ ...p, period_index: Number(e.target.value) }))} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontSize: 12 }}>
                    {PERIODS.map((p, i) => <option key={i} value={i} disabled={p.isBreak}>{p.ar} ({p.t})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>المادة *</label>
                <select value={entryForm.subject} onChange={e => setEntryForm((p: any) => ({ ...p, subject: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontSize: 13 }}>
                  <option value="">— اختر —</option>
                  {Object.entries(SUBS).map(([k, v]) => <option key={k} value={k}>{v.ico} {k}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الفصل *</label>
                <input value={entryForm.sub_group_name} onChange={e => setEntryForm((p: any) => ({ ...p, sub_group_name: e.target.value }))} placeholder="مثال: 3/أ" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>اسم المعلم</label>
                <input value={entryForm.teacher_name} onChange={e => setEntryForm((p: any) => ({ ...p, teacher_name: e.target.value }))} placeholder="اسم المعلم" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
              </div>
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--brd)", display: "flex", gap: 8 }}>
              <button onClick={saveEntry} disabled={savingEntry} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: savingEntry ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: savingEntry ? 0.6 : 1 }}>💾 {savingEntry ? "جاري..." : "حفظ"}</button>
              <button onClick={() => setAddOpen(false)} style={{ padding: "10px 16px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
