"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { committeesApi } from "@/lib/modules-api";

/* ─── Types ─────────────────────────────────────────────────────────── */
type CommStatus = "active" | "done" | "new" | "paused";
type DetailTab  = "overview" | "members" | "tasks" | "files";
type Priority   = "high" | "med" | "low";

interface Task   { id: string; text: string; assignee: string; priority: Priority; dueDate: string; done: boolean; notes: string; }
interface Member { id: string; name: string; role: string; color: string; subject: string; avatar: string; }
interface FileItem { id: string; name: string; type: string; date: string; size: string; }
interface Committee {
  id: string; name: string; color: string; ico: string; status: CommStatus;
  head: string; headId: string; desc: string; startDate: string; endDate: string;
  members: Member[]; tasks: Task[]; files: FileItem[];
}

/* ─── Static Data ───────────────────────────────────────────────────── */
const PRIO: Record<Priority, { ar: string; c: string; bg: string; brd: string }> = {
  high: { ar: "عاجل",  c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
  med:  { ar: "متوسط", c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D" },
  low:  { ar: "عادي",  c: "#6B7280", bg: "var(--bg3)", brd: "var(--brd)" },
};
const STATUS_LABELS: Record<CommStatus, string> = { active: "نشطة", done: "مكتملة", new: "جديدة", paused: "موقوفة" };
const STATUS_COLORS: Record<CommStatus, { c: string; bg: string; brd: string }> = {
  active: { c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  done:   { c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
  new:    { c: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
  paused: { c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D" },
};

const TEACHERS: { id: string; name: string; subject: string; color: string }[] = [];

const TYPE_ICO: Record<string, string> = { pdf: "📄", xlsx: "📊", doc: "📝", docx: "📝" };
const TYPE_BG:  Record<string, string> = { pdf: "#FEF2F2", xlsx: "#ECFDF5", doc: "#EFF6FF" };

/* ─── Component ─────────────────────────────────────────────────────── */
export default function CommitteesPage() {
  const { lang } = useUi();

  const [committees, setCommittees] = useState<any[]>([]);
  const [loadingApi, setLoadingApi] = useState(true);
  const [activeId, setActiveId]     = useState<string>("cm1");
  const [detailTab, setDetailTab]   = useState<DetailTab>("overview");
  const [filterStatus, setFilterStatus] = useState<CommStatus | "all">("all");
  const [search, setSearch]         = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"addComm" | "editComm" | "addMember" | "addTask">("addComm");

  useEffect(() => {
    committeesApi.list({})
      .then((r: any) => {
        const arr: any[] = r.data ?? r ?? [];
        // Map API fields to local shape, keeping members/tasks/files as empty arrays until detail is loaded
        const mapped = arr.map((c: any) => ({
          id:        String(c.id),
          name:      c.name ?? "—",
          color:     c.color ?? "#E8702A",
          ico:       c.icon ?? "👥",
          status:    c.status ?? "active",
          head:      c.head ?? c.manager?.name ?? "—",
          headId:    String(c.manager_id ?? c.head_id ?? ""),
          desc:      c.description ?? "",
          startDate: c.start_date ?? c.created_at?.slice(0, 10) ?? "",
          endDate:   c.end_date ?? "",
          members:   c.members ?? [],
          tasks:     c.tasks ?? [],
          files:     c.files ?? [],
        }));
        setCommittees(mapped);
        if (mapped.length) setActiveId(mapped[0].id);
      })
      .finally(() => setLoadingApi(false));
  }, []);

  /* Computed progress */
  const comms = useMemo(() =>
    committees.map(c => ({ ...c, progress: c.tasks.length ? Math.round(c.tasks.filter(t => t.done).length / c.tasks.length * 100) : 0 })),
  [committees]);

  const listed = useMemo(() => {
    let list = comms.slice();
    if (filterStatus !== "all") list = list.filter(c => c.status === filterStatus);
    if (search) list = list.filter(c => c.name.includes(search) || c.head.includes(search));
    return list;
  }, [comms, filterStatus, search]);

  const active = useMemo(() => comms.find(c => c.id === activeId) || comms[0], [comms, activeId]);

  const totalMembers = useMemo(() => [...new Set(comms.flatMap(c => c.members.map(m => m.id)))].length, [comms]);
  const totalTasks   = useMemo(() => comms.reduce((a, c) => a + c.tasks.length, 0), [comms]);
  const doneTasks    = useMemo(() => comms.reduce((a, c) => a + c.tasks.filter(t => t.done).length, 0), [comms]);
  const activeCnt    = useMemo(() => comms.filter(c => c.status === "active").length, [comms]);

  const [cForm, setCForm] = useState<any>({ name: "", desc: "", head: "", status: "new", startDate: "", endDate: "", color: "#3B82F6" });
  const [mForm, setMForm] = useState<any>({ employee_id: "", role: "" });
  const [tForm, setTForm] = useState<any>({ text: "", assignee: "", priority: "med", dueDate: "", notes: "" });
  const [cmBusy, setCmBusy] = useState(false);

  useEffect(() => {
    if (drawerMode === "editComm" && active) {
      setCForm({
        name: active.name ?? "", desc: active.desc ?? "",
        head: active.head ?? "", status: active.status ?? "new",
        startDate: active.startDate ?? "", endDate: active.endDate ?? "",
        color: active.color ?? "#3B82F6",
      });
    } else if (drawerMode === "addComm") {
      setCForm({ name: "", desc: "", head: "", status: "new", startDate: "", endDate: "", color: "#3B82F6" });
    }
  }, [drawerMode, active]);

  async function saveCommittee() {
    setCmBusy(true);
    try {
      const payload = {
        name: cForm.name, description: cForm.desc,
        status: cForm.status, color: cForm.color,
        start_date: cForm.startDate || null, end_date: cForm.endDate || null,
      };
      if (drawerMode === "addComm") {
        const r: any = await committeesApi.create(payload);
        const created = r.data ?? r;
        setCommittees(p => [{ ...created, id: String(created.id), members: [], tasks: [], files: [], head: created.head ?? "—", headId: "", ico: "👥", startDate: created.start_date ?? "", endDate: created.end_date ?? "", desc: created.description ?? "" }, ...p]);
        setActiveId(String(created.id));
      } else if (drawerMode === "editComm" && activeId) {
        await committeesApi.update(activeId, payload);
        setCommittees(p => p.map(c => c.id === activeId ? { ...c, ...cForm, desc: cForm.desc } : c));
      }
      setDrawerOpen(false);
    } catch (e: any) { alert("تعذّر الحفظ: " + (e?.message ?? "")); }
    finally { setCmBusy(false); }
  }

  async function saveMember() {
    if (!activeId || !mForm.employee_id) return alert("اختر عضو");
    setCmBusy(true);
    try {
      await committeesApi.addMember(activeId, { employee_id: Number(mForm.employee_id), role: mForm.role || null });
      const fresh: any = await committeesApi.members(activeId);
      const arr = fresh.data ?? fresh ?? [];
      setCommittees(p => p.map(c => c.id === activeId ? { ...c, members: arr.map((m: any) => ({ id: String(m.id), name: m.employee?.name ?? "—", role: m.role ?? "", color: "#059669", subject: "—", avatar: "" })) } : c));
      setDrawerOpen(false);
    } catch { alert("تعذّر الحفظ"); }
    finally { setCmBusy(false); }
  }

  async function saveCommTask() {
    if (!activeId || !tForm.text) return alert("اكتب وصف المهمة");
    setCmBusy(true);
    try {
      await committeesApi.addTask(activeId, { text: tForm.text, priority: tForm.priority, due_date: tForm.dueDate || null, notes: tForm.notes });
      const fresh: any = await committeesApi.tasks(activeId);
      const arr = fresh.data ?? fresh ?? [];
      setCommittees(p => p.map(c => c.id === activeId ? { ...c, tasks: arr.map((t: any) => ({ id: String(t.id), text: t.text ?? t.title ?? "—", assignee: "—", priority: (t.priority ?? "med"), dueDate: t.due_date ?? "", done: Boolean(t.done), notes: t.notes ?? "" })) } : c));
      setDrawerOpen(false);
      setTForm({ text: "", assignee: "", priority: "med", dueDate: "", notes: "" });
    } catch { alert("تعذّر الحفظ"); }
    finally { setCmBusy(false); }
  }

  const toggleTask = async (commId: string, taskId: string) => {
    const c = committees.find(x => x.id === commId);
    const t = c?.tasks.find((x: any) => x.id === taskId);
    if (!c || !t) return;
    setCommittees(prev => prev.map(c => c.id !== commId ? c : { ...c, tasks: c.tasks.map(t => t.id !== taskId ? t : { ...t, done: !t.done }) }));
    try { await committeesApi.updateTask(commId, taskId, { status: t.done ? "todo" : "done" }); } catch {}
  };


  /* ─── Detail panel ─── */
  const renderDetail = () => {
    if (!active) return null;
    const doneCount = active.tasks.filter(t => t.done).length;
    const pendCount = active.tasks.filter(t => !t.done).length;
    const sc = STATUS_COLORS[active.status];
    return (
      <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
        {/* Header */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--brd)", background: active.color + "0A" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: active.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{active.ico}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{active.name}</div>
                <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>
                  <span style={{ marginLeft: 8 }}>👑 {active.head}</span>
                  <span>📅 {active.startDate} ← {active.endDate}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.c, border: "1px solid " + sc.brd, fontWeight: 700 }}>{STATUS_LABELS[active.status]}</span>
              <button onClick={() => { setDrawerMode("editComm"); setDrawerOpen(true); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✏️ تعديل</button>
              <button style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑️</button>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--tx2)", lineHeight: 1.55 }}>{active.desc}</div>
          {/* KPI row */}
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Progress ring — SVG */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width={58} height={58} viewBox="0 0 58 58" style={{ transform: "rotate(-90deg)" }}>
                <circle cx={29} cy={29} r={24} fill="none" stroke="var(--bg3)" strokeWidth={5} />
                <circle cx={29} cy={29} r={24} fill="none" stroke={active.color} strokeWidth={5}
                  strokeDasharray={`${(2 * Math.PI * 24) * active.progress / 100} ${(2 * Math.PI * 24) * (1 - active.progress / 100)}`}
                  strokeLinecap="round" />
                <text x={29} y={32} textAnchor="middle" fontSize={11} fontWeight={800}
                  fill={active.color} style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
                  {active.progress}%
                </text>
              </svg>
              <div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>الإنجاز</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: active.color }}>{active.progress}%</div>
              </div>
            </div>
            {[
              { v: active.members.length, ar: "عضو",       c: "#2563EB" },
              { v: doneCount,             ar: "مهمة منجزة", c: "#059669" },
              { v: pendCount,             ar: "مهمة معلقة", c: pendCount > 0 ? "#DC2626" : "#059669" },
              { v: active.files.length,   ar: "ملف",        c: "#7C3AED" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "6px 12px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>{s.ar}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--brd)", overflowX: "auto", background: "var(--bg1)" }}>
          {([
            { id: "overview", ar: "نظرة عامة", ico: "📊", badge: 0 },
            { id: "members",  ar: "الأعضاء",   ico: "👥", badge: active.members.length },
            { id: "tasks",    ar: "المهام",     ico: "✅", badge: pendCount },
            { id: "files",    ar: "الملفات",    ico: "📁", badge: active.files.length },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setDetailTab(t.id)} style={{ padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: detailTab === t.id ? "#E8702A" : "var(--tx2)", borderBottom: detailTab === t.id ? "2px solid #E8702A" : "2px solid transparent", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
              {t.ico} {t.ar}
              {t.badge > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 7, background: detailTab === t.id ? "#E8702A" : "var(--bg3)", color: detailTab === t.id ? "#fff" : "var(--tx2)" }}>{t.badge}</span>}
            </button>
          ))}
        </div>
        {/* Tab content */}
        <div style={{ minHeight: 300 }}>
          {detailTab === "overview" && renderOverview(active)}
          {detailTab === "members"  && renderMembers(active)}
          {detailTab === "tasks"    && renderTasks(active)}
          {detailTab === "files"    && renderFiles(active)}
        </div>
      </div>
    );
  };

  const renderOverview = (comm: typeof active) => {
    if (!comm) return null;
    const byAssignee: Record<string, { done: number; total: number }> = {};
    comm.tasks.forEach(t => {
      if (!byAssignee[t.assignee]) byAssignee[t.assignee] = { done: 0, total: 0 };
      byAssignee[t.assignee].total++;
      if (t.done) byAssignee[t.assignee].done++;
    });
    return (
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)", marginBottom: 10 }}>إنجاز كل عضو</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comm.members.map(m => {
              const stats = byAssignee[m.name] || { done: 0, total: 0 };
              const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{m.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                      <span>{m.name}</span>
                      <span style={{ color: comm.color }}>{stats.done}/{stats.total}</span>
                    </div>
                    <div style={{ height: 5, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, width: pct + "%", background: comm.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>أقرب المهام الموعد</div>
          {comm.tasks.filter(t => !t.done).slice(0, 3).map(t => {
            const p = PRIO[t.priority];
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", background: "var(--bg3)", borderRadius: 9, marginBottom: 6, border: "1px solid var(--brd)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.c, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.text}</div>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>📅 {t.dueDate} · 👤 {t.assignee}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: p.bg, color: p.c, border: "1px solid " + p.brd }}>{p.ar}</span>
              </div>
            );
          })}
          {comm.tasks.filter(t => !t.done).length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>🎉 كل المهام مكتملة</div>
          )}
        </div>
      </div>
    );
  };

  const renderMembers = (comm: typeof active) => {
    if (!comm) return null;
    return (
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)" }}>{comm.members.length} أعضاء</div>
          <button onClick={() => { setDrawerMode("addMember"); setDrawerOpen(true); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>+ إضافة عضو</button>
        </div>
        <div style={{ border: "1.5px solid var(--brd)", borderRadius: 11, overflow: "hidden" }}>
          {comm.members.map((m, i) => {
            const roleClass = m.role === "رئيس" ? "#DC2626" : m.role === "مقرر" ? "#7C3AED" : "#2563EB";
            const roleBg    = m.role === "رئيس" ? "#FEF2F2" : m.role === "مقرر" ? "#F5F3FF" : "#EFF6FF";
            const roleBrd   = m.role === "رئيس" ? "#FCA5A5" : m.role === "مقرر" ? "#DDD6FE" : "#BFDBFE";
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderBottom: i < comm.members.length - 1 ? "1px solid var(--brd)" : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{m.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>📚 {m.subject}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: roleBg, color: roleClass, border: "1px solid " + roleBrd }}>{m.role}</span>
                <div style={{ display: "flex", gap: 5 }}>
                  <button style={{ padding: "4px 8px", borderRadius: 6, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>دور</button>
                  <button style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTasks = (comm: typeof active) => {
    if (!comm) return null;
    const pending = comm.tasks.filter(t => !t.done);
    const done    = comm.tasks.filter(t => t.done);
    return (
      <div>
        <div style={{ padding: "12px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)" }}>{pending.length} معلقة · {done.length} منجزة</div>
          <button onClick={() => { setDrawerMode("addTask"); setDrawerOpen(true); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>+ مهمة</button>
        </div>
        {comm.tasks.map(t => {
          const p = PRIO[t.priority];
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--brd)" }}>
              <div
                onClick={() => toggleTask(comm.id, t.id)}
                style={{ width: 18, height: 18, borderRadius: 5, background: t.done ? "#E8702A" : "var(--bg3)", border: "2px solid " + (t.done ? "#E8702A" : "var(--brd2)"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                {t.done && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? .5 : 1, lineHeight: 1.4 }}>{t.text}</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--tx2)" }}>👤 {t.assignee}</span>
                  <span style={{ fontSize: 10, color: "var(--tx2)" }}>📅 {t.dueDate}</span>
                  {t.notes && <span style={{ fontSize: 9, color: "var(--tx2)", fontStyle: "italic", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📌 {t.notes}</span>}
                </div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: p.bg, color: p.c, border: "1px solid " + p.brd, flexShrink: 0 }}>{p.ar}</span>
              <button style={{ padding: "3px 7px", borderRadius: 6, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 10, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>✏️</button>
            </div>
          );
        })}
        {comm.tasks.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>لا توجد مهام بعد</div>}
      </div>
    );
  };

  const renderFiles = (comm: typeof active) => {
    if (!comm) return null;
    return (
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)" }}>{comm.files.length} ملفات</div>
          <button style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📎 رفع ملف</button>
        </div>
        {comm.files.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)", fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 10, opacity: .3 }}>📁</div>
            لا توجد ملفات بعد. ارفع الكشوف والوثائق هنا
          </div>
        ) : (
          <div style={{ border: "1.5px solid var(--brd)", borderRadius: 11, overflow: "hidden" }}>
            {comm.files.map((f, i) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderBottom: i < comm.files.length - 1 ? "1px solid var(--brd)" : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: TYPE_BG[f.type] || "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{TYPE_ICO[f.type] || "📄"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{f.date} · {f.size}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "var(--bg3)", color: "var(--tx2)", border: "1px solid var(--brd)", textTransform: "uppercase" }}>{f.type}</span>
                <div style={{ display: "flex", gap: 5 }}>
                  <button style={{ padding: "5px 8px", borderRadius: 6, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>⬇️</button>
                  <button style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ─── Drawer ─── */
  const renderDrawer = () => {
    const comm = comms.find(c => c.id === activeId);
    const DRAWER_TITLES = { addComm: "لجنة جديدة", editComm: "تعديل اللجنة", addMember: "إضافة عضو", addTask: "إضافة مهمة" };
    const fiStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none" };
    const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 };
    return (
      <>
        <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200 }} />
        <div style={{ position: "fixed", top: 0, left: 0, width: 420, maxWidth: "95vw", height: "100vh", background: "var(--bg1)", boxShadow: "-4px 0 30px rgba(0,0,0,.18)", display: "flex", flexDirection: "column", zIndex: 201 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{DRAWER_TITLES[drawerMode]}</div>
            <button onClick={() => setDrawerOpen(false)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "var(--bg3)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {(drawerMode === "addComm" || drawerMode === "editComm") && (
              <>
                <div><label style={lbl}>اسم اللجنة *</label><input style={fiStyle} placeholder="مثال: لجنة الاختبارات الفصلية" value={cForm.name} onChange={e => setCForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
                <div><label style={lbl}>الوصف</label><textarea placeholder="وصف مهمة اللجنة..." style={{ ...fiStyle, resize: "vertical", minHeight: 70 }} value={cForm.desc} onChange={e => setCForm((p: any) => ({ ...p, desc: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>رئيس اللجنة</label>
                    <input style={fiStyle} placeholder="اسم الرئيس" value={cForm.head} onChange={e => setCForm((p: any) => ({ ...p, head: e.target.value }))} />
                  </div>
                  <div><label style={lbl}>الحالة</label>
                    <select style={{ ...fiStyle, cursor: "pointer" }} value={cForm.status} onChange={e => setCForm((p: any) => ({ ...p, status: e.target.value }))}>
                      <option value="new">جديدة</option><option value="active">نشطة</option><option value="paused">موقوفة</option><option value="done">مكتملة</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>تاريخ البداية</label><input type="date" style={fiStyle} value={cForm.startDate} onChange={e => setCForm((p: any) => ({ ...p, startDate: e.target.value }))} /></div>
                  <div><label style={lbl}>تاريخ النهاية</label><input type="date" style={fiStyle} value={cForm.endDate} onChange={e => setCForm((p: any) => ({ ...p, endDate: e.target.value }))} /></div>
                </div>
                <div>
                  <label style={lbl}>لون اللجنة</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["#3B82F6", "#DC2626", "#F59E0B", "#8B5CF6", "#059669", "#E8702A", "#0891B2", "#EC4899"].map(col => (
                      <div key={col} onClick={() => setCForm((p: any) => ({ ...p, color: col }))} style={{ width: 28, height: 28, borderRadius: 7, background: col, cursor: "pointer", border: "3px solid " + (col === cForm.color ? "var(--tx0)" : "transparent") }} />
                    ))}
                  </div>
                </div>
              </>
            )}
            {drawerMode === "addMember" && comm && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 4 }}>إضافة عضو إلى <strong>{comm.name}</strong></div>
                <div><label style={lbl}>رقم الموظف *</label><input type="number" style={fiStyle} placeholder="مثال: 12345" value={mForm.employee_id} onChange={e => setMForm((p: any) => ({ ...p, employee_id: e.target.value }))} /></div>
                <div><label style={lbl}>الدور في اللجنة</label><input style={fiStyle} placeholder="مثال: مقرر، أمين، عضو" value={mForm.role} onChange={e => setMForm((p: any) => ({ ...p, role: e.target.value }))} /></div>
              </div>
            )}
            {drawerMode === "addTask" && comm && (
              <>
                <div><label style={lbl}>المهمة *</label><input style={fiStyle} placeholder="وصف المهمة المطلوب إنجازها..." value={tForm.text} onChange={e => setTForm((p: any) => ({ ...p, text: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>المُكلَّف</label>
                    <input style={fiStyle} placeholder="اسم المُكلَّف" value={tForm.assignee} onChange={e => setTForm((p: any) => ({ ...p, assignee: e.target.value }))} />
                  </div>
                  <div><label style={lbl}>الأولوية</label>
                    <select style={{ ...fiStyle, cursor: "pointer" }} value={tForm.priority} onChange={e => setTForm((p: any) => ({ ...p, priority: e.target.value }))}>
                      <option value="high">عاجل</option><option value="med">متوسط</option><option value="low">عادي</option>
                    </select>
                  </div>
                </div>
                <div><label style={lbl}>الموعد النهائي</label><input type="date" style={fiStyle} value={tForm.dueDate} onChange={e => setTForm((p: any) => ({ ...p, dueDate: e.target.value }))} /></div>
                <div><label style={lbl}>ملاحظات</label><input style={fiStyle} placeholder="ملاحظات إضافية..." value={tForm.notes} onChange={e => setTForm((p: any) => ({ ...p, notes: e.target.value }))} /></div>
              </>
            )}
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--brd)", display: "flex", gap: 7, flexShrink: 0 }}>
            <button
              onClick={() => {
                if (drawerMode === "addComm" || drawerMode === "editComm") saveCommittee();
                else if (drawerMode === "addMember") saveMember();
                else if (drawerMode === "addTask") saveCommTask();
              }}
              disabled={cmBusy}
              style={{ flex: 1, padding: "9px 14px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: cmBusy ? "wait" : "pointer", fontFamily: "inherit", justifyContent: "center", opacity: cmBusy ? 0.6 : 1 }}>
              💾 {cmBusy ? "جاري..." : "حفظ"}
            </button>
            <button onClick={() => setDrawerOpen(false)} style={{ padding: "9px 14px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>إلغاء</button>
          </div>
        </div>
      </>
    );
  };

  /* ─── Main Render ─────────────────────────────────────────────────── */
  const pendingTotal = totalTasks - doneTasks;
  return (
    <DashboardLayout title={lang === "ar" ? "إدارة اللجان" : "Committees"}>
      {drawerOpen && renderDrawer()}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>إدارة اللجان المدرسية</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{activeCnt} لجنة نشطة · {totalMembers} عضو · {doneTasks}/{totalTasks} مهمة مكتملة</div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📊 تصدير</button>
          <button onClick={() => { setDrawerMode("addComm"); setDrawerOpen(true); }} style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ لجنة جديدة</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: activeCnt,    ar: "لجان نشطة",     c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
          { v: totalMembers, ar: "أعضاء إجمالاً",  c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
          { v: doneTasks,    ar: "مهام مكتملة",    c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
          { v: pendingTotal, ar: "مهام معلقة",     c: pendingTotal > 5 ? "#DC2626" : "#B45309", bg: pendingTotal > 5 ? "#FEF2F2" : "#FFFBEB", brd: pendingTotal > 5 ? "#FCA5A5" : "#FCD34D" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: "1px solid " + s.brd, borderRadius: 11, padding: "11px 14px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.ar}</div>
          </div>
        ))}
      </div>

      {/* Split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12, alignItems: "start" }}>
        {/* Left: list */}
        <div>
          {/* Search + filter */}
          <div style={{ marginBottom: 8 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث عن لجنة..."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none", marginBottom: 6 }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {([{ id: "all", ar: "الكل" }, { id: "active", ar: "نشطة" }, { id: "done", ar: "مكتملة" }, { id: "new", ar: "جديدة" }] as const).map(f => (
                <button key={f.id} onClick={() => setFilterStatus(f.id as CommStatus | "all")} style={{ padding: "3px 9px", borderRadius: 5, border: "1.5px solid " + (filterStatus === f.id ? "#E8702A" : "var(--brd)"), background: filterStatus === f.id ? "#FEF3E8" : "var(--bg1)", color: filterStatus === f.id ? "#E8702A" : "var(--tx2)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{f.ar}</button>
              ))}
            </div>
          </div>
          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {loadingApi && <div style={{ textAlign: "center", padding: 30, color: "var(--tx2)", fontSize: 12 }}>جارٍ التحميل…</div>}
            {!loadingApi && listed.map(comm => (
              <div
                key={comm.id}
                onClick={() => { setActiveId(comm.id); setDetailTab("overview"); }}
                style={{ display: "flex", overflow: "hidden", background: "var(--bg1)", border: "1.5px solid " + (comm.id === activeId ? "#E8702A" : "var(--brd)"), borderRadius: 12, cursor: "pointer", boxShadow: "var(--card-sh)" }}
              >
                <div style={{ width: 4, flexShrink: 0, background: comm.color }} />
                <div style={{ flex: 1, padding: "11px 13px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ fontSize: 18, flexShrink: 0, marginTop: -1 }}>{comm.ico}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.3 }}>{comm.name}</div>
                        <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{comm.head}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 5, background: STATUS_COLORS[comm.status].bg, color: STATUS_COLORS[comm.status].c, border: "1px solid " + STATUS_COLORS[comm.status].brd, fontWeight: 700, flexShrink: 0 }}>{STATUS_LABELS[comm.status]}</span>
                  </div>
                  {/* Mini progress */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--tx2)", marginBottom: 3 }}>
                      <span>{comm.members.length} أعضاء · {comm.tasks.filter(t => t.done).length}/{comm.tasks.length} مهمة</span>
                      <span style={{ fontWeight: 700, color: comm.color }}>{comm.progress}%</span>
                    </div>
                    <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: comm.progress + "%", background: comm.color }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!loadingApi && listed.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "var(--tx2)", fontSize: 12 }}>لا توجد بيانات</div>}
          </div>
        </div>
        {/* Right: detail */}
        <div>{renderDetail()}</div>
      </div>
    </DashboardLayout>
  );
}
