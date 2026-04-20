"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { formsApi } from "@/lib/modules-api";

/* ─── Types ─────────────────────────────────────────────────────────── */
type FormType = "survey" | "form" | "eval" | "sheet" | "request";
type FormStatus = "active" | "draft" | "closed" | "done";
type DrawerTab = "preview" | "responses" | "settings";

interface FormItem {
  id: string; title: string; type: FormType; status: FormStatus;
  target: string; createdBy: string; createdDate: string; closingDate: string | null;
  totalTarget: number | null; responses: number; desc: string;
  questions: { id: string; type: string; text: string; required: boolean; options: string[]; }[];
}

/* ─── Static Data ───────────────────────────────────────────────────── */
const TYPES: Record<FormType, { ar: string; ico: string; color: string }> = {
  survey:  { ar: "استبانة", ico: "📊", color: "#2563EB" },
  form:    { ar: "نموذج",   ico: "📋", color: "#7C3AED" },
  eval:    { ar: "تقييم",   ico: "⭐", color: "#059669" },
  sheet:   { ar: "كشف",    ico: "📝", color: "#B45309" },
  request: { ar: "طلب",    ico: "📩", color: "#E8702A" },
};

const STATUS_LABELS: Record<FormStatus, string> = {
  active: "● نشط", draft: "○ مسودة", closed: "✕ مغلق", done: "✓ مكتمل",
};
const STATUS_COLORS: Record<FormStatus, { c: string; bg: string; brd: string }> = {
  active: { c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  draft:  { c: "#6B7280", bg: "var(--bg3)", brd: "var(--brd)" },
  closed: { c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
  done:   { c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
};

const FORMS: FormItem[]= [];

const TARGET_GROUPS = ["أولياء الأمور", "معلمو المدرسة", "الطلاب", "الإدارة", "الكادر كله"];

/* ─── Component ─────────────────────────────────────────────────────── */
export default function FormsPage() {
  const { lang } = useUi();

  const [forms, setForms]         = useState<any[]>(FORMS);
  const [filter, setFilter]       = useState<FormType | "all">("all");
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState("date");
  const [editId, setEditId]       = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("preview");

  useEffect(() => {
    formsApi.list({}).then((r: any) => {
      const arr: any[] = r.data ?? r ?? [];
      if (Array.isArray(arr) && arr.length > 0) {
        setForms(arr.map((f: any) => ({
          id: String(f.id ?? Math.random()),
          title: f.title ?? f.form_title ?? f.name ?? "—",
          type: f.type ?? f.form_type ?? "form",
          status: f.status ?? "active",
          target: f.target ?? f.target_group ?? "—",
          createdBy: f.created_by ?? f.creator ?? f.created_by_name ?? "—",
          createdDate: f.created_date ?? f.created_at?.slice(0, 10) ?? "—",
          closingDate: f.closing_date ?? f.end_date ?? null,
          totalTarget: f.total_target ?? f.target_count ?? null,
          responses: f.responses ?? f.responses_count ?? 0,
          desc: f.desc ?? f.description ?? "",
          questions: Array.isArray(f.questions) ? f.questions : [],
        })));
      }
    }).catch(() => {});
  }, []);

  /* Computed */
  const activeForms = useMemo(() => forms.filter((f: any) => f.status === "active").length, [forms]);
  const totalResp   = useMemo(() => forms.reduce((s: number, f: any) => s + (f.responses ?? 0), 0), [forms]);
  const totalTarget = useMemo(() => forms.filter((f: any) => f.totalTarget).reduce((s: number, f: any) => s + (f.totalTarget || 0), 0), [forms]);
  const avgRate     = useMemo(() => totalTarget ? Math.round(forms.filter((f: any) => f.totalTarget).reduce((s: number, f: any) => s + f.responses, 0) / totalTarget * 100) : 0, [forms, totalTarget]);
  const draftCount  = useMemo(() => forms.filter((f: any) => f.status === "draft").length, [forms]);

  const shown = useMemo(() => {
    let list = forms.slice();
    if (filter !== "all") list = list.filter((f: any) => f.type === filter);
    if (search) list = list.filter((f: any) => f.title.includes(search) || f.target.includes(search));
    if (sortBy === "date") list.sort((a: any, b: any) => b.createdDate.localeCompare(a.createdDate));
    else if (sortBy === "responses") list.sort((a: any, b: any) => b.responses - a.responses);
    else if (sortBy === "rate") list.sort((a: any, b: any) => {
      const pA = a.totalTarget ? Math.round(a.responses / a.totalTarget * 100) : 0;
      const pB = b.totalTarget ? Math.round(b.responses / b.totalTarget * 100) : 0;
      return pB - pA;
    });
    return list;
  }, [filter, search, sortBy]);

  const selectedForm = drawerOpen && editId ? forms.find((f: any) => f.id === editId) : null;

  const openDrawer = (id: string) => { setEditId(id); setDrawerOpen(true); setDrawerTab("preview"); };
  const closeDrawer = () => setDrawerOpen(false);

  /* Fill color helper */
  const fillColor = (pct: number | null) => pct === null ? "#E8702A" : pct >= 80 ? "#22C55E" : pct >= 50 ? "#F59E0B" : "#EF4444";

  /* ─── Question preview (form preview tab) ─── */
  const renderQuestionPreview = (q: FormItem["questions"][number], i: number) => (
    <div key={q.id} style={{ marginBottom: 16, padding: "12px 14px", border: "1.5px solid var(--brd)", borderRadius: 10, background: "var(--bg1)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>
        <span style={{ color: "var(--tx2)", marginLeft: 6 }}>{i + 1}.</span> {q.text}
        {q.required && <span style={{ color: "#DC2626", marginRight: 4 }}>*</span>}
      </div>
      {(q.type === "radio" || q.type === "checkbox" || q.type === "scale" || q.type === "yesno") && q.options.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {q.options.map((opt, oi) => (
            <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--tx2)" }}>
              <div style={{ width: 14, height: 14, borderRadius: q.type === "checkbox" ? 3 : "50%", border: "1.5px solid var(--brd2)", flexShrink: 0 }} />
              {opt}
            </div>
          ))}
        </div>
      )}
      {q.type === "rating" && (
        <div style={{ display: "flex", gap: 6 }}>
          {q.options.map(n => <span key={n} style={{ fontSize: 20, color: "#FCD34D" }}>★</span>)}
        </div>
      )}
      {(q.type === "text") && <div style={{ height: 32, borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", marginTop: 4 }} />}
      {(q.type === "textarea") && <div style={{ height: 60, borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", marginTop: 4 }} />}
    </div>
  );

  /* ─── Drawer ─── */
  const renderDrawer = () => {
    if (!selectedForm) return null;
    const f = selectedForm;
    const tm = TYPES[f.type];
    const pct = f.totalTarget ? Math.round(f.responses / f.totalTarget * 100) : null;
    const fc = fillColor(pct);
    const sc = STATUS_COLORS[f.status];
    return (
      <>
        {/* Backdrop */}
        <div onClick={closeDrawer} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200 }} />
        {/* Panel */}
        <div style={{ position: "fixed", top: 0, left: 0, width: 480, maxWidth: "95vw", height: "100vh", background: "var(--bg1)", boxShadow: "-4px 0 30px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", zIndex: 201, overflow: "hidden" }}>
          {/* Hero */}
          <div style={{ padding: "16px 20px 14px", background: tm.color + "0D", borderBottom: "1px solid var(--brd)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{tm.ico}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 5, lineHeight: 1.35 }}>{f.title}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: tm.color + "18", color: tm.color, fontWeight: 700 }}>{tm.ico} {tm.ar}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: sc.bg, color: sc.c, border: "1px solid " + sc.brd, fontWeight: 700 }}>{STATUS_LABELS[f.status]}</span>
                    <span style={{ fontSize: 10, color: "var(--tx2)" }}>👥 {f.target}</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: tm.color }}>{f.responses}</div>
                      <div style={{ fontSize: 9, color: "var(--tx2)" }}>رد</div>
                    </div>
                    {pct !== null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: fc }}>{pct}%</div>
                        <div style={{ fontSize: 9, color: "var(--tx2)" }}>استجابة</div>
                      </div>
                    )}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#7C3AED" }}>{f.questions.length}</div>
                      <div style={{ fontSize: 9, color: "var(--tx2)" }}>سؤال</div>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={closeDrawer} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(0,0,0,.08)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "inherit" }}>×</button>
            </div>
            {pct !== null && (
              <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden", marginTop: 10 }}>
                <div style={{ height: "100%", width: pct + "%", background: fc, borderRadius: 3 }} />
              </div>
            )}
          </div>
          {/* Drawer tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--brd)", flexShrink: 0 }}>
            {(["preview", "responses", "settings"] as const).map(t => {
              const lbl = t === "preview" ? "معاينة النموذج" : t === "responses" ? "نتائج وإحصاءات" : "الإعدادات";
              return (
                <button key={t} onClick={() => setDrawerTab(t)} style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: drawerTab === t ? "#E8702A" : "var(--tx2)", borderBottom: drawerTab === t ? "2px solid #E8702A" : "2px solid transparent", whiteSpace: "nowrap" }}>
                  {lbl}
                </button>
              );
            })}
          </div>
          {/* Drawer body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {drawerTab === "preview" && (
              <div>
                {f.desc && <div style={{ padding: "11px 14px", background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--brd)", fontSize: 12, color: "var(--tx2)", marginBottom: 14, lineHeight: 1.5 }}>{f.desc}</div>}
                {f.questions.map((q, i) => renderQuestionPreview(q, i))}
              </div>
            )}
            {drawerTab === "responses" && (
              <div>
                {f.responses === 0 ? (
                  <div style={{ padding: 50, textAlign: "center", color: "var(--tx2)" }}>
                    <div style={{ fontSize: 44, opacity: .3, marginBottom: 10 }}>📊</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>لا توجد ردود بعد</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {f.questions.map((q, i) => (
                      <div key={q.id} style={{ padding: "12px 14px", border: "1.5px solid var(--brd)", borderRadius: 11, background: "var(--bg1)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--tx0)" }}>{i + 1}. {q.text}</div>
                        {(q.type === "radio" || q.type === "checkbox" || q.type === "scale" || q.type === "yesno") && q.options.map((opt, oi) => {
                          const fakeVal = Math.max(0, f.responses - oi * 10);
                          const pctOpt = f.responses > 0 ? Math.round(fakeVal / f.responses * 100) : 0;
                          return (
                            <div key={oi} style={{ marginBottom: 7 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                                <span>{opt}</span>
                                <span style={{ fontWeight: 700 }}>{pctOpt}%</span>
                              </div>
                              <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: pctOpt + "%", background: tm.color, borderRadius: 3 }} />
                              </div>
                            </div>
                          );
                        })}
                        {q.type === "rating" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            {[1, 2, 3, 4, 5].map(n => <span key={n} style={{ fontSize: 22, color: n <= 4 ? "#FCD34D" : "var(--bg3)" }}>★</span>)}
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#B45309", marginRight: 8 }}>4.2 / 5</span>
                          </div>
                        )}
                        {(q.type === "text" || q.type === "textarea") && (
                          <div style={{ fontSize: 11, color: "var(--tx2)" }}>
                            {f.responses} نص مكتوب
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {drawerTab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>عنوان النموذج</label>
                  <input defaultValue={f.title} style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الوصف</label>
                  <textarea defaultValue={f.desc} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", resize: "none", height: 70, outline: "none" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الجهة المستهدفة</label>
                    <select defaultValue={f.target} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none", cursor: "pointer" }}>
                      {TARGET_GROUPS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الحالة</label>
                    <select defaultValue={f.status} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none", cursor: "pointer" }}>
                      <option value="active">نشط</option>
                      <option value="draft">مسودة</option>
                      <option value="closed">مغلق</option>
                    </select>
                  </div>
                  {f.closingDate !== null && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>تاريخ الإغلاق</label>
                      <input type="date" defaultValue={f.closingDate || ""} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none" }} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button style={{ flex: 1, padding: "9px 14px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 حفظ التعديلات</button>
                  <button style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🗑️ حذف</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  /* ─── Main Render ─────────────────────────────────────────────────── */
  return (
    <DashboardLayout title={lang === "ar" ? "الاستبانات والنماذج" : "Forms & Surveys"}>
      {drawerOpen && renderDrawer()}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>📋 الاستبانات والنماذج</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
            {forms.length} نموذج · {totalResp.toLocaleString()} رد · معدل الاستجابة <strong style={{ color: "#E8702A" }}>{avgRate}%</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📊 تصدير</button>
          <button style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            + إنشاء نموذج
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: activeForms, ar: "نماذج نشطة",   c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
          { v: totalResp,   ar: "إجمالي الردود", c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
          { v: avgRate + "%", ar: "معدل الاستجابة", c: avgRate >= 70 ? "#059669" : "#B45309", bg: avgRate >= 70 ? "#ECFDF5" : "#FFFBEB", brd: avgRate >= 70 ? "#A7F3D0" : "#FCD34D" },
          { v: draftCount,  ar: "مسودات",        c: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: "1px solid " + s.brd, borderRadius: 11, padding: "10px 13px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.ar}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 13, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم النموذج أو الجهة..."
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 30px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {([{ id: "all", ar: "الكل" }, ...Object.entries(TYPES).map(([id, v]) => ({ id, ar: v.ar }))] as { id: string; ar: string }[]).map(f => {
            const isActive = filter === f.id;
            const color = f.id !== "all" ? TYPES[f.id as FormType]?.color || "#E8702A" : "#E8702A";
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as FormType | "all")}
                style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "1.5px solid " + (isActive ? color : "var(--brd)"), background: isActive ? color : "var(--bg1)", color: isActive ? "#fff" : "var(--tx2)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
              >
                {f.id !== "all" ? TYPES[f.id as FormType]?.ico + " " : ""}{f.ar}
              </button>
            );
          })}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 11, color: "var(--tx0)", outline: "none", cursor: "pointer" }}>
          <option value="date">الأحدث إنشاءً</option>
          <option value="responses">الأكثر ردوداً</option>
          <option value="rate">الأعلى معدل استجابة</option>
        </select>
      </div>

      {/* Forms list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, color: "var(--tx2)" }}>
            <div style={{ fontSize: 44, opacity: .3, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>لا توجد نماذج في هذا التصنيف</div>
            <button style={{ marginTop: 10, padding: "7px 16px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ إنشاء نموذج جديد</button>
          </div>
        ) : shown.map(form => {
          const tm = TYPES[form.type];
          const pct = form.totalTarget ? Math.round(form.responses / form.totalTarget * 100) : null;
          const fc = fillColor(pct);
          const sc = STATUS_COLORS[form.status];
          const isSelected = editId === form.id && drawerOpen;
          return (
            <div
              key={form.id}
              onClick={() => openDrawer(form.id)}
              style={{ background: "var(--bg1)", border: "1.5px solid " + (isSelected ? "#E8702A" : "var(--brd)"), borderRadius: 14, boxShadow: "var(--card-sh)", cursor: "pointer", overflow: "hidden" }}
            >
              <div style={{ display: "flex", alignItems: "stretch" }}>
                {/* Left accent */}
                <div style={{ width: 4, flexShrink: 0, background: tm.color }} />
                <div style={{ flex: 1, padding: "14px 15px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    {/* Icon */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: tm.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{tm.ico}</div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 5, lineHeight: 1.35 }}>{form.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: tm.color + "18", color: tm.color, fontWeight: 700 }}>{tm.ico} {tm.ar}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: sc.bg, color: sc.c, border: "1px solid " + sc.brd, fontWeight: 700 }}>{STATUS_LABELS[form.status]}</span>
                        <span style={{ fontSize: 10, color: "var(--tx2)" }}>👥 {form.target}</span>
                      </div>
                      {/* Progress */}
                      {pct !== null ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, maxWidth: 240, height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: pct + "%", background: fc, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: fc }}>{form.responses} / {form.totalTarget}</span>
                          <span style={{ fontSize: 10, color: "var(--tx2)" }}>({pct}%)</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>{form.responses} رد</div>
                      )}
                      {/* Meta */}
                      <div style={{ display: "flex", gap: 12, marginTop: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, color: "var(--tx2)" }}>📅 أُنشئ {form.createdDate}</span>
                        {form.closingDate && <span style={{ fontSize: 10, color: "var(--tx2)" }}>⏱ ينتهي {form.closingDate}</span>}
                        <span style={{ fontSize: 10, color: "var(--tx2)" }}>❓ {form.questions.length} أسئلة</span>
                        {form.status === "active" && <span style={{ fontSize: 10, color: "#E8702A", fontWeight: 700 }}>● نشط الآن</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => openDrawer(form.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#E8702A", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📊 النتائج</button>
                      {form.status === "active" && (
                        <button style={{ padding: "4px 9px", borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>🔗 رابط</button>
                      )}
                      <button style={{ padding: "4px 9px", borderRadius: 7, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>✏️ تعديل</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
