"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { employeesApi } from "@/lib/employees-api";

/* ═══════════════════════════════════════
   STATUS CONFIG — matches HTML reference
═══════════════════════════════════════ */
const SC: Record<string, { ar: string; en: string; bg: string; c: string; brd: string; dot: string }> = {
  honor:   { ar: "متميز",  en: "Honor",   bg: "#F0FDF4", c: "#16A34A", brd: "#86EFAC", dot: "#22C55E" },
  normal:  { ar: "طبيعي",  en: "Normal",  bg: "#F3F4F6", c: "#6B7280", brd: "#E5E7EB", dot: "#9CA3AF" },
  monitor: { ar: "متابعة", en: "Monitor", bg: "#FFFBEB", c: "#B45309", brd: "#FCD34D", dot: "#F59E0B" },
  risk:    { ar: "خطر",    en: "Risk",    bg: "#FEF2F2", c: "#DC2626", brd: "#FCA5A5", dot: "#EF4444" },
};

const TABS = [
  { id: "overview",   ar: "نظرة عامة",          en: "Overview" },
  { id: "academic",   ar: "الأكاديمي",          en: "Academic" },
  { id: "attendance", ar: "الحضور",              en: "Attendance" },
  { id: "behavior",   ar: "السلوك",              en: "Behavior" },
  { id: "comments",   ar: "تعليقات المعلمين",    en: "Teacher Notes" },
  { id: "timeline",   ar: "السجل الكامل",        en: "Full Log" },
] as const;
type TabId = typeof TABS[number]["id"];

