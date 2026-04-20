"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { summonsApi } from "@/lib/modules-api";

/* ═══════════════════════════════════════
   CONFIG — type + status meta
═══════════════════════════════════════ */
const TYPE_META: Record<string, { ar: string; ico: string; c: string; bg: string; brd: string }> = {
  absence:  { ar: "غياب",        ico: "📅", c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
  behavior: { ar: "سلوكي",       ico: "⚠️", c: "#EA580C", bg: "#FFF7ED", brd: "#FDBA74" },
  academic: { ar: "أكاديمي",     ico: "📚", c: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
  parent:   { ar: "تواصل أهل",   ico: "👨‍👩‍👦", c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
  general:  { ar: "عام",         ico: "📋", c: "#6B7280", bg: "var(--bg3)", brd: "var(--brd2)" },
};
const STATUS_META: Record<string, { ar: string; bg: string; c: string; brd: string; ico: string }> = {
  pending:   { ar: "بانتظار الحضور", ico: "⏳", bg: "#FFFBEB", c: "#B45309", brd: "#FCD34D" },
  attended:  { ar: "حضر",            ico: "✅", bg: "#ECFDF5", c: "#059669", brd: "#A7F3D0" },
  "no-show": { ar: "لم يحضر",        ico: "❌", bg: "#FEF2F2", c: "#DC2626", brd: "#FCA5A5" },
  cancelled: { ar: "ملغى",           ico: "✕",  bg: "var(--bg3)", c: "#6B7280", brd: "var(--brd)" },
};
const FC: Record<string, string> = { all: "#6B7280", pending: "#B45309", attended: "#059669", "no-show": "#DC2626", cancelled: "#6B7280" };

function normSmn(raw: any): any {
  const status = String(raw.status ?? "pending");
  const mappedStatus = status === "completed" ? "attended" : (status in STATUS_META ? status : "pending");
  const student = raw.student ?? raw.employee?.name ?? raw.employee_name ?? "—";
  const photo = (student.split(" ").slice(0, 2).map((s: string) => s.charAt(0)).join("") || "ط").slice(0, 2);
  return {
    id: String(raw.id),
    student,
    cls: raw.cls ?? raw.class ?? raw.employee?.group?.name ?? raw.class_name ?? "—",
    photo: raw.photo ?? photo,
    type: raw.type ?? raw.summon_type ?? "general",
    status: mappedStatus,
    caller: raw.caller ?? raw.called_by ?? raw.created_by_name ?? "—",
    callerRole: raw.caller_role ?? raw.callerRole ?? "teacher",
    reason: raw.reason ?? raw.notes ?? "—",
    date: raw.scheduled_date ?? raw.date ?? raw.summon_date ?? raw.created_at?.slice(0, 10) ?? "",
    time: raw.scheduled_time ?? raw.time ?? "—",
    parent: raw.parent ?? raw.parent_name ?? raw.guardian_name ?? "—",
    parentPhone: raw.parent_phone ?? raw.parentPhone ?? raw.guardian_phone ?? "—",
    followup: raw.followup ?? raw.follow_up ?? "",
    notes: raw.notes_detail ?? raw.notes ?? "",
    history: Array.isArray(raw.history) ? raw.history : [],
    employee_id: raw.employee_id,
  };
}

export default function SummonsPage() {
  useUi();
  const [summons, setSummons]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [sort, setSort]         = useState<"date" | "name" | "type">("date");

  /* drawer */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab]   = useState<"details" | "notes" | "history">("details");
  const [notesText, setNotesText]   = useState("");
  const [followupText, setFollowupText] = useState("");
  const [saving, setSaving] = useState(false);

  /* add modal */
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState<any>({
    employee_id: "", type: "general", reason: "",
    scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: "",
    parent_phone: "", caller: "", caller_role: "teacher",
  });

  async function reload() {
    const r: any = await summonsApi.list({});
    const arr = r.data ?? r ?? [];
    setSummons((Array.isArray(arr) ? arr : []).map(normSmn));
  }

  useEffect(() => {
    setLoading(true);
    summonsApi.list({}).then((r: any) => {
      const arr = r.data ?? r ?? [];
      setSummons((Array.isArray(arr) ? arr : []).map(normSmn));
    }).finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    all: summons.length,
    pending: summons.filter(s => s.status === "pending").length,
    attended: summons.filter(s => s.status === "attended").length,
    "no-show": summons.filter(s => s.status === "no-show").length,
    cancelled: summons.filter(s => s.status === "cancelled").length,
  }), [summons]);

  const responseRate = useMemo(() =>
    Math.round(counts.attended / Math.max(1, counts.attended + counts["no-show"]) * 100) || 0,
    [counts]
  );

  const shown = useMemo(() => {
    let list = summons.slice();
    if (filter !== "all") list = list.filter(s => s.status === filter);
    if (search) list = list.filter(s => s.student.includes(search) || s.cls.includes(search) || s.parent.includes(search));
    if (sort === "date") list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (sort === "name") list.sort((a, b) => a.student.localeCompare(b.student));
    if (sort === "type") list.sort((a, b) => a.type.localeCompare(b.type));
    return list;
  }, [summons, filter, search, sort]);

  const selected = selectedId ? summons.find(s => s.id === selectedId) ?? null : null;

  function openDrawer(id: string) {
    const s = summons.find(x => x.id === id);
    setSelectedId(id);
    setDrawerTab("details");
    setNotesText(s?.notes ?? "");
    setFollowupText(s?.followup ?? "");
    setDrawerOpen(true);
  }

  async function setStatus(id: string, status: string) {
    try {
      if (status === "attended") await summonsApi.update(id, { status: "completed" });
      else if (status === "cancelled") await summonsApi.update(id, { status: "cancelled" });
      else await summonsApi.update(id, { status });
      await reload();
    } catch { alert("تعذّر التحديث"); }
  }

  async function saveNotes() {
    if (!selected) return;
    setSaving(true);
    try {
      await summonsApi.update(selected.id, { notes: notesText, followup: followupText });
      await reload();
      alert("✅ تم حفظ الملاحظات");
    } catch { alert("تعذّر الحفظ"); }
    finally { setSaving(false); }
  }

  async function createSummon() {
    if (!newForm.employee_id) return alert("الرجاء إدخال رقم الطالب");
    if (!newForm.reason) return alert("الرجاء إدخال سبب الاستدعاء");
    setSaving(true);
    try {
      await summonsApi.create(newForm);
      await reload();
      setAddOpen(false);
      setNewForm({ employee_id: "", type: "general", reason: "", scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: "", parent_phone: "", caller: "", caller_role: "teacher" });
    } catch (e: any) { alert("تعذّر الإنشاء: " + (e?.message ?? "")); }
    finally { setSaving(false); }
  }

  return (
    <DashboardLayout title="📞 الاستدعاءات" subtitle={`${summons.length} استدعاء · معدل الاستجابة ${responseRate}%`}>
      <style>{`
        .smn-card { background: var(--bg1); border: 1.5px solid var(--brd); border-radius: 12px; overflow: hidden; cursor: pointer; box-shadow: var(--card-sh); transition: all .14s; }
        .smn-card:hover { border-color: #E8702A; transform: translateY(-1px); }
        .smn-badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 6px; display: inline-flex; align-items: center; gap: 3px; }
      `}</style>

      {/* ══ ADD SUMMON MODAL ══ */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={() => setAddOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", background: "var(--bg1)", borderRadius: 14, border: "1px solid var(--brd)", boxShadow: "0 8px 40px rgba(0,0,0,.25)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>📞 استدعاء جديد</div>
              <button onClick={() => setAddOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "var(--bg3)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>رقم الطالب *</label>
                  <input type="number" value={newForm.employee_id} onChange={e => setNewForm((p: any) => ({ ...p, employee_id: e.target.value }))} placeholder="84728" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>النوع</label>
                  <select value={newForm.type} onChange={e => setNewForm((p: any) => ({ ...p, type: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }}>
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.ico} {v.ar}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>سبب الاستدعاء *</label>
                <textarea value={newForm.reason} onChange={e => setNewForm((p: any) => ({ ...p, reason: e.target.value }))} rows={3} placeholder="تفاصيل سبب الاستدعاء..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12.5, resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>التاريخ</label>
                  <input type="date" value={newForm.scheduled_date} onChange={e => setNewForm((p: any) => ({ ...p, scheduled_date: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الوقت</label>
                  <input type="time" value={newForm.scheduled_time} onChange={e => setNewForm((p: any) => ({ ...p, scheduled_time: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>جوال ولي الأمر</label>
                  <input type="tel" value={newForm.parent_phone} onChange={e => setNewForm((p: any) => ({ ...p, parent_phone: e.target.value }))} placeholder="05xxxxxxxx" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الجهة المستدعية</label>
                  <select value={newForm.caller_role} onChange={e => setNewForm((p: any) => ({ ...p, caller_role: e.target.value, caller: { teacher: "معلم الفصل", counselor: "المرشد الطلابي", vice: "وكيل شؤون الطلاب", principal: "مدير المدرسة" }[e.target.value as string] }))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }}>
                    <option value="teacher">معلم الفصل</option>
                    <option value="counselor">المرشد الطلابي</option>
                    <option value="vice">وكيل شؤون الطلاب</option>
                    <option value="principal">مدير المدرسة</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--brd)", display: "flex", gap: 8 }}>
              <button onClick={createSummon} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري..." : "إنشاء الاستدعاء"}</button>
              <button onClick={() => setAddOpen(false)} style={{ padding: "10px 16px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DETAIL DRAWER ══ */}
      {drawerOpen && selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,.45)" }} onClick={() => setDrawerOpen(false)} />
          <div style={{ width: 500, background: "var(--bg1)", boxShadow: "-4px 0 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}>
            <DrawerBody
              s={selected} tab={drawerTab} setTab={setDrawerTab}
              notesText={notesText} setNotesText={setNotesText}
              followupText={followupText} setFollowupText={setFollowupText}
              saving={saving} onClose={() => setDrawerOpen(false)}
              onSetStatus={setStatus} onSaveNotes={saveNotes}
            />
          </div>
        </div>
      )}

      {/* ══ PAGE HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>📞 الاستدعاءات</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{summons.length} استدعاء · معدل الاستجابة {responseRate}%</div>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn btn-p">+ استدعاء جديد</button>
      </div>

      {/* ══ KPI STRIP ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: counts.pending,   l: "بانتظار الحضور", c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D", ico: "⏳" },
          { v: counts.attended,  l: "حضر",            c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0", ico: "✅" },
          { v: counts["no-show"],l: "لم يحضر",        c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5", ico: "❌" },
          { v: `${responseRate}%`, l: "معدل الاستجابة", c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE", ico: "📊" },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.brd}`, borderRadius: 12, padding: "11px 13px", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 20 }}>{k.ico}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "var(--fm)", color: k.c, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ FILTERS ══ */}
      <div style={{ display: "flex", gap: 7, marginBottom: 13, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 170, maxWidth: 260 }}>
          <svg style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الفصل..." style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", paddingRight: 30, border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[
            { id: "all",       ar: "الكل",           cnt: counts.all },
            { id: "pending",   ar: "بانتظار الحضور", cnt: counts.pending },
            { id: "attended",  ar: "حضر",            cnt: counts.attended },
            { id: "no-show",   ar: "لم يحضر",        cnt: counts["no-show"] },
            { id: "cancelled", ar: "ملغى",           cnt: counts.cancelled },
          ].map(f => {
            const on = filter === f.id;
            const c = FC[f.id];
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${on ? c : "var(--brd)"}`, background: on ? c : "var(--bg1)", color: on ? "#fff" : "var(--tx2)", cursor: "pointer", fontFamily: "inherit", transition: "all .13s" }}>
                {f.ar} <span style={{ opacity: 0.8 }}>({f.cnt})</span>
              </button>
            );
          })}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as any)} style={{ padding: "6px 10px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, marginRight: "auto" }}>
          <option value="date">ترتيب: التاريخ</option>
          <option value="name">ترتيب: الاسم</option>
          <option value="type">ترتيب: النوع</option>
        </select>
      </div>

      {/* ══ CARDS ══ */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--tx2)" }}>جاري التحميل...</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, boxShadow: "var(--card-sh)" }}>
          <div style={{ fontSize: 48, opacity: 0.25, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx2)" }}>لا توجد استدعاءات مطابقة</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.map(s => {
            const tm = TYPE_META[s.type] || TYPE_META.general;
            const sm = STATUS_META[s.status];
            const isSel = selectedId === s.id && drawerOpen;
            return (
              <div key={s.id} className="smn-card" onClick={() => openDrawer(s.id)} style={{ border: isSel ? "1.5px solid #E8702A" : undefined }}>
                <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                  <div style={{ width: 4, background: tm.c, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 11, background: tm.bg, border: `1.5px solid ${tm.brd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: tm.c }}>{s.photo}</div>
                      <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 5, background: tm.bg, color: tm.c, border: `1px solid ${tm.brd}`, fontWeight: 700 }}>{tm.ico} {tm.ar}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{s.student}</div>
                      <div style={{ fontSize: 10.5, color: "var(--tx2)", marginBottom: 5 }}>فصل {s.cls} · ولي الأمر: {s.parent}</div>
                      <div style={{ fontSize: 11, color: "var(--tx1)", lineHeight: 1.5, background: "var(--bg3)", padding: "5px 8px", borderRadius: 7 }}>{s.reason.length > 70 ? s.reason.slice(0, 70) + "…" : s.reason}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <span className="smn-badge" style={{ background: sm.bg, color: sm.c, border: `1px solid ${sm.brd}` }}>{sm.ico} {sm.ar}</span>
                      <div style={{ fontSize: 10, color: "var(--tx2)", textAlign: "left" }}>
                        <div>📅 {s.date}</div>
                        <div>🕐 {s.time}</div>
                        <div style={{ marginTop: 2, color: "var(--tx2)", fontSize: 9.5 }}>{s.caller}</div>
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                        {s.status === "pending" ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); setStatus(s.id, "attended"); }} style={{ fontSize: 10, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", padding: "4px 9px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>✅ حضر</button>
                            <button onClick={e => { e.stopPropagation(); setStatus(s.id, "no-show"); }} style={{ fontSize: 10, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", padding: "4px 9px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>❌ لم يحضر</button>
                          </>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); openDrawer(s.id); }} className="btn btn-g btn-sm" style={{ fontSize: 10 }}>📂 التفاصيل</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {s.followup && (
                  <div style={{ padding: "7px 15px", background: "var(--bg3)", borderTop: "1px solid var(--brd)", fontSize: 10.5, color: "var(--tx2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#E8702A", fontWeight: 700 }}>متابعة:</span> {s.followup}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ─── Drawer body ─── */
function DrawerBody({ s, tab, setTab, notesText, setNotesText, followupText, setFollowupText, saving, onClose, onSetStatus, onSaveNotes }: any) {
  const tm = TYPE_META[s.type] || TYPE_META.general;
  const sm = STATUS_META[s.status];
  return (
    <>
      {/* header */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ padding: "15px 18px 13px", borderBottom: "1px solid var(--brd)", background: tm.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 50, height: 50, borderRadius: 13, background: tm.brd, border: `2px solid ${tm.c}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: tm.c, flexShrink: 0 }}>{s.photo}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{s.student}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span className="smn-badge" style={{ background: sm.bg, color: sm.c, border: `1px solid ${sm.brd}` }}>{sm.ico} {sm.ar}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", background: tm.bg, color: tm.c, border: `1px solid ${tm.brd}`, borderRadius: 6, fontWeight: 700 }}>{tm.ico} {tm.ar}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 29, height: 29, borderRadius: 8, border: "none", background: "rgba(0,0,0,.08)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--brd)" }}>
          {[{ id: "details", ar: "التفاصيل" }, { id: "notes", ar: "الملاحظات" }, { id: "history", ar: "السجل" }].map((t: any) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 14px", border: "none", background: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: tab === t.id ? "#E8702A" : "var(--tx2)", borderBottom: `2px solid ${tab === t.id ? "#E8702A" : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap" }}>{t.ar}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "details" && (
          <div style={{ padding: "15px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                { l: "📅 التاريخ والوقت", v: `${s.date} — ${s.time}` },
                { l: "🧑‍🎓 الطالب", v: `${s.student} | فصل ${s.cls}` },
                { l: "👨‍👩‍👦 ولي الأمر", v: s.parent },
                { l: "📱 الجوال", v: s.parentPhone, mono: true },
                { l: "📌 الجهة المستدعية", v: s.caller },
              ].map((row: any) => (
                <div key={row.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--brd)" }}>
                  <span style={{ fontSize: 11, color: "var(--tx2)" }}>{row.l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: row.mono ? "monospace" : "inherit" }}>{row.v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "11px 13px", background: tm.bg, border: `1px solid ${tm.brd}`, borderRadius: 10, borderRight: `3px solid ${tm.c}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: tm.c, marginBottom: 4 }}>{tm.ico} سبب الاستدعاء</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{s.reason}</div>
            </div>
            {s.followup && (
              <div style={{ padding: "10px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", marginBottom: 3 }}>✅ نتيجة الاستدعاء</div>
                <div style={{ fontSize: 12 }}>{s.followup}</div>
              </div>
            )}
            {s.status === "pending" && (
              <div style={{ background: "var(--bg3)", borderRadius: 11, padding: 12, border: "1px solid var(--brd)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>تحديث الحالة</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => onSetStatus(s.id, "attended")} style={{ flex: 1, padding: "7px", background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>✅ حضر ولي الأمر</button>
                  <button onClick={() => onSetStatus(s.id, "no-show")} style={{ flex: 1, padding: "7px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>❌ لم يحضر</button>
                  <button onClick={() => onSetStatus(s.id, "cancelled")} style={{ flex: 1, padding: "7px", background: "var(--bg3)", color: "var(--tx2)", border: "1px solid var(--brd)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>✕ إلغاء</button>
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button className="btn btn-g btn-sm" style={{ justifyContent: "center" }}>📨 إرسال رسالة</button>
              <button onClick={() => window.print()} className="btn btn-g btn-sm" style={{ justifyContent: "center" }}>🖨️ طباعة الوثيقة</button>
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div style={{ padding: "15px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)" }}>ملاحظات المرشد</div>
            <textarea value={notesText} onChange={e => setNotesText(e.target.value)} placeholder="أضف ملاحظاتك هنا..." style={{ width: "100%", boxSizing: "border-box", height: 130, padding: "10px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12.5, resize: "none", lineHeight: 1.6 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 5 }}>نتيجة الاستدعاء / المتابعة</div>
              <input value={followupText} onChange={e => setFollowupText(e.target.value)} placeholder="سجّل نتيجة اللقاء..." style={{ width: "100%", boxSizing: "border-box", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12 }} />
            </div>
            <button onClick={onSaveNotes} disabled={saving} className="btn btn-p btn-sm" style={{ justifyContent: "center", opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري..." : "حفظ"}</button>
          </div>
        )}

        {tab === "history" && (
          <div style={{ padding: "6px 0" }}>
            {s.history.length === 0 ? (
              <div style={{ padding: 50, textAlign: "center", color: "var(--tx2)" }}>
                <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>📋</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>لا سجلات سابقة</div>
              </div>
            ) : (
              (s.history as any[]).map((h: any, i: number) => {
                const hm = STATUS_META[h.status] || STATUS_META.cancelled;
                return (
                  <div key={i} style={{ display: "flex", gap: 11, padding: "10px 18px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: h.status === "attended" ? "#059669" : h.status === "no-show" ? "#DC2626" : "#6B7280", marginTop: 4 }} />
                      {i < s.history.length - 1 && <div style={{ width: 2, background: "var(--brd)", flex: 1, minHeight: 20, margin: "3px auto" }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: i < s.history.length - 1 ? 8 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                        <span style={{ fontSize: 13 }}>{hm.ico}</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{hm.ar}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--tx1)" }}>{h.note}</div>
                      <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{h.date}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div style={{ padding: "11px 18px", borderTop: "1px solid var(--brd)", display: "flex", gap: 7, flexShrink: 0 }}>
        <button className="btn btn-p btn-sm" style={{ flex: 1, justifyContent: "center" }}>📨 إرسال رسالة</button>
        <button onClick={() => window.print()} className="btn btn-g btn-sm" style={{ flex: 1, justifyContent: "center" }}>🖨️ طباعة</button>
        <button onClick={onClose} className="btn btn-g" style={{ padding: "0 14px" }}>إغلاق</button>
      </div>
    </>
  );
}
