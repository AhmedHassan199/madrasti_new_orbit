"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { tasksApi } from "@/lib/modules-api";

/* ═══════════════════════════════════════
   CONFIG — priority + category + due label
═══════════════════════════════════════ */
const PRI: Record<string, { ar: string; en: string; c: string; bg: string; brd: string; stripe: string }> = {
  urgent: { ar: "عاجل",   en: "Urgent",  c: "#DC2626", bg: "#FEE2E2", brd: "#FCA5A5",             stripe: "#EF4444" },
  high:   { ar: "مرتفع",  en: "High",    c: "#EA580C", bg: "#FFF0E9", brd: "rgba(234,88,12,.25)", stripe: "#F97316" },
  medium: { ar: "متوسط",  en: "Medium",  c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D",             stripe: "#F59E0B" },
  low:    { ar: "منخفض",  en: "Low",     c: "#6B7280", bg: "var(--bg3)", brd: "var(--brd)",      stripe: "#9CA3AF" },
};
const CAT: Record<string, { ar: string; en: string; ico: string; c: string }> = {
  academic:  { ar: "أكاديمي",    en: "Academic",  ico: "📚", c: "#3B82F6" },
  planning:  { ar: "تخطيط",      en: "Planning",  ico: "📅", c: "#8B5CF6" },
  report:    { ar: "تقرير",      en: "Report",    ico: "📊", c: "#E8702A" },
  exam:      { ar: "اختبار",     en: "Exam",      ico: "📋", c: "#DC2626" },
  portfolio: { ar: "ملف إنجاز", en: "Portfolio", ico: "📁", c: "#10B981" },
  committee: { ar: "لجنة",       en: "Committee", ico: "👥", c: "#0891B2" },
  behavior:  { ar: "سلوك",       en: "Behavior",  ico: "⚠️", c: "#F59E0B" },
  other:     { ar: "أخرى",       en: "Other",     ico: "📌", c: "#6B7280" },
};
const COLS = [
  { id: "todo",       ar: "للإنجاز",  en: "To Do",        c: "#6B7280", bg: "var(--bg3)", txc: "var(--tx2)" },
  { id: "inprogress", ar: "جارٍ",      en: "In Progress",  c: "#E8702A", bg: "#FEF3E8",    txc: "#E8702A" },
  { id: "done",       ar: "مكتمل",    en: "Done",         c: "#22C55E", bg: "#ECFDF5",    txc: "#059669" },
];

function normTask(raw: any): any {
  const tagsRaw = raw.tags;
  let tags: string[] = [];
  if (Array.isArray(tagsRaw)) tags = tagsRaw as string[];
  else if (typeof tagsRaw === "string" && tagsRaw) {
    try { tags = JSON.parse(tagsRaw); } catch { tags = tagsRaw.split(",").map((s: string) => s.trim()).filter(Boolean); }
  }
  return {
    id: String(raw.id),
    title:    raw.title ?? raw.name ?? "—",
    desc:     raw.description ?? raw.desc ?? "",
    priority: raw.priority ?? "medium",
    category: raw.category ?? raw.type ?? "other",
    status:   raw.status === "in_progress" ? "inprogress" : (raw.status ?? "todo"),
    dueDate:  raw.due_date ?? raw.dueDate ?? "",
    done:     Boolean(raw.done ?? raw.is_done ?? raw.status === "done"),
    tags,
    comments: Number(raw.comments_count ?? raw.comments ?? 0),
    created:  raw.created_at ?? "",
  };
}

function dueLabel(d: string, done: boolean) {
  if (done) return { c: "#059669", ico: "✓",  ar: "مكتملة" };
  if (!d)   return { c: "var(--tx2)", ico: "📅", ar: "بدون موعد" };
  const today = new Date().toISOString().split("T")[0];
  const diff = Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000);
  if (diff < 0)   return { c: "#DC2626", ico: "⚠️", ar: `متأخر ${Math.abs(diff)} يوم` };
  if (diff === 0) return { c: "#E8702A", ico: "🔥", ar: "اليوم" };
  if (diff <= 2)  return { c: "#B45309", ico: "⏰", ar: `خلال ${diff} أيام` };
  return             { c: "var(--tx2)", ico: "📅", ar: d };
}