/* Deterministic avatar color based on student id */
const AV_COLORS = ["#E8702A", "#3B82F6", "#EF4444", "#8B5CF6", "#14B8A6", "#F59E0B", "#10B981", "#6366F1", "#EC4899"];
function avColor(id: any): string {
  const s = String(id ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

/* Status inferred from attendance + violation counts */
function inferStatus(s: any): string {
  if (s.status && SC[s.status]) return s.status;
  const att = s.attendance_rate ?? s.att ?? 0;
  const viol = s.violations ?? s.viol ?? 0;
  const gpa = s.gpa ?? s.grade ?? 0;
  if (att >= 90 && viol === 0 && gpa >= 85) return "honor";
  if (att < 60 || viol >= 3)                return "risk";
  if (att < 80 || viol >= 1)                return "monitor";
  return "normal";
}

function normalizeStudent(raw: any): any {
  const id = String(raw.id ?? raw.identifier ?? Math.random());
  return {
    raw,
    id,
    ar:       raw.name ?? raw.ar ?? raw.full_name ?? "—",
    en:       raw.en ?? raw.name_en ?? "",
    cls:      raw.class_name ?? raw.cls ?? raw.grade_name ?? raw.sub_group?.name ?? "—",
    stage:    raw.stage ?? raw.level ?? "—",
    av:       raw.av ?? raw.color ?? avColor(id),
    att:      Number(raw.attendance_rate ?? raw.att ?? 0),
    gpa:      Number(raw.gpa ?? raw.grade ?? 0),
    viol:     Number(raw.violations ?? raw.viol ?? 0),
    status:   inferStatus(raw),
    phone:    raw.phone ?? raw.mobile ?? "—",
    guardian: raw.guardian_name ?? raw.guardian ?? "—",
    guardPhone: raw.guardian_phone ?? raw.guardPhone ?? "—",
    dob:      raw.dob ?? raw.birth_date ?? "—",
    addr:     raw.address ?? raw.addr ?? "—",
    notes:    raw.notes ?? "",
    commentsCount: Number(raw.comments_count ?? 0),
  };
}

export default function StudentsPage() {
  const { lang } = useUi();
  const isAr = lang === "ar";

  const [data, setData]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [clsFilter, setClsFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView]             = useState<"grid" | "list">("grid");

  /* drawer + add modal */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [tab, setTab]               = useState<TabId>("overview");
  const [addOpen, setAddOpen]       = useState(false);
  const [noteOpen, setNoteOpen]     = useState(false);
  const [saving, setSaving]         = useState(false);

  /* Excel import + format modals */
  const [importBusy, setImportBusy] = useState(false);
  const [fmtOpen, setFmtOpen]       = useState(false);
  const [fmtBusy, setFmtBusy]       = useState(false);
  const [fmtFile, setFmtFile]       = useState<File | null>(null);
  const [fmtClass, setFmtClass]     = useState("");
  const [fmtGroup, setFmtGroup]     = useState("");
  const [groupsList, setGroupsList] = useState<any[]>([]);

  useEffect(() => {
    employeesApi.groups({ type: "student" })
      .then((r: any) => setGroupsList(Array.isArray(r) ? r : (r?.data ?? [])))
      .catch(() => setGroupsList([]));
  }, []);

  async function onImportFile(file: File) {
    setImportBusy(true);
    try {
      await employeesApi.import(file, "student");
      const r: any = await employeesApi.list({ role: "student", per_page: 200 });
      const arr = r.data ?? r.employees ?? r ?? [];
      setData((Array.isArray(arr) ? arr : []).map(normalizeStudent));
      alert("📥 تم استيراد الطلاب بنجاح");
    } catch (e: any) {
      alert("تعذّر الاستيراد: " + (e?.message ?? ""));
    } finally { setImportBusy(false); }
  }

  async function onFormatExcel() {
    if (!fmtFile || !fmtClass.trim() || !fmtGroup.trim()) {
      alert("من فضلك اختر الملف والفصل والمجموعة");
      return;
    }
    setFmtBusy(true);
    try {
      const blob = await employeesApi.formatExcel(fmtFile, fmtClass.trim(), fmtGroup.trim());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "formatted_students.xlsx"; a.click();
      URL.revokeObjectURL(url);
      setFmtOpen(false); setFmtFile(null); setFmtClass(""); setFmtGroup("");
    } catch (e: any) {
      alert("تعذّر ضبط الملف: " + (e?.message ?? ""));
    } finally { setFmtBusy(false); }
  }

  /* per-student detail state (loaded on drawer open) */
  const [detail, setDetail] = useState<{ grades: any[]; violations: any[]; att: any; timeline: any[]; comments: any[] }>({
    grades: [], violations: [], att: { summary: {}, log: [] }, timeline: [], comments: [],
  });

  /* add-student form */
  const [newStu, setNewStu] = useState<any>({
    name: "", father: "", family: "", national_id: "", dob: "", nationality: "سعودي",
    class_name: "", noor_id: "", guardian_name: "", guardian_phone: "", relation: "الأب",
  });

  /* add-comment form */
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<"positive" | "concern" | "neutral">("neutral");

  useEffect(() => {
    setLoading(true);
    employeesApi.list({ role: "student", per_page: 200 })
      .then((r: any) => {
        const arr = r.data ?? r.employees ?? r ?? [];
        setData((Array.isArray(arr) ? arr : []).map(normalizeStudent));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const classes = useMemo(() => [...new Set(data.map(s => s.cls).filter(c => c && c !== "—"))].sort(), [data]);
  const counts  = useMemo(() => {
    const c = { honor: 0, normal: 0, monitor: 0, risk: 0 };
    data.forEach(s => { if (s.status in c) (c as any)[s.status]++; });
    return c;
  }, [data]);

  const filtered = useMemo(() => data.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (clsFilter !== "all" && s.cls !== clsFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.ar.toLowerCase().includes(q) && !String(s.en ?? "").toLowerCase().includes(q) && !`STU-${s.id}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [data, statusFilter, clsFilter, search]);

  const active = activeId ? data.find(s => s.id === activeId) ?? null : null;

  const openStu = (id: string) => {
    setActiveId(id);
    setTab("overview");
    setDrawerOpen(true);
    loadDetail(id);
  };

  const closeDrawer = () => { setDrawerOpen(false); };

  async function loadDetail(id: string) {
    try {
      const [gr, vi, att, tl, cm] = await Promise.all([
        employeesApi.grades(id).catch(() => ({ data: [] })),
        employeesApi.violations(id).catch(() => ({ data: [] })),
        employeesApi.attendanceDetailed(id).catch(() => ({ data: { summary: {}, log: [] } })),
        employeesApi.timeline(id).catch(() => ({ data: [] })),
        employeesApi.comments(id).catch(() => ({ data: [] })),
      ]);
      setDetail({
        grades:     (gr as any).data ?? gr ?? [],
        violations: (vi as any).data ?? vi ?? [],
        att:        (att as any).data ?? att ?? { summary: {}, log: [] },
        timeline:   (tl as any).data ?? tl ?? [],
        comments:   (cm as any).data ?? cm ?? [],
      });
    } catch { /* silent */ }
  }

  function navStu(dir: 1 | -1) {
    if (!active) return;
    const idx = data.findIndex(s => s.id === active.id);
    const next = data[idx + dir];
    if (next) { setActiveId(next.id); loadDetail(next.id); }
  }

  async function saveStudent() {
    const fullName = [newStu.name, newStu.father, newStu.family].filter(Boolean).join(" ");
    if (!fullName) return alert("الرجاء إدخال الاسم");
    const identifier = newStu.national_id || newStu.noor_id || `STU-${Date.now()}`;
    setSaving(true);
    try {
      const r: any = await employeesApi.create({
        name: fullName,
        identifier,
        national_id: newStu.national_id || null,
        birth_date: newStu.dob || null,
        class_number: newStu.class_name || null,
        type: "student",
      });
      const created = r.data ?? r;
      // If guardian info provided, add guardian
      if (newStu.guardian_name && created?.id) {
        try {
          await employeesApi.addGuardian(created.id, {
            name: newStu.guardian_name,
            phone: newStu.guardian_phone || null,
            relationship: newStu.relation || null,
          });
        } catch { /* silent */ }
      }
      setData(p => [normalizeStudent(created), ...p]);
      setAddOpen(false);
      setNewStu({ name: "", father: "", family: "", national_id: "", dob: "", nationality: "سعودي", class_name: "", noor_id: "", guardian_name: "", guardian_phone: "", relation: "الأب" });
    } catch (e: any) {
      alert("تعذّر الحفظ: " + (e?.message ?? ""));
    } finally { setSaving(false); }
  }

  async function saveComment() {
    if (!active || !noteText.trim()) return;
    setSaving(true);
    try {
      await employeesApi.addComment(active.id, { content: noteText, category: noteType });
      const cm: any = await employeesApi.comments(active.id);
      setDetail(d => ({ ...d, comments: cm.data ?? cm ?? [] }));
      setNoteText(""); setNoteOpen(false);
    } catch { alert("تعذّر الحفظ"); }
    finally { setSaving(false); }
  }

  function printReport() {
    if (!active) return;
    setTimeout(() => window.print(), 50);
  }

  function onMessageParent() {
    if (!active) return;
    alert(isAr ? `💬 سيتم فتح نافذة الرسائل — ولي أمر ${active.ar}` : `💬 Opening messaging for parent of ${active.en || active.ar}`);
  }

  function onIssueHonor() {
    if (!active) return;
    alert(isAr ? `🏆 تم إصدار شهادة تكريم للطالب ${active.ar}` : `🏆 Honor certificate issued for ${active.en || active.ar}`);
  }

  function onSummonParent() {
    if (!active) return;
    if (confirm(isAr ? `📋 استدعاء ولي أمر ${active.ar}؟` : "Summon parent?")) {
      alert(isAr ? "✓ تم تسجيل الاستدعاء" : "✓ Summon recorded");
    }
  }

  return (
    <DashboardLayout title={isAr ? "الطلاب" : "Students"} subtitle={`${data.length} ${isAr ? "طالب مسجل" : "enrolled"}`}>
      <style>{`
        @keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
        .stu-row-hover:hover { background: var(--bg3); }
        .stu-comment { background: var(--bg3); border: 1px solid var(--brd); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
        .stu-tl-item { display: flex; gap: 10px; padding: 8px 0; }
        .stu-tl-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .stu-tl-title { font-size: 12.5px; font-weight: 700; }
        .stu-tl-sub { font-size: 10px; color: var(--tx2); margin-top: 2px; }
        .stu-sec-title { font-size: 12px; font-weight: 800; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
      `}</style>

      {/* ══ FORMAT EXCEL MODAL ══ */}
      {fmtOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={() => setFmtOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: "95vw", background: "var(--bg1)", borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,.25)", border: "1px solid var(--brd)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>📑 {isAr ? "ضبط ملف الإكسيل" : "Format Excel File"}</div>
              <button onClick={() => setFmtOpen(false)} style={{ width: 28, height: 28, border: "1px solid var(--brd)", borderRadius: 7, background: "var(--bg3)", cursor: "pointer", fontSize: 15 }}>×</button>
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--tx2)", marginBottom: 5, fontWeight: 700 }}>{isAr ? "ملف الإكسيل" : "Excel File"}</label>
                <input type="file" accept=".xlsx,.xls" onChange={e => setFmtFile(e.target.files?.[0] ?? null)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 7, background: "var(--bg2)", fontSize: 12, color: "var(--tx1)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--tx2)", marginBottom: 5, fontWeight: 700 }}>{isAr ? "الفصل" : "Class Number"}</label>
                <input type="text" value={fmtClass} onChange={e => setFmtClass(e.target.value)} placeholder="1"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 7, background: "var(--bg2)", fontSize: 13, color: "var(--tx1)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--tx2)", marginBottom: 5, fontWeight: 700 }}>{isAr ? "المجموعة" : "Group"}</label>
                <select value={fmtGroup} onChange={e => setFmtGroup(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 7, background: "var(--bg2)", fontSize: 13, color: "var(--tx1)" }}>
                  <option value="">— {isAr ? "اختر مجموعة" : "Select group"} —</option>
                  {groupsList.map((g: any) => <option key={g.id} value={g.code ?? g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--brd)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setFmtOpen(false)} style={{ padding: "8px 16px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={onFormatExcel} disabled={fmtBusy} style={{ padding: "8px 20px", background: fmtBusy ? "#94A3B8" : "#0EA5E9", color: "#fff", border: 0, borderRadius: 7, fontSize: 12, fontWeight: 800, cursor: fmtBusy ? "not-allowed" : "pointer" }}>
                {fmtBusy ? (isAr ? "جاري…" : "Working…") : (isAr ? "تنفيذ وتنزيل" : "Format & Download")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD STUDENT MODAL ══ */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={() => setAddOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", background: "var(--bg1)", borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,.25)", border: "1px solid var(--brd)" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>👤 {isAr ? "إضافة طالب جديد" : "Add New Student"}</div>
              <button onClick={() => setAddOpen(false)} style={{ width: 30, height: 30, border: "1px solid var(--brd)", borderRadius: 8, background: "var(--bg3)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label={isAr ? "الاسم الأول" : "First Name"} value={newStu.name} onChange={v => setNewStu((p: any) => ({ ...p, name: v }))} placeholder="محمد" />
                <Field label={isAr ? "اسم الأب" : "Father's Name"} value={newStu.father} onChange={v => setNewStu((p: any) => ({ ...p, father: v }))} placeholder="عبدالله" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label={isAr ? "اسم العائلة" : "Family Name"} value={newStu.family} onChange={v => setNewStu((p: any) => ({ ...p, family: v }))} placeholder="الغامدي" />
                <Field label={isAr ? "رقم الهوية" : "ID Number"} value={newStu.national_id} onChange={v => setNewStu((p: any) => ({ ...p, national_id: v }))} placeholder="1xxxxxxxxx" mono />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label={isAr ? "تاريخ الميلاد" : "Date of Birth"} value={newStu.dob} onChange={v => setNewStu((p: any) => ({ ...p, dob: v }))} type="date" />
                <Select label={isAr ? "الجنسية" : "Nationality"} value={newStu.nationality} onChange={v => setNewStu((p: any) => ({ ...p, nationality: v }))} options={["سعودي", "مقيم", "غير ذلك"]} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Select label={isAr ? "الصف" : "Class"} value={newStu.class_name} onChange={v => setNewStu((p: any) => ({ ...p, class_name: v }))} options={["1/أ","1/ب","2/أ","2/ب","3/أ","3/ب","4/أ","4/ب","5/أ"]} />
                <Field label={isAr ? "رقم جلوس نور" : "Noor ID"} value={newStu.noor_id} onChange={v => setNewStu((p: any) => ({ ...p, noor_id: v }))} placeholder="اختياري" mono />
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--brd)", margin: "4px 0" }} />
              <div style={{ fontSize: 12, fontWeight: 700 }}>{isAr ? "بيانات ولي الأمر" : "Parent Info"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label={isAr ? "اسم ولي الأمر" : "Parent Name"} value={newStu.guardian_name} onChange={v => setNewStu((p: any) => ({ ...p, guardian_name: v }))} placeholder="عبدالله الغامدي" />
                <Field label={isAr ? "الجوال" : "Mobile"} value={newStu.guardian_phone} onChange={v => setNewStu((p: any) => ({ ...p, guardian_phone: v }))} placeholder="05xxxxxxxx" mono />
              </div>
              <Select label={isAr ? "علاقته بالطالب" : "Relation"} value={newStu.relation} onChange={v => setNewStu((p: any) => ({ ...p, relation: v }))} options={["الأب","الأم","الأخ","العم","الجد","وصي قانوني"]} />
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--brd)", display: "flex", gap: 8 }}>
              <button onClick={() => setAddOpen(false)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>{isAr ? "إلغاء" : "Cancel"}</button>
              <button onClick={saveStudent} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>💾 {saving ? (isAr ? "جاري..." : "Saving...") : (isAr ? "حفظ وإضافة" : "Save & Add")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD-COMMENT MODAL ══ */}
      {noteOpen && active && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={() => setNoteOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: "95vw", background: "var(--bg1)", borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,.25)", border: "1px solid var(--brd)", padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>✏️ {isAr ? `ملاحظة على ${active.ar}` : `Note on ${active.en || active.ar}`}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {(["positive","neutral","concern"] as const).map(k => (
                <button key={k} onClick={() => setNoteType(k)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid " + (noteType === k ? "#E8702A" : "var(--brd)"), background: noteType === k ? "#FEF3E8" : "var(--bg1)", color: noteType === k ? "#E8702A" : "var(--tx1)", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
                  {k === "positive" ? "🟢 إيجابي" : k === "concern" ? "🔴 مخاوف" : "⚪ محايد"}
                </button>
              ))}
            </div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={isAr ? "اكتب الملاحظة..." : "Write note..."} rows={5} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setNoteOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>{isAr ? "إلغاء" : "Cancel"}</button>
              <button onClick={saveComment} disabled={saving || !noteText.trim()} style={{ flex: 2, padding: "9px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: (saving || !noteText.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, opacity: (saving || !noteText.trim()) ? 0.5 : 1 }}>💾 {isAr ? "حفظ الملاحظة" : "Save Note"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PROFILE DRAWER ══ */}
      {drawerOpen && active && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,.45)" }} onClick={closeDrawer} />
          <div style={{ width: 540, maxWidth: "95vw", background: "var(--bg1)", boxShadow: "-4px 0 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}>
            {/* HERO */}
            <div style={{ background: `linear-gradient(135deg, ${active.av} 0%, ${active.av}cc 100%)`, padding: "20px 22px", position: "relative", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: 15, background: "rgba(255,255,255,.25)", border: "1.5px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{(active.ar ?? "؟").charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>{isAr ? active.ar : (active.en || active.ar)}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 3 }}>STU-{String(active.id).padStart(3, "0")} · {active.cls} · {active.stage}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.2)", color: "#fff" }}>
                      {SC[active.status]?.ar ?? active.status}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.2)", color: "#fff" }}>
                      {isAr ? `حضور ${active.att}%` : `Att. ${active.att}%`}
                    </span>
                    {active.viol > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(239,68,68,.4)", color: "#fff" }}>{active.viol} {isAr ? "مخالفة" : "viol."}</span>
                    )}
                  </div>
                </div>
                <button onClick={closeDrawer} style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
              </div>
              {/* Quick stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "rgba(255,255,255,.15)", borderRadius: 10, overflow: "hidden" }}>
                {[
                  [`${active.att}%`, isAr ? "الحضور" : "Att."],
                  [`${active.gpa}%`, isAr ? "المعدل" : "GPA"],
                  [String(active.viol), isAr ? "مخالفات" : "Viol."],
                  [String(detail.comments.length), isAr ? "تعليقات" : "Notes"],
                ].map(([v, l], i) => (
                  <div key={i} style={{ padding: "10px 8px", textAlign: "center", background: "rgba(255,255,255,.1)" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "var(--fm)" }}>{v}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.75)", marginTop: 2, fontWeight: 600 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TABS */}
            <div style={{ display: "flex", gap: 2, padding: "6px 10px", borderBottom: "1px solid var(--brd)", overflowX: "auto", flexShrink: 0 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "7px 12px", border: "none", background: tab === t.id ? "#FEF3E8" : "transparent",
                  color: tab === t.id ? "#E8702A" : "var(--tx2)", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", borderRadius: 7,
                }}>{isAr ? t.ar : t.en}</button>
              ))}
            </div>

            {/* BODY */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
              {tab === "overview" && <OverviewTab s={active} comments={detail.comments} isAr={isAr} onGoComments={() => setTab("comments")} />}
              {tab === "academic"   && <AcademicTab s={active} grades={detail.grades} isAr={isAr} />}
              {tab === "attendance" && <AttendanceTab att={detail.att} isAr={isAr} />}
              {tab === "behavior"   && <BehaviorTab s={active} violations={detail.violations} isAr={isAr} />}
              {tab === "comments"   && <CommentsTab comments={detail.comments} isAr={isAr} onAdd={() => setNoteOpen(true)} />}
              {tab === "timeline"   && <TimelineTab events={detail.timeline} isAr={isAr} />}
            </div>

            {/* FOOTER ACTIONS */}
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--brd)", display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
              <button onClick={printReport} className="btn btn-p btn-sm" style={{ gap: 5 }}>🖨️ {isAr ? "طباعة" : "Print"}</button>
              {active.status === "honor" && (
                <button onClick={onIssueHonor} className="btn btn-sm" style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #86EFAC", padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>🏆 {isAr ? "تكريم" : "Honor"}</button>
              )}
              {(active.status === "risk" || active.status === "monitor") && (
                <button onClick={onSummonParent} className="btn btn-sm" style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5", padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>📋 {isAr ? "استدعاء" : "Summon"}</button>
              )}
              <button onClick={onMessageParent} className="btn btn-g btn-sm">💬 {isAr ? "رسالة" : "Message"}</button>
              <button onClick={() => setNoteOpen(true)} className="btn btn-g btn-sm">✏️ {isAr ? "ملاحظة" : "Note"}</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => navStu(-1)} className="btn btn-sm" style={{ background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>‹</button>
              <button onClick={() => navStu(1)}  className="btn btn-sm" style={{ background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>›</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAGE HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{isAr ? "الطلاب" : "Students"}</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{data.length} {isAr ? "طالب مسجل" : "enrolled"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 3, background: "var(--bg3)", borderRadius: 8, padding: 3, border: "1px solid var(--brd)" }}>
            {(["grid", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} title={v === "grid" ? "بطاقات" : "قائمة"} style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, background: view === v ? "var(--bg1)" : "transparent", color: view === v ? "#E8702A" : "var(--tx2)", boxShadow: view === v ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
                {v === "grid" ? "⊞" : "☰"}
              </button>
            ))}
          </div>
          <button className="btn btn-g btn-sm">⬇ {isAr ? "تصدير" : "Export"}</button>
          <button onClick={() => setFmtOpen(true)} style={{ padding: "7px 12px", background: "#0EA5E9", color: "#fff", border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            📑 {isAr ? "ضبط ملف الإكسيل" : "Format Excel"}
          </button>
          <label style={{ padding: "7px 12px", background: importBusy ? "#94A3B8" : "#0891B2", color: "#fff", border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: importBusy ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
            📥 {importBusy ? (isAr ? "جاري…" : "Loading…") : "Import"}
            <input type="file" accept=".xlsx,.xls" disabled={importBusy} onChange={e => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.currentTarget.value = ""; }} style={{ display: "none" }} />
          </label>
          <button onClick={() => setAddOpen(true)} className="btn btn-p">+ {isAr ? "إضافة طالب" : "Add Student"}</button>
        </div>
      </div>

      {/* ══ STATUS CARDS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {(["honor","normal","monitor","risk"] as const).map(k => {
          const s = SC[k]; const n = counts[k];
          const ico = { honor: "🏆", normal: "✓", monitor: "👁", risk: "⚠️" }[k];
          const isActive = statusFilter === k;
          return (
            <div key={k} onClick={() => setStatusFilter(isActive ? "all" : k)}
              style={{ background: s.bg, border: `1px solid ${isActive ? s.c : s.brd}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", transition: "all .18s", boxShadow: "var(--card-sh)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{n}</div>
                <div style={{ fontSize: 20, opacity: 0.7 }}>{ico}</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>{isAr ? s.ar : s.en}</div>
            </div>
          );
        })}
      </div>

      {/* ══ SEARCH + FILTERS ══ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200, background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 10, padding: "8px 12px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, border: "none", background: "none", fontSize: 13, fontFamily: "inherit", color: "var(--tx0)", outline: "none" }} placeholder={isAr ? "ابحث بالاسم أو رقم الطالب..." : "Search by name or ID..."} />
          {search && <span onClick={() => setSearch("")} style={{ cursor: "pointer", color: "var(--tx2)", fontSize: 15 }}>✕</span>}
        </div>
        <select className="fs" style={{ width: "auto", padding: "8px 12px" }} value={clsFilter} onChange={e => setClsFilter(e.target.value)}>
          <option value="all">{isAr ? "كل الصفوف" : "All Classes"}</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="fs" style={{ width: "auto", padding: "8px 12px" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">{isAr ? "كل الحالات" : "All Status"}</option>
          <option value="honor">{isAr ? "متميز" : "Honor"}</option>
          <option value="normal">{isAr ? "طبيعي" : "Normal"}</option>
          <option value="monitor">{isAr ? "متابعة" : "Monitor"}</option>
          <option value="risk">{isAr ? "في خطر" : "At Risk"}</option>
        </select>
        {(search || clsFilter !== "all" || statusFilter !== "all") && (
          <button className="btn btn-g btn-sm" onClick={() => { setSearch(""); setClsFilter("all"); setStatusFilter("all"); }}>✕ {isAr ? "مسح" : "Clear"}</button>
        )}
      </div>

      <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 10 }}>
        {isAr ? `عرض ${filtered.length} من ${data.length} طالب` : `Showing ${filtered.length} of ${data.length}`}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
          {[...Array(8)].map((_, i) => <div key={i} style={{ height: 160, background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, opacity: 0.4 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--tx2)" }}>
          <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>👨‍🎓</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{isAr ? "لا يوجد طلاب في هذا التصنيف" : "No students match"}</div>
        </div>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
          {filtered.map(s => {
            const sc = SC[s.status] ?? SC.normal;
            return (
              <div key={s.id} onClick={() => openStu(s.id)}
                style={{ background: "var(--bg1)", border: `1.5px solid ${sc.brd}`, borderRadius: 14, padding: 14, cursor: "pointer", position: "relative", boxShadow: "var(--card-sh)" }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,.1)"; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "var(--card-sh)"; }}>
                {(s.status === "risk" || s.status === "monitor") && (
                  <div style={{ position: "absolute", top: 10, left: 10, width: 8, height: 8, borderRadius: "50%", background: sc.dot, animation: "pulseDot 1.5s infinite" }} />
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: s.av, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.ar.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isAr ? s.ar : (s.en || s.ar)}</div>
                    <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 1, fontFamily: "var(--fm)" }}>STU-{String(s.id).padStart(3, "0")} · {s.cls}</div>
                  </div>
                </div>
                <ProgressBar value={s.att} label={isAr ? "حضور" : "Att."} />
                <ProgressBar value={s.gpa} label={isAr ? "معدل" : "GPA"} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: sc.bg, color: sc.c, border: `1px solid ${sc.brd}` }}>{isAr ? sc.ar : sc.en}</span>
                  {s.viol > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#FEE2E2", color: "#DC2626" }}>{s.viol} {isAr ? "مخالفة" : "viol."}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg3)" }}>
                  {[isAr ? "الطالب" : "Student", isAr ? "الصف" : "Class", isAr ? "الحضور" : "Att.", isAr ? "المعدل" : "GPA", isAr ? "مخالفات" : "Viol.", isAr ? "الحالة" : "Status", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 800, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const sc = SC[s.status] ?? SC.normal;
                  return (
                    <tr key={s.id} className="stu-row-hover" onClick={() => openStu(s.id)} style={{ cursor: "pointer" }}>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: s.av, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{s.ar.charAt(0)}</div>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{isAr ? s.ar : (s.en || s.ar)}</div>
                            <div style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)" }}>STU-{String(s.id).padStart(3, "0")}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)", fontFamily: "var(--fm)", fontSize: 12 }}>{s.cls}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)" }}><InlineBar value={s.att} /></td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)" }}><InlineBar value={s.gpa} color={s.gpa > 85 ? "#22C55E" : s.gpa > 70 ? "#E8702A" : "#EF4444"} txc={s.gpa > 85 ? "#16A34A" : s.gpa > 70 ? "#E8702A" : "#DC2626"} /></td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)", fontFamily: "var(--fm)", fontWeight: 700, color: s.viol > 1 ? "#DC2626" : s.viol ? "#B45309" : "var(--tx2)" }}>{s.viol || "—"}</td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: sc.bg, color: sc.c, border: `1px solid ${sc.brd}` }}>{isAr ? sc.ar : sc.en}</span>
                      </td>
                      <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => openStu(s.id)} className="btn btn-sm" style={{ background: "#FEF3E8", color: "#E8702A", border: "1px solid rgba(232,112,42,.2)", padding: "4px 10px", fontSize: 11 }}>{isAr ? "الملف" : "Profile"}</button>
                          {(s.status === "risk" || s.status === "monitor") && (
                            <button onClick={onSummonParent} className="btn btn-sm" style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5", padding: "4px 9px", fontSize: 11 }}>{isAr ? "استدعاء" : "Summon"}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ─── Small reusable components ─── */
function ProgressBar({ value, label }: { value: number; label: string }) {
  const color = value > 85 ? "#22C55E" : value > 70 ? "#E8702A" : value > 60 ? "#F59E0B" : "#EF4444";
  const tc = value > 80 ? "#16A34A" : value > 60 ? "#B45309" : "#DC2626";
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: "var(--tx2)" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--fm)", color: tc }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2 }}>
        <div style={{ height: "100%", borderRadius: 2, width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </div>
    </div>
  );
}

function InlineBar({ value, color, txc }: { value: number; color?: string; txc?: string }) {
  const c = color ?? (value > 80 ? "#22C55E" : value > 60 ? "#F59E0B" : "#EF4444");
  const t = txc ?? (value > 80 ? "#16A34A" : value > 60 ? "#B45309" : "#DC2626");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 44, height: 5, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, width: `${Math.max(0, Math.min(100, value))}%`, background: c }} />
      </div>
      <span style={{ fontFamily: "var(--fm)", fontSize: 11, fontWeight: 700, color: t }}>{value}%</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", mono }: any) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: mono ? "var(--fm)" : "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
    </div>
  );
}

function Select({ label, value, onChange, options }: any) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }}>
        {(options as string[]).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ─── Drawer tabs ─── */
function OverviewTab({ s, comments, isAr, onGoComments }: any) {
  return (
    <>
      <div className="stu-sec-title">👤 {isAr ? "المعلومات الشخصية" : "Personal Info"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          [isAr ? "رقم الطالب" : "Student ID", `STU-${s.id}`],
          [isAr ? "الصف" : "Class", `${s.cls} · ${s.stage}`],
          [isAr ? "تاريخ الميلاد" : "Date of Birth", s.dob],
          [isAr ? "ولي الأمر" : "Guardian", s.guardian],
          [isAr ? "هاتف ولي الأمر" : "Parent Phone", s.guardPhone],
          [isAr ? "العنوان" : "Address", s.addr],
        ].map(([k, v]: any) => (
          <div key={k} style={{ padding: "10px 12px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 9 }}>
            <div style={{ fontSize: 10, color: "var(--tx2)", fontWeight: 700, marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--tx0)", wordBreak: "break-word" }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="stu-sec-title">📊 {isAr ? "إحصائيات سريعة" : "Quick Stats"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {[
          [`${s.att}%`, isAr ? "الحضور" : "ATT",  s.att > 80 ? "#16A34A" : s.att > 60 ? "#B45309" : "#DC2626"],
          [`${s.gpa}%`, isAr ? "المعدل" : "GPA",  s.gpa > 85 ? "#16A34A" : s.gpa > 70 ? "#E8702A" : "#DC2626"],
          [String(s.viol), isAr ? "مخالفات" : "VIOL", s.viol > 0 ? "#DC2626" : "#16A34A"],
          [String(comments.length), isAr ? "تعليقات" : "NOTES", "#E8702A"],
        ].map(([v, l, c]: any, i) => (
          <div key={i} style={{ padding: "12px 8px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--fm)", color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: "var(--tx2)", fontWeight: 700, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {s.status === "risk" && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{isAr ? "طالب في دائرة الخطر" : "At-Risk Student"}</div>
            <div style={{ fontSize: 12, color: "#991B1B", marginTop: 3 }}>{isAr ? `نسبة حضور ${s.att}% · ${s.viol} مخالفات · يحتاج تدخلاً فورياً` : `Att. ${s.att}% · ${s.viol} violations · Needs immediate intervention`}</div>
            {s.notes && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 5, fontStyle: "italic" }}>{s.notes}</div>}
          </div>
        </div>
      )}
      {s.status === "honor" && (
        <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🏆</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{isAr ? "طالب متميز" : "Honor Student"}</div>
            <div style={{ fontSize: 12, color: "#166534", marginTop: 3 }}>{isAr ? `حضور ${s.att}% · معدل ${s.gpa}% · لا مخالفات` : `Att. ${s.att}% · GPA ${s.gpa}% · No violations`}</div>
            {s.notes && <div style={{ fontSize: 11, color: "#166534", marginTop: 5, fontStyle: "italic" }}>{s.notes}</div>}
          </div>
        </div>
      )}

      {comments.length > 0 ? (
        <>
          <div className="stu-sec-title">💬 {isAr ? "آخر ملاحظة معلم" : "Latest Teacher Note"}</div>
          <div className="stu-comment" onClick={onGoComments} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#3B82F6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{(comments[0].author_name ?? "م").charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{comments[0].author_name ?? "—"}</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>{comments[0].category ?? "—"} · {(comments[0].created_at ?? "").toString().slice(0, 10)}</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--tx1)", marginTop: 8, lineHeight: 1.5 }}>{comments[0].content ?? comments[0].comment}</div>
            <div style={{ fontSize: 10, color: "#E8702A", marginTop: 6, fontWeight: 700 }}>← {isAr ? `عرض كل التعليقات (${comments.length})` : `View all (${comments.length})`}</div>
          </div>
        </>
      ) : (
        <div style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, padding: 16, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>{isAr ? "لا توجد تعليقات من المعلمين بعد" : "No teacher notes yet"}</div>
      )}
    </>
  );
}

function AcademicTab({ s, grades, isAr }: any) {
  if (!grades.length) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--tx2)" }}>
        <div style={{ fontSize: 36, opacity: 0.4, marginBottom: 10 }}>📚</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{isAr ? "لا توجد درجات مسجلة بعد" : "No grades recorded yet"}</div>
      </div>
    );
  }
  const gpa = s.gpa;
  const gpaLabel = gpa >= 85 ? (isAr ? "ممتاز" : "Excellent") : gpa >= 75 ? (isAr ? "جيد جداً" : "Very Good") : gpa >= 65 ? (isAr ? "جيد" : "Good") : (isAr ? "مقبول" : "Pass");
  const gpaColor = gpa >= 85 ? "#16A34A" : gpa >= 70 ? "#E8702A" : "#DC2626";
  return (
    <>
      <div className="stu-sec-title">📚 {isAr ? "النتائج الأكاديمية" : "Academic Results"}</div>
      <div style={{ marginBottom: 18 }}>
        {grades.map((g: any) => {
          const pct = g.max_grade ? Math.round((g.grade / g.max_grade) * 100) : 0;
          const color = pct >= 85 ? "#16A34A" : pct >= 70 ? "#E8702A" : "#DC2626";
          const bar = pct >= 85 ? "#22C55E" : pct >= 70 ? "#E8702A" : "#EF4444";
          return (
            <div key={g.id} style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{g.subject}</div>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 1 }}>{g.teacher_name ?? "—"} · {g.term ?? "—"}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color }}>{pct}%</div>
              </div>
              <div style={{ height: 6, background: "var(--bg2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: bar }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="stu-sec-title">🏅 {isAr ? "المعدل التراكمي" : "Overall GPA"}</div>
      <div style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: gpaColor + "22", border: `3px solid ${gpaColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--fm)", color: gpaColor }}>{gpa}%</div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{gpaLabel}</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>{isAr ? "المعدل التراكمي · الفصل الحالي" : "Cumulative GPA · Current Term"}</div>
        </div>
      </div>
    </>
  );
}

function AttendanceTab({ att, isAr }: any) {
  const s = att.summary ?? {};
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 18 }}>
        {[
          [`${s.rate ?? 0}%`, isAr ? "الحضور" : "Rate",     "#16A34A"],
          [String(s.absent ?? 0), isAr ? "أيام غياب" : "Absent", "#DC2626"],
          [String(s.late ?? 0),   isAr ? "تأخيرات" : "Late",    "#B45309"],
          [String(s.present ?? 0),isAr ? "حاضر" : "Present",    "#2563EB"],
        ].map(([v, l, c]: any, i) => (
          <div key={i} style={{ padding: "12px 8px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--fm)", color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: "var(--tx2)", fontWeight: 700, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="stu-sec-title">📅 {isAr ? "سجل الحضور الأخير" : "Recent Attendance"}</div>
      {(att.log ?? []).length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--tx2)", fontSize: 12 }}>{isAr ? "لا سجل متاح" : "No log"}</div>
      ) : (
        (att.log as any[]).slice(0, 30).map((r, i) => {
          const st = Number(r.status);
          const kind = st === 1 ? (isAr ? "حاضر" : "Present") : st === 2 ? (isAr ? "متأخر" : "Late") : st === 3 ? (isAr ? "غائب" : "Absent") : "—";
          const bg = st === 1 ? "#ECFDF5" : st === 2 ? "#FFFBEB" : "#FEE2E2";
          const ico = st === 1 ? "✓" : st === 2 ? "⏰" : "✗";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 9, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{ico}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{kind}</div>
                <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{r.punch_time ?? ""}</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--fm)", color: "var(--tx2)" }}>{r.punch_date}</div>
            </div>
          );
        })
      )}
    </>
  );
}

function BehaviorTab({ s, violations, isAr }: any) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 18 }}>
        {[
          [String(s.viol),             isAr ? "مخالفات" : "VIOL",   s.viol > 2 ? "#DC2626" : "#B45309"],
          ["—",                         isAr ? "تكريم"   : "HONOR",  "#16A34A"],
          [String(Math.max(0, s.viol - 1)), isAr ? "إنذارات" : "WARN", "#E8702A"],
          ["—",                         isAr ? "إيقافات" : "SUSP",   "#2563EB"],
        ].map(([v, l, c]: any, i) => (
          <div key={i} style={{ padding: "12px 8px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--fm)", color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: "var(--tx2)", fontWeight: 700, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="stu-sec-title">📋 {isAr ? "سجل المخالفات" : "Violation Log"}</div>
      {!violations.length ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--tx2)", fontSize: 12 }}>{isAr ? "لا توجد مخالفات مسجلة ✓" : "No violations ✓"}</div>
      ) : (
        violations.map((v: any) => {
          const sev = String(v.severity ?? "low");
          const c = sev === "high" ? { bg: "#FEE2E2", color: "#DC2626" } : sev === "medium" ? { bg: "#FFFBEB", color: "#B45309" } : { bg: "#EFF6FF", color: "#2563EB" };
          return (
            <div key={v.id} style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{v.kind ?? v.description ?? "—"}</div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: c.bg, color: c.color }}>{sev}</span>
              </div>
              {v.description && v.description !== v.kind && <div style={{ fontSize: 11.5, color: "var(--tx1)", marginBottom: 4 }}>{v.description}</div>}
              <div style={{ fontSize: 11, color: "var(--tx2)" }}>{isAr ? `الإجراء: ${v.action ?? "—"} · ${v.incident_date ?? ""}` : `Action: ${v.action ?? "—"} · ${v.incident_date ?? ""}`}</div>
            </div>
          );
        })
      )}
    </>
  );
}

function CommentsTab({ comments, isAr, onAdd }: any) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="stu-sec-title" style={{ marginBottom: 0 }}>💬 {isAr ? `تعليقات المعلمين (${comments.length})` : `Teacher Notes (${comments.length})`}</div>
        <button onClick={onAdd} className="btn btn-p btn-sm">+ {isAr ? "إضافة" : "Add"}</button>
      </div>
      {!comments.length ? (
        <div style={{ textAlign: "center", padding: "30px 20px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx2)" }}>{isAr ? "لا توجد تعليقات من المعلمين بعد" : "No teacher notes yet"}</div>
        </div>
      ) : (
        comments.map((c: any) => {
          const t = String(c.category ?? "neutral");
          const badge = t === "positive" ? { bg: "#F0FDF4", color: "#16A34A", ar: "إيجابي", en: "Positive" }
                      : t === "concern"  ? { bg: "#FEF2F2", color: "#DC2626", ar: "مخاوف",  en: "Concern"  }
                                          : { bg: "#F3F4F6", color: "#6B7280", ar: "محايد",   en: "Neutral"  };
          return (
            <div key={c.id} className="stu-comment">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#3B82F6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{(c.author_name ?? "م").charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{c.author_name ?? "—"}</div>
                  <div style={{ fontSize: 10, color: "var(--tx2)" }}>{c.subject ?? ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: badge.bg, color: badge.color }}>{isAr ? badge.ar : badge.en}</span>
                  <span style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{(c.created_at ?? "").toString().slice(0, 10)}</span>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--tx1)", lineHeight: 1.55 }}>{c.content ?? c.comment}</div>
            </div>
          );
        })
      )}
    </>
  );
}

function TimelineTab({ events, isAr }: any) {
  if (!events.length) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--tx2)" }}>
        <div style={{ fontSize: 36, opacity: 0.4, marginBottom: 10 }}>🕐</div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{isAr ? "لا سجل متاح" : "No activity"}</div>
      </div>
    );
  }
  return (
    <>
      <div className="stu-sec-title">🕐 {isAr ? "السجل الكامل" : "Full Activity Log"}</div>
      <div>
        {events.slice(0, 40).map((e: any, i: number) => (
          <div key={i} className="stu-tl-item">
            <div className="stu-tl-dot" style={{ background: e.color ?? "#6B7280" }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div className="stu-tl-title">{e.icon ?? "•"} {e.title}</div>
                <span style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)", flexShrink: 0 }}>{(e.date ?? "").toString().slice(0, 10)}</span>
              </div>
              <div className="stu-tl-sub">{e.description}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
