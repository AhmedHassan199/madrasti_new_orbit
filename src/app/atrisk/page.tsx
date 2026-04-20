"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { atRiskApi } from "@/lib/modules-api";

const LEVEL_META: Record<string, { ar: string; c: string; bg: string; brd: string }> = {
  critical: { ar: "خطر شديد",  c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
  high:     { ar: "خطر مرتفع", c: "#EA580C", bg: "#FFF7ED", brd: "#FDBA74" },
  medium:   { ar: "خطر متوسط", c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D" },
  low:      { ar: "مراقبة",    c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
};

const INT_STATUS: Record<string, { ar: string; ico: string; c: string; bg: string; brd: string }> = {
  done:    { ar: "تم",            ico: "✅", c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  failed:  { ar: "فشل",          ico: "❌", c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
  pending: { ar: "قيد الانتظار", ico: "⏳", c: "#6B7280", bg: "var(--bg3)", brd: "var(--brd)" },
};

interface Factor { ico: string; ar: string; c: string; bg: string; brd: string; }
interface TimelineEvent { date: string; ico: string; txt: string; type: string; c: string; }
interface Intervention { step: number; txt: string; status: string; date: string | null; }
interface AtRiskStudent {
  id: string; name: string; cls: string; grade: string;
  photo: string; risk: number; level: string;
  parent: string; parentPhone: string;
  absence: number; absDays: number; violations: number; avgGrade: number; lastSeen: string;
  factors: Factor[]; timeline: TimelineEvent[]; interventions: Intervention[];
  notes: string; aiSummary: string;
}


const STUDENTS_FALLBACK: AtRiskStudent[] = [];

function riskColor(r: number) {
  return r >= 80 ? "#DC2626" : r >= 60 ? "#EA580C" : r >= 40 ? "#B45309" : "#059669";
}

function apiToStudent(item: any): AtRiskStudent {
  return {
    id:          String(item.id ?? item.employee_id ?? Math.random()),
    name:        item.employee_name ?? item.name ?? item.student?.name ?? "—",
    cls:         item.group_name ?? item.group ?? item.student?.group?.name ?? "—",
    grade:       item.grade ?? item.student?.grade ?? "—",
    photo:       (item.employee_name ?? item.name ?? "؟").charAt(0),
    risk:        item.risk_score ?? item.risk ?? 0,
    level:       item.risk_level ?? item.level ?? "low",
    parent:      item.guardian_name ?? item.parent ?? "—",
    parentPhone: item.guardian_phone ?? item.parentPhone ?? "—",
    absence:     item.absence_rate ?? item.absence ?? 0,
    absDays:     item.absence_days ?? item.absDays ?? 0,
    violations:  item.violations_count ?? item.violations ?? 0,
    avgGrade:    item.average_grade ?? item.avgGrade ?? 0,
    lastSeen:    item.last_attendance ?? item.lastSeen ?? "—",
    factors:     Array.isArray(item.factors)
      ? item.factors.map((f: any) => ({
          ico:  f.icon ?? "⚠️",
          ar:   f.label ?? f.name ?? f.ar ?? String(f),
          c:    f.color ?? "#DC2626",
          bg:   f.bg ?? "#FEF2F2",
          brd:  f.border ?? "#FCA5A5",
        }))
      : [],
    timeline:      item.timeline ?? [],
    interventions: item.interventions ?? [],
    notes:        item.notes ?? "",
    aiSummary:    item.ai_summary ?? item.summary ?? "",
  };
}

export default function AtRiskPage() {
  useUi();

  const [students, setStudents]     = useState<AtRiskStudent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [sort, setSort]             = useState("risk");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab]   = useState("overview");
  const [newAction, setNewAction]   = useState("");
  const [noteText, setNoteText]     = useState("");
  const [busy, setBusy]             = useState(false);

  async function saveNotes() {
    if (!selectedId) return;
    setBusy(true);
    try {
      await atRiskApi.saveNotes(selectedId, noteText);
      setStudents(list => list.map(s => s.id === selectedId ? { ...s, notes: noteText } : s));
      alert("تم حفظ الملاحظات");
    } catch { alert("تعذّر الحفظ"); }
    finally { setBusy(false); }
  }

  async function addIntervention() {
    if (!selectedId || !newAction.trim()) return;
    setBusy(true);
    try {
      const r: any = await atRiskApi.addIntervention(selectedId, { description: newAction });
      const step = r.data ?? r;
      setStudents(list => list.map(s => s.id === selectedId ? {
        ...s,
        interventions: [...s.interventions, {
          step: step.step_no ?? s.interventions.length + 1,
          txt: step.description ?? newAction,
          status: step.status ?? "pending",
          date: step.due_date ?? null,
        }],
      } : s));
      setNewAction("");
    } catch { alert("تعذّر الإضافة"); }
    finally { setBusy(false); }
  }

  async function notifyParents(id: string) {
    try {
      await atRiskApi.notifyParents([id]);
      alert("تم إرسال الإشعار لولي الأمر");
    } catch { alert("تعذّر الإرسال"); }
  }

  useEffect(() => {
    setLoading(true);
    atRiskApi.list({})
      .then((r: any) => {
        const arr = r.data ?? r ?? [];
        setStudents(Array.isArray(arr) ? arr.map(apiToStudent) : []);
      })
      .catch((e: any) => setError(e.message ?? "خطأ في تحميل البيانات"))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    all:      students.length,
    critical: students.filter(s => s.level === "critical").length,
    high:     students.filter(s => s.level === "high").length,
    medium:   students.filter(s => s.level === "medium").length,
    low:      students.filter(s => s.level === "low").length,
  }), [students]);

  const doneInt = useMemo(() =>
    students.reduce((acc, s) => acc + s.interventions.filter((i: any) => i.status === "done").length, 0),
    [students]
  );

  const shown = useMemo(() => {
    let list = students.slice();
    if (filter !== "all") list = list.filter(s => s.level === filter);
    if (search) list = list.filter(s => s.name.includes(search) || s.cls.includes(search));
    if (sort === "risk")    list.sort((a, b) => b.risk - a.risk);
    if (sort === "absence") list.sort((a, b) => b.absence - a.absence);
    if (sort === "name")    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [students, filter, search, sort]);

  const selected = selectedId ? students.find(s => s.id === selectedId) || null : null;

  function openDrawer(id: string) {
    setSelectedId(id);
    setDrawerTab("overview");
    setDrawerOpen(true);
    const s = students.find(x => x.id === id);
    setNoteText(s?.notes ?? "");
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setSelectedId(null), 280);
  }

  const criticalStudents = students.filter(s => s.level === "critical");

  if (loading) return (
    <DashboardLayout title="الطلاب في خطر" subtitle="قائمة مُنشأة آلياً بواسطة الذكاء الاصطناعي">
      <p style={{ color: "var(--tx2)" }}>جاري التحميل…</p>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout title="الطلاب في خطر" subtitle="قائمة مُنشأة آلياً بواسطة الذكاء الاصطناعي">
      <p style={{ color: "#DC2626" }}>{error}</p>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="الطلاب في خطر" subtitle="قائمة مُنشأة آلياً بواسطة الذكاء الاصطناعي">
      <style>{`
        @keyframes arPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.65; } }
        .ar-pulse { animation: arPulse 1.4s ease-in-out infinite; }
        .ar-critical-alert { background: linear-gradient(135deg, #FEF2F2, #FEE2E2); border: 1.5px solid #FCA5A5; animation: arPulse 2s ease-in-out infinite; }
      `}</style>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div onClick={closeDrawer} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          zIndex: 200, backdropFilter: "blur(2px)",
        }} />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: drawerOpen ? 0 : "-500px",
        width: 480, height: "100vh", background: "var(--bg1)",
        borderLeft: "1.5px solid var(--brd)", boxShadow: "-4px 0 24px rgba(0,0,0,.13)",
        zIndex: 201, display: "flex", flexDirection: "column",
        transition: "right 0.28s cubic-bezier(.4,0,.2,1)",
      }}>
        {selected && (() => {
          const lm = LEVEL_META[selected.level];
          const rc = riskColor(selected.risk);
          return (
            <>
              {/* Drawer header */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ padding: "16px 18px 14px", background: lm.bg, borderBottom: "1px solid var(--brd)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: 14,
                        background: lm.brd, border: `2px solid ${lm.c}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, fontWeight: 900, color: lm.c,
                      }}>{selected.photo}</div>
                      {selected.level === "critical" && (
                        <div className="ar-pulse" style={{
                          position: "absolute", top: -3, right: -3,
                          width: 13, height: 13, borderRadius: "50%",
                          background: "#DC2626", border: "2px solid var(--bg1)",
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 5 }}>{selected.name}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{
                          fontSize: 11, padding: "2px 9px", borderRadius: 7, fontWeight: 700,
                          background: lm.bg, color: lm.c, border: `1px solid ${lm.brd}`,
                        }}>{lm.ar}</span>
                        <span style={{ fontSize: 11, color: "var(--tx2)" }}>فصل {selected.cls} · {selected.grade}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontSize: 30, fontWeight: 900, color: rc, fontFamily: "var(--fm)", lineHeight: 1 }}>
                        {selected.risk}%
                      </div>
                      <div style={{ fontSize: 9, color: "var(--tx2)" }}>مستوى الخطر</div>
                    </div>
                    <button onClick={closeDrawer} style={{
                      width: 30, height: 30, borderRadius: 8, border: "none",
                      background: "rgba(0,0,0,.08)", cursor: "pointer", fontSize: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, color: "var(--tx0)",
                    }}>×</button>
                  </div>
                  {/* Risk bar */}
                  <div style={{ marginTop: 11, height: 6, background: "var(--brd2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: rc, borderRadius: 3, width: `${selected.risk}%` }} />
                  </div>
                  {/* AI summary */}
                  <div style={{
                    marginTop: 8, padding: "7px 10px",
                    background: "rgba(0,0,0,.05)", borderRadius: 8,
                    fontSize: 11, color: "var(--tx1)", borderRight: `2px solid ${lm.c}`,
                  }}>
                    🤖 {selected.aiSummary}
                  </div>
                </div>
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--brd)", overflowX: "auto" }}>
                  {[
                    { id: "overview",     ar: "نظرة عامة" },
                    { id: "history",      ar: "السجل" },
                    { id: "intervention", ar: "التدخلات" },
                    { id: "notes",        ar: "الملاحظات" },
                  ].map(t => (
                    <button key={t.id} onClick={() => setDrawerTab(t.id)} style={{
                      padding: "9px 14px", border: "none", background: "none",
                      fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      color: drawerTab === t.id ? "#E8702A" : "var(--tx2)",
                      borderBottom: `2px solid ${drawerTab === t.id ? "#E8702A" : "transparent"}`,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}>{t.ar}</button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {drawerTab === "overview" && (
                  <div style={{ padding: "15px 18px" }}>
                    {/* Info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
                      {[
                        { l: "ولي الأمر",   v: selected.parent },
                        { l: "الجوال",      v: selected.parentPhone, mono: true },
                        { l: "آخر حضور",    v: selected.lastSeen },
                        { l: "أيام الغياب", v: `${selected.absDays} يوم (${selected.absence}%)`, danger: selected.absence > 60 },
                      ].map(row => (
                        <div key={row.l} style={{ padding: "8px 11px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)" }}>
                          <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 3 }}>{row.l}</div>
                          <div style={{
                            fontSize: 12.5, fontWeight: 700,
                            color: row.danger ? "#DC2626" : "var(--tx0)",
                            fontFamily: row.mono ? "monospace" : "inherit",
                          }}>{row.v}</div>
                        </div>
                      ))}
                    </div>
                    {/* KPI cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 14 }}>
                      {[
                        { l: "الغياب",       v: `${selected.absence}%`, c: selected.absence > 60 ? "#DC2626" : selected.absence > 30 ? "#EA580C" : "#F59E0B", bg: selected.absence > 60 ? "#FEF2F2" : "#FFF7ED" },
                        { l: "المخالفات",    v: String(selected.violations), c: selected.violations > 3 ? "#DC2626" : "#F59E0B", bg: selected.violations > 3 ? "#FEF2F2" : "#FFFBEB" },
                        { l: "معدل الدرجات", v: `${selected.avgGrade}%`, c: selected.avgGrade < 50 ? "#DC2626" : selected.avgGrade < 65 ? "#EA580C" : "#059669", bg: selected.avgGrade < 50 ? "#FEF2F2" : "#ECFDF5" },
                      ].map(k => (
                        <div key={k.l} style={{ padding: 11, background: k.bg, borderRadius: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "var(--fm)", color: k.c }}>{k.v}</div>
                          <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 3 }}>{k.l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Risk factors */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 7 }}>عوامل الخطر</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {selected.factors.map((f, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 9,
                            padding: "8px 11px", background: f.bg,
                            border: `1px solid ${f.brd}`, borderRadius: 9,
                          }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{f.ico}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: f.c }}>{f.ar}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Quick actions */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      {[
                        { label: "📞 استدعاء ولي الأمر", primary: true },
                        { label: "📨 إرسال إشعار",       primary: false },
                        { label: "📋 طباعة التقرير",      primary: false },
                        { label: "📅 جدولة جلسة",         primary: false },
                      ].map(btn => (
                        <button key={btn.label} style={{
                          padding: "8px 10px", borderRadius: 9,
                          border: btn.primary ? "none" : "1.5px solid var(--brd)",
                          background: btn.primary ? "#E8702A" : "var(--bg3)",
                          color: btn.primary ? "#fff" : "var(--tx1)",
                          cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                        }}>{btn.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {drawerTab === "history" && (
                  <div style={{ padding: "6px 0" }}>
                    {selected.timeline.map((ev, i) => (
                      <div key={i} style={{ display: "flex", gap: 11, padding: "10px 18px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: ev.c, marginTop: 4, flexShrink: 0 }} />
                          {i < selected.timeline.length - 1 && (
                            <div style={{ width: 2, background: "var(--brd)", flex: 1, minHeight: 20, margin: "3px auto" }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingBottom: i < selected.timeline.length - 1 ? 8 : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                            <span style={{ fontSize: 14 }}>{ev.ico}</span>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{ev.txt}</span>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--tx2)" }}>{ev.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {drawerTab === "intervention" && (
                  <div style={{ padding: "15px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 11 }}>خطة التدخل</div>
                    {selected.interventions.map(iv => {
                      const st = INT_STATUS[iv.status];
                      return (
                        <div key={iv.step} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          marginBottom: 8, padding: "10px 12px",
                          background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--brd)",
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            background: st.bg, color: st.c, border: `1px solid ${st.brd}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 800,
                          }}>{iv.step}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{iv.txt}</div>
                            {iv.date && <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{iv.date}</div>}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 9px",
                            borderRadius: 6, background: st.bg, color: st.c, border: `1px solid ${st.brd}`,
                            flexShrink: 0,
                          }}>{st.ico} {st.ar}</span>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)" }}>إضافة إجراء جديد</div>
                      <input
                        value={newAction}
                        onChange={e => setNewAction(e.target.value)}
                        placeholder="وصف الإجراء..."
                        onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }}
                        style={{
                          width: "100%", boxSizing: "border-box", padding: "8px 12px",
                          border: "1.5px solid var(--brd)", borderRadius: 9,
                          background: "var(--bg1)", fontFamily: "inherit", fontSize: 12,
                          color: "var(--tx0)", outline: "none",
                        }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={addIntervention} disabled={busy || !newAction.trim()} style={{
                          flex: 1, padding: "8px", borderRadius: 9, border: "none",
                          background: "#E8702A", color: "#fff", cursor: (busy || !newAction.trim()) ? "not-allowed" : "pointer",
                          fontFamily: "inherit", fontSize: 11, fontWeight: 700, opacity: (busy || !newAction.trim()) ? 0.5 : 1,
                        }}>+ إضافة</button>
                        <button onClick={() => window.print()} style={{
                          flex: 1, padding: "8px", borderRadius: 9,
                          border: "1.5px solid var(--brd)", background: "var(--bg3)",
                          color: "var(--tx1)", cursor: "pointer",
                          fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                        }}>🖨️ طباعة</button>
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === "notes" && (
                  <div style={{ padding: "15px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Past notes history */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 6 }}>📚 سجل الملاحظات السابقة</div>
                      {selected.timeline.filter((e: any) => e.type === "session" || e.type === "contact" || e.type === "note").length === 0 ? (
                        <div style={{ padding: "12px 14px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 9, fontSize: 11, color: "var(--tx2)", textAlign: "center" }}>
                          لا ملاحظات سابقة
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                          {selected.timeline.filter((e: any) => ["session", "contact", "note"].includes(e.type)).map((e: any, i: number) => (
                            <div key={i} style={{ padding: "8px 11px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--tx2)", marginBottom: 3 }}>
                                <span>{e.ico ?? "📝"}</span>
                                <span style={{ fontFamily: "var(--fm)" }}>{e.date}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--tx1)", lineHeight: 1.5 }}>{e.txt}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 6 }}>ملاحظات المرشد</div>
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }}
                        style={{
                          width: "100%", boxSizing: "border-box", height: 120,
                          padding: "10px 12px", border: "1.5px solid var(--brd)",
                          borderRadius: 9, background: "var(--bg1)",
                          fontFamily: "inherit", fontSize: 12.5, color: "var(--tx0)",
                          resize: "none", outline: "none", lineHeight: 1.6,
                        }}
                      />
                    </div>
                    <button onClick={saveNotes} disabled={busy} style={{
                      padding: "8px 16px", borderRadius: 9, border: "none",
                      background: "#E8702A", color: "#fff", cursor: busy ? "wait" : "pointer",
                      fontFamily: "inherit", fontSize: 12, fontWeight: 700, opacity: busy ? 0.6 : 1,
                    }}>💾 {busy ? "جاري..." : "حفظ الملاحظات"}</button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: "11px 18px", borderTop: "1px solid var(--brd)",
                display: "flex", gap: 7, flexShrink: 0,
              }}>
                <button onClick={() => notifyParents(selected.id)} style={{
                  flex: 1, padding: "8px", borderRadius: 9, border: "none",
                  background: "#E8702A", color: "#fff", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                }}>📨 إشعار ولي الأمر</button>
                <button onClick={closeDrawer} style={{
                  padding: "8px 14px", borderRadius: 9,
                  border: "1.5px solid var(--brd)", background: "var(--bg3)",
                  color: "var(--tx1)", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                }}>إغلاق</button>
              </div>
            </>
          );
        })()}
      </div>

      {/* Page header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14, flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>🚨 الطلاب في خطر</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
            قائمة مُنشأة آلياً بواسطة الذكاء الاصطناعي · آخر تحديث: اليوم 08:00 ص
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button style={{
            padding: "8px 14px", borderRadius: 9,
            border: "1.5px solid var(--brd)", background: "var(--bg3)",
            color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
          }}>📤 تصدير</button>
          <button style={{
            padding: "8px 14px", borderRadius: 9, border: "none",
            background: "#E8702A", color: "#fff", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, fontWeight: 700,
          }}>📨 إشعار الأولياء</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: students.length, l: "إجمالي الحالات", c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)", ico: "👥" },
          { v: counts.critical, l: "خطر شديد",       c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5",             ico: "🔴" },
          { v: counts.high,     l: "خطر مرتفع",      c: "#EA580C", bg: "#FFF7ED", brd: "#FDBA74",             ico: "🔶" },
          { v: doneInt,         l: "تدخلات منجزة",   c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0",             ico: "✅" },
        ].map(k => (
          <div key={k.l} style={{
            background: k.bg, border: `1px solid ${k.brd}`,
            borderRadius: 12, padding: "11px 13px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>{k.ico}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "var(--fm)", color: k.c, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical alert */}
      {criticalStudents.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", background: "#FEF2F2",
          border: "1.5px solid #FCA5A5", borderRadius: 11, marginBottom: 14,
        }}>
          <div className="ar-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} />
          <span style={{ fontSize: 13, flexShrink: 0 }}>🤖</span>
          <div style={{ flex: 1, fontSize: 12, color: "#991B1B" }}>
            <strong>تنبيه عاجل:</strong> {criticalStudents.map(s => s.name).join("، ")}
            {" — "}{criticalStudents.length === 1 ? "يحتاج" : "يحتاجون"} تدخلاً فورياً
          </div>
          <button
            onClick={() => openDrawer(criticalStudents[0].id)}
            style={{
              padding: "5px 12px", borderRadius: 7, border: "none",
              background: "#DC2626", color: "#fff", cursor: "pointer",
              fontFamily: "inherit", fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}
          >عرض الملف</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 13, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 260 }}>
          <svg style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)" }}
            width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }}
            placeholder="بحث بالاسم أو الفصل..."
            style={{
              width: "100%", boxSizing: "border-box", padding: "7px 10px", paddingRight: 30,
              border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)",
              fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[
            { id: "all",      ar: "الكل",      cnt: counts.all,      c: "#6B7280" },
            { id: "critical", ar: "خطر شديد",  cnt: counts.critical, c: "#DC2626" },
            { id: "high",     ar: "مرتفع",      cnt: counts.high,     c: "#EA580C" },
            { id: "medium",   ar: "متوسط",      cnt: counts.medium,   c: "#B45309" },
            { id: "low",      ar: "مراقبة",     cnt: counts.low,      c: "#059669" },
          ].map(f => {
            const on = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1.5px solid ${on ? f.c : "var(--brd)"}`,
                background: on ? f.c : "var(--bg1)",
                color: on ? "#fff" : "var(--tx2)",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {f.ar} <span style={{ fontSize: 10, opacity: 0.85 }}>({f.cnt})</span>
              </button>
            );
          })}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            padding: "6px 10px", border: "1.5px solid var(--brd)",
            borderRadius: 9, background: "var(--bg1)",
            fontFamily: "inherit", fontSize: 12, color: "var(--tx0)",
            outline: "none", cursor: "pointer", marginRight: "auto",
          }}
        >
          <option value="risk">ترتيب: مستوى الخطر</option>
          <option value="absence">ترتيب: نسبة الغياب</option>
          <option value="name">ترتيب: الاسم</option>
        </select>
      </div>

      {/* Student cards */}
      {shown.length === 0 ? (
        <div style={{
          padding: 60, textAlign: "center",
          background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14,
        }}>
          <div style={{ fontSize: 48, opacity: 0.25, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx2)" }}>لا توجد حالات مطابقة</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map(s => {
            const lm = LEVEL_META[s.level];
            const rc = riskColor(s.risk);
            const doneCount = s.interventions.filter(i => i.status === "done").length;
            const isSel = selectedId === s.id && drawerOpen;
            return (
              <div
                key={s.id}
                onClick={() => openDrawer(s.id)}
                style={{
                  background: "var(--bg1)",
                  border: `1.5px solid ${isSel ? "#E8702A" : "var(--brd)"}`,
                  borderRadius: 13, boxShadow: "var(--card-sh)",
                  cursor: "pointer", overflow: "hidden",
                }}
              >
                {/* Top accent bar */}
                <div style={{ height: 3, background: lm.c }} />
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 13, flexWrap: "wrap" }}>
                    {/* Avatar + risk */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{ position: "relative" }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 13,
                          background: lm.bg, border: `2px solid ${lm.brd}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, fontWeight: 900, color: lm.c,
                        }}>{s.photo}</div>
                        {s.level === "critical" && (
                          <div className="ar-pulse" style={{
                            position: "absolute", top: -3, right: -3,
                            width: 12, height: 12, borderRadius: "50%",
                            background: "#DC2626", border: "2px solid var(--bg1)",
                          }} />
                        )}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: rc, fontFamily: "var(--fm)", lineHeight: 1 }}>{s.risk}%</div>
                        <div style={{ fontSize: 8, color: "var(--tx2)", marginTop: 1 }}>مستوى الخطر</div>
                      </div>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800 }}>{s.name}</span>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 7, fontWeight: 700,
                          background: lm.bg, color: lm.c, border: `1px solid ${lm.brd}`,
                        }}>{lm.ar}</span>
                        <span style={{ fontSize: 10, color: "var(--tx2)" }}>فصل {s.cls} · {s.grade}</span>
                      </div>
                      {/* Risk bar */}
                      <div style={{ marginBottom: 9, height: 6, background: "var(--brd2)", borderRadius: 3, overflow: "hidden", maxWidth: 280 }}>
                        <div style={{ height: "100%", background: rc, borderRadius: 3, width: `${s.risk}%` }} />
                      </div>
                      {/* AI summary */}
                      <div style={{
                        fontSize: 11, color: "var(--tx2)", padding: "6px 9px",
                        background: "var(--bg3)", borderRadius: 7,
                        borderRight: `2px solid ${lm.c}`, marginBottom: 9, lineHeight: 1.5,
                      }}>🤖 {s.aiSummary}</div>
                      {/* Factor chips */}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {s.factors.map((f, i) => (
                          <span key={i} style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                            background: f.bg, color: f.c, border: `1px solid ${f.brd}`,
                          }}>{f.ico} {f.ar}</span>
                        ))}
                      </div>
                    </div>
                    {/* Stats + actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, minWidth: 130 }}>
                      {[
                        { l: "الغياب",    v: `${s.absence}%`,   c: s.absence > 60 ? "#DC2626" : s.absence > 30 ? "#EA580C" : "#F59E0B" },
                        { l: "المخالفات", v: String(s.violations), c: s.violations > 3 ? "#DC2626" : s.violations > 1 ? "#EA580C" : "#059669" },
                        { l: "المعدل",    v: `${s.avgGrade}%`,  c: s.avgGrade < 50 ? "#DC2626" : s.avgGrade < 65 ? "#EA580C" : "#059669" },
                      ].map(st => (
                        <div key={st.l} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "5px 9px", background: "var(--bg3)",
                          borderRadius: 7, border: "1px solid var(--brd)", gap: 8,
                        }}>
                          <span style={{ fontSize: 10, color: "var(--tx2)" }}>{st.l}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: st.c }}>{st.v}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                        <button
                          onClick={e => { e.stopPropagation(); openDrawer(s.id); }}
                          style={{
                            flex: 1, padding: "5px 8px", borderRadius: 8, border: "none",
                            background: "#E8702A", color: "#fff", cursor: "pointer",
                            fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                          }}
                        >📂 الملف</button>
                        <button
                          onClick={e => { e.stopPropagation(); }}
                          style={{
                            padding: "5px 8px", borderRadius: 8,
                            border: "1.5px solid var(--brd)", background: "var(--bg3)",
                            color: "var(--tx1)", cursor: "pointer",
                            fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                          }}
                        >📨</button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Footer */}
                <div style={{
                  padding: "8px 16px", background: "var(--bg3)",
                  borderTop: "1px solid var(--brd)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                }}>
                  <span style={{ fontSize: 10, color: "var(--tx2)" }}>آخر حضور: <strong>{s.lastSeen}</strong></span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, maxWidth: 200 }}>
                    <span style={{ fontSize: 9, color: "var(--tx2)", flexShrink: 0 }}>التدخلات:</span>
                    <div style={{ flex: 1, height: 5, background: "var(--brd2)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: "#059669", borderRadius: 3,
                        width: `${s.interventions.length > 0 ? Math.round(doneCount / s.interventions.length * 100) : 0}%`,
                      }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", flexShrink: 0 }}>
                      {doneCount}/{s.interventions.length}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--tx2)" }}>
                    ولي الأمر: <strong>{s.parent.split(" ").slice(-1)[0]}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