export default function TasksPage() {
  useUi();
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<"list" | "kanban">("list");
  const [filter, setFilter]   = useState<"all" | "pending" | "today" | "urgent" | "done">("all");
  const [sort, setSort]       = useState<"due" | "priority" | "created">("due");
  const [search, setSearch]   = useState("");

  /* add/edit drawer */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<any>({
    title: "", desc: "", priority: "medium", category: "academic",
    dueDate: new Date().toISOString().split("T")[0], status: "todo", tags: "",
  });
  const [saving, setSaving] = useState(false);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [newComment, setNewComment]     = useState("");

  useEffect(() => {
    setLoading(true);
    tasksApi.list({}).then((r: any) => {
      const arr = r.data ?? r ?? [];
      setTasks((Array.isArray(arr) ? arr : []).map(normTask));
    }).finally(() => setLoading(false));
  }, []);

  const filteredSorted = useMemo(() => {
    let list = tasks.slice();
    if (search) list = list.filter(t =>
      t.title.includes(search) ||
      (t.tags as string[]).some(g => g.includes(search)),
    );
    const today = new Date().toISOString().split("T")[0];
    if (filter === "today")   list = list.filter(t => t.dueDate === today && !t.done);
    if (filter === "urgent")  list = list.filter(t => t.priority === "urgent" && !t.done);
    if (filter === "done")    list = list.filter(t => t.done);
    if (filter === "pending") list = list.filter(t => !t.done);
    const priOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (sort === "priority") list.sort((a, b) => priOrder[a.priority] - priOrder[b.priority]);
    else if (sort === "due") list.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    else                      list.sort((a, b) => (b.created || "").localeCompare(a.created || ""));
    return list;
  }, [tasks, search, filter, sort]);

  const stats = useMemo(() => ({
    total:   tasks.length,
    pending: tasks.filter(t => !t.done).length,
    done:    tasks.filter(t => t.done).length,
    urgent:  tasks.filter(t => t.priority === "urgent" && !t.done).length,
    today:   tasks.filter(t => t.dueDate === new Date().toISOString().split("T")[0] && !t.done).length,
  }), [tasks]);

  async function reload() {
    const r: any = await tasksApi.list({});
    const arr = r.data ?? r ?? [];
    setTasks((Array.isArray(arr) ? arr : []).map(normTask));
  }

  async function toggle(id: string) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done, status: t.done ? "todo" : "done" } : t));
    try { await tasksApi.toggle(id); } catch {}
  }

  function openAdd() {
    setEditId(null);
    setForm({ title: "", desc: "", priority: "medium", category: "academic",
      dueDate: new Date().toISOString().split("T")[0], status: "todo", tags: "" });
    setCommentsList([]); setNewComment("");
    setDrawerOpen(true);
  }

  async function openEdit(t: any) {
    setEditId(t.id);
    setForm({
      title: t.title, desc: t.desc, priority: t.priority, category: t.category,
      dueDate: t.dueDate || new Date().toISOString().split("T")[0],
      status: t.status, tags: (t.tags ?? []).join("، "),
    });
    setNewComment("");
    setDrawerOpen(true);
    try {
      const r: any = await tasksApi.comments(t.id);
      setCommentsList(r.data ?? r ?? []);
    } catch { setCommentsList([]); }
  }

  async function saveTask() {
    if (!form.title.trim()) return alert("عنوان المهمة مطلوب");
    setSaving(true);
    try {
      const tagsArr = form.tags.split(/[,،]/).map((s: string) => s.trim()).filter(Boolean);
      const statusBE = form.status === "inprogress" ? "in_progress" : form.status;
      const payload: any = {
        title: form.title, description: form.desc,
        priority: form.priority, category: form.category,
        due_date: form.dueDate || null, status: statusBE,
        tags: tagsArr,
      };
      if (editId) await tasksApi.update(editId, payload);
      else        await tasksApi.create(payload);
      await reload();
      setDrawerOpen(false);
    } catch (e: any) { alert("تعذّر الحفظ: " + (e?.message ?? "")); }
    finally { setSaving(false); }
  }

  async function deleteTask(id: string) {
    if (!confirm("حذف هذه المهمة؟")) return;
    try { await tasksApi.delete(id); await reload(); setDrawerOpen(false); }
    catch { alert("تعذّر الحذف"); }
  }

  async function addComment() {
    if (!editId || !newComment.trim()) return;
    try {
      await tasksApi.addComment(editId, newComment);
      const r: any = await tasksApi.comments(editId);
      setCommentsList(r.data ?? r ?? []);
      setNewComment("");
    } catch { alert("تعذّر إضافة التعليق"); }
  }

  return (
    <DashboardLayout title="مهامي" subtitle={`${stats.pending} معلقة · ${stats.done} مكتملة`}>
      <style>{`
        .tk-chip { padding: 5px 12px; border-radius: 14px; border: 1px solid var(--brd); background: var(--bg1); color: var(--tx2); font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .tk-chip.on { background: #FEF3E8; color: #E8702A; border-color: #E8702A; }
        .tk-vbtn { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--brd); background: var(--bg1); color: var(--tx2); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .tk-vbtn.on { background: #FEF3E8; color: #E8702A; border-color: #E8702A; }
        .tk-card { background: var(--bg1); border: 1.5px solid var(--brd); border-radius: 12px; padding: 12px 14px; cursor: pointer; box-shadow: var(--card-sh); position: relative; }
        .tk-card:hover { border-color: #E8702A; transform: translateY(-1px); }
        .tk-card-stripe { position: absolute; top: 0; right: 0; bottom: 0; width: 4px; border-radius: 12px 0 0 12px; }
        .tk-check { width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--brd); background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; margin-top: 2px; transition: all .12s; }
        .tk-check.done { background: #22C55E; border-color: #22C55E; }
        .tk-list-row { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-bottom: 1px solid var(--brd); cursor: pointer; transition: background .12s; }
        .tk-list-row:hover { background: var(--bg3); }
        .tk-list-row:last-child { border-bottom: none; }
      `}</style>

      {/* ══ ADD/EDIT DRAWER ══ */}
      {drawerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,.45)" }} onClick={() => setDrawerOpen(false)} />
          <div style={{ width: 460, background: "var(--bg1)", boxShadow: "-4px 0 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{editId ? "تعديل المهمة" : "مهمة جديدة"}</div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "var(--bg3)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: "20px 22px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>عنوان المهمة *</label>
                <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} placeholder="اكتب عنوان المهمة..." style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الوصف</label>
                <textarea value={form.desc} onChange={e => setForm((p: any) => ({ ...p, desc: e.target.value }))} rows={4} placeholder="تفاصيل إضافية..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 13px", border: "1.5px solid var(--brd)", borderRadius: 10, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الأولوية</label>
                  <select value={form.priority} onChange={e => setForm((p: any) => ({ ...p, priority: e.target.value }))} style={{ width: "100%", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }}>
                    {Object.entries(PRI).map(([k, p]) => <option key={k} value={k}>{p.ar}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>التصنيف</label>
                  <select value={form.category} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }}>
                    {Object.entries(CAT).map(([k, c]) => <option key={k} value={k}>{c.ico} {c.ar}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>تاريخ الاستحقاق</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm((p: any) => ({ ...p, dueDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الحالة</label>
                  <select value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))} style={{ width: "100%", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }}>
                    <option value="todo">للإنجاز</option>
                    <option value="inprogress">جارٍ</option>
                    <option value="done">مكتمل</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الوسوم (افصل بفاصلة)</label>
                <input value={form.tags} onChange={e => setForm((p: any) => ({ ...p, tags: e.target.value }))} placeholder="مثال: اختبارات، درجات" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
              </div>
              {editId && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>💬 تعليقات ({commentsList.length})</div>
                  {commentsList.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 8 }}>
                      {commentsList.map((c: any) => (
                        <div key={c.id} style={{ padding: "8px 11px", background: "var(--bg3)", borderRadius: 8, fontSize: 12 }}>
                          <div style={{ color: "var(--tx1)" }}>{c.content}</div>
                          <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 3 }}>{(c.created_at ?? "").toString().slice(0, 16).replace("T", " ")}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="اكتب تعليقاً..." style={{ flex: 1, padding: "7px 11px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12 }} />
                    <button onClick={addComment} className="btn btn-p btn-sm">+</button>
                  </div>
                </div>
              )}
              {editId && (
                <button onClick={() => deleteTask(editId)} style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>🗑️ حذف هذه المهمة</button>
              )}
            </div>
            <div style={{ padding: "16px 22px", borderTop: "1px solid var(--brd)", display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={saveTask} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري..." : "حفظ المهمة"}</button>
              <button onClick={() => setDrawerOpen(false)} style={{ padding: "10px 16px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>مهامي</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{stats.pending} معلقة · {stats.done} مكتملة</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button className={`tk-vbtn ${view === "list" ? "on" : ""}`} onClick={() => setView("list")} title="قائمة">☰</button>
            <button className={`tk-vbtn ${view === "kanban" ? "on" : ""}`} onClick={() => setView("kanban")} title="كانبان">▦</button>
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as any)} style={{ fontSize: 12, padding: "6px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit" }}>
            <option value="due">⏰ بالموعد</option>
            <option value="priority">🔴 بالأولوية</option>
            <option value="created">📅 بالإنشاء</option>
          </select>
          <button onClick={openAdd} className="btn btn-p">+ مهمة جديدة</button>
        </div>
      </div>

      {/* ══ STATS STRIP ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { v: stats.total,  ar: "إجمالي المهام", c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)", f: "all" },
          { v: stats.urgent, ar: "عاجل",           c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5",             f: "urgent" },
          { v: stats.today,  ar: "مهام اليوم",     c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D",             f: "today" },
          { v: stats.done,   ar: "مكتملة",         c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0",             f: "done" },
        ].map(s => (
          <div key={s.f} onClick={() => setFilter(s.f as any)} style={{ background: s.bg, border: `2px solid ${filter === s.f ? s.c : s.brd}`, borderRadius: 12, padding: "12px 16px", boxShadow: "var(--card-sh)", cursor: "pointer", transition: "border-color .15s" }}>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>{s.ar}</div>
          </div>
        ))}
      </div>

      {/* ══ SEARCH + CHIPS ══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <svg style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في المهام..." style={{ width: "100%", boxSizing: "border-box", padding: "8px 35px 8px 10px", border: "1.5px solid var(--brd)", borderRadius: 10, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
          {search && <span onClick={() => setSearch("")} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--tx2)", fontSize: 14 }}>✕</span>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ id: "all", ar: "الكل" }, { id: "pending", ar: "معلقة" }, { id: "today", ar: "اليوم" }, { id: "urgent", ar: "عاجل" }, { id: "done", ar: "مكتملة" }].map(f => (
            <button key={f.id} className={`tk-chip ${filter === f.id ? "on" : ""}`} onClick={() => setFilter(f.id as any)}>{f.ar}</button>
          ))}
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--tx2)" }}>جاري التحميل...</div>
      ) : filteredSorted.length === 0 ? (
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, padding: 60, textAlign: "center", color: "var(--tx2)" }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>لا توجد مهام في هذا التصنيف</div>
          <button onClick={openAdd} className="btn btn-p btn-sm">+ إضافة مهمة</button>
        </div>
      ) : view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {COLS.map(col => {
            const colTasks = col.id === "done"
              ? filteredSorted.filter(t => t.done)
              : filteredSorted.filter(t => !t.done && t.status === col.id);
            return (
              <div key={col.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: col.c }} />
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{col.ar}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: col.bg, color: col.txc }}>{colTasks.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {colTasks.map(t => <TaskCard key={t.id} t={t} compact onToggle={() => toggle(t.id)} onOpen={() => openEdit(t)} />)}
                  {col.id !== "done" && (
                    <button onClick={openAdd} style={{ width: "100%", padding: 8, border: "1.5px dashed var(--brd2)", borderRadius: 9, background: "none", cursor: "pointer", color: "var(--tx2)", fontSize: 11, fontFamily: "inherit" }}>+ إضافة</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          {filteredSorted.map(t => {
            const pri = PRI[t.priority] || PRI.low;
            const cat = CAT[t.category] || CAT.other;
            const due = dueLabel(t.dueDate, t.done);
            return (
              <div key={t.id} className="tk-list-row" onClick={() => openEdit(t)} style={{ opacity: t.done ? 0.55 : 1 }}>
                <div className={`tk-check ${t.done ? "done" : ""}`} onClick={e => { e.stopPropagation(); toggle(t.id); }}>
                  {t.done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ width: 4, height: 36, borderRadius: 2, background: pri.stripe, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--tx2)" : "var(--tx0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: `${cat.c}18`, color: cat.c }}>{cat.ico} {cat.ar}</span>
                    <span style={{ fontSize: 10, color: due.c }}>{due.ico} {due.ar}</span>
                    {(t.tags as string[]).map((g: string) => <span key={g} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "var(--bg3)", color: "var(--tx2)" }}>#{g}</span>)}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: t.done ? "var(--bg3)" : pri.bg, color: t.done ? "var(--tx2)" : pri.c, flexShrink: 0, whiteSpace: "nowrap" }}>{pri.ar}</span>
                {t.comments > 0 && <span style={{ fontSize: 10, color: "var(--tx2)", flexShrink: 0 }}>💬 {t.comments}</span>}
                <button onClick={e => { e.stopPropagation(); openEdit(t); }} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--brd)", background: "none", cursor: "pointer", color: "var(--tx2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ BOTTOM CHARTS ══ */}
      {!loading && tasks.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          {/* Priority distribution */}
          <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12 }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>📊 توزيع المهام بالأولوية</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(PRI).map(([k, p]) => {
                const cnt = tasks.filter(t => t.priority === k).length;
                const doneP = tasks.filter(t => t.priority === k && t.done).length;
                return (
                  <div key={k}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: p.c }}>{p.ar}</span>
                      <span style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{doneP}/{cnt}</span>
                    </div>
                    <div style={{ height: 7, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, width: `${cnt ? Math.round(doneP / cnt * 100) : 0}%`, background: p.stripe, transition: "width .6s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Upcoming deadlines */}
          <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>🗓 المواعيد القادمة</div>
            <div>
              {tasks.filter(t => !t.done).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")).slice(0, 5).map(t => {
                const due = dueLabel(t.dueDate, t.done);
                const cat = CAT[t.category] || CAT.other;
                const pri = PRI[t.priority] || PRI.low;
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--brd)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: pri.stripe, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                      <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{cat.ico} {cat.ar}</div>
                    </div>
                    <span style={{ fontSize: 10, color: due.c, flexShrink: 0 }}>{due.ico} {due.ar}</span>
                  </div>
                );
              })}
              {tasks.filter(t => !t.done).length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>لا مواعيد قادمة</div>}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ─── Task card (kanban compact) ─── */
function TaskCard({ t, compact, onToggle, onOpen }: any) {
  const pri = PRI[t.priority] || PRI.low;
  const cat = CAT[t.category] || CAT.other;
  const due = dueLabel(t.dueDate, t.done);
  const stripeC = t.done ? "#9CA3AF" : pri.stripe;
  return (
    <div className="tk-card" onClick={onOpen} style={{ opacity: t.done ? 0.55 : 1 }}>
      <div className="tk-card-stripe" style={{ background: stripeC }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div className={`tk-check ${t.done ? "done" : ""}`} onClick={e => { e.stopPropagation(); onToggle(); }}>
          {t.done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--tx2)" : "var(--tx0)" }}>{t.title}</div>
          {!compact && t.desc && (
            <div style={{ fontSize: 11, color: "var(--tx2)", margin: "5px 0 7px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.desc}</div>
          )}
          <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${cat.c}22`, color: cat.c }}>{cat.ico} {cat.ar}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: t.done ? "var(--bg3)" : pri.bg, color: t.done ? "var(--tx2)" : pri.c }}>{pri.ar}</span>
            {(t.tags as string[]).map((g: string) => <span key={g} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "var(--bg3)", color: "var(--tx2)" }}>#{g}</span>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
            <span style={{ fontSize: 10, color: due.c }}>{due.ico} {due.ar}</span>
            {t.comments > 0 && <span style={{ fontSize: 10, color: "var(--tx2)" }}>💬 {t.comments}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
