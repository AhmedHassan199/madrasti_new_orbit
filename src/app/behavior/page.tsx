"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { behaviorApi } from "@/lib/modules-api";

/* ═══════════════════════════════════════
   CONFIGS — severity + status
═══════════════════════════════════════ */
const SEV: Record<number, { ar: string; en: string; stripe: string; bg: string; c: string; brd: string }> = {
  1: { ar: "منخفض", en: "Low",     stripe: "#22C55E", bg: "#F0FDF4", c: "#16A34A", brd: "#86EFAC" },
  2: { ar: "متوسط", en: "Medium",  stripe: "#F59E0B", bg: "#FFFBEB", c: "#B45309", brd: "#FCD34D" },
  3: { ar: "مرتفع", en: "High",    stripe: "#F97316", bg: "#FFF0E9", c: "#C2410C", brd: "#FDBA74" },
  4: { ar: "حرج",   en: "Critical",stripe: "#EF4444", bg: "#FEF2F2", c: "#DC2626", brd: "#FCA5A5" },
};
const STATUS: Record<string, { ar: string; en: string; bg: string; c: string; brd: string; ico: string }> = {
  open:   { ar: "مفتوحة",      en: "Open",     bg: "#EFF6FF", c: "#2563EB", brd: "#BFDBFE", ico: "🔵" },
  prog:   { ar: "جارٍ",         en: "In Progress", bg: "#FFFBEB", c: "#B45309", brd: "#FCD34D", ico: "🟡" },
  closed: { ar: "مغلقة",       en: "Closed",   bg: "#ECFDF5", c: "#059669", brd: "#A7F3D0", ico: "🟢" },
};

const AV_COLORS = ["#EF4444", "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#E8702A", "#EC4899", "#0891B2"];
const avColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return AV_COLORS[h % AV_COLORS.length]; };

/* Normalize an API incident row to a consistent shape */
function normalizeIncident(raw: any): any {
  const statusRaw = String(raw.status ?? "open").toLowerCase();
  const status = statusRaw === "open" ? "open"
    : statusRaw === "closed" || statusRaw === "resolved" ? "closed"
    : "prog";
  const student = raw.student ?? raw.employee?.name ?? raw.employee_name ?? "—";
  return {
    id: String(raw.id),
    student,
    cls: raw.cls ?? raw.class ?? raw.employee?.group?.name ?? raw.class_name ?? "—",
    av: raw.av ?? avColor(student),
    type: raw.type ?? raw.rule?.name ?? raw.rule_name ?? "—",
    severity: Number(raw.severity ?? 1),
    desc: raw.description ?? raw.desc ?? "",
    action: raw.action ?? "",
    actionDone: Boolean(raw.action_completed ?? raw.actionDone),
    status,
    date: raw.incident_date ?? raw.date ?? "",
    time: raw.incident_time ?? raw.time ?? "",
    reporter: raw.reporter ?? raw.reported_by ?? raw.created_by_name ?? "—",
    parent: raw.parent ?? (raw.parent_notified ? "تم الإبلاغ" : "لم يُبلَّغ بعد"),
    followup: raw.followup ?? "",
    notes: raw.notes ?? "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    rule_id: raw.behavior_rule_id ?? raw.rule_id ?? null,
    employee_id: raw.employee_id ?? null,
  };
}

export default function BehaviorPage() {
  useUi();
  const [activeTab, setActiveTab] = useState<"incidents" | "analytics" | "followup" | "rules">("incidents");
  const [filter, setFilter]       = useState("all");
  const [severity, setSeverity]   = useState<string>("all");
  const [search, setSearch]       = useState("");

  const [incidents, setIncidents] = useState<any[]>([]);
  const [rules, setRules]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  /* drawers */
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [saving, setSaving]         = useState(false);

  /* forms */
  const [form, setForm] = useState<any>({
    employee_id: "", student: "", cls: "", type: "", description: "",
    severity: 2, action: "", incident_date: new Date().toISOString().slice(0, 10),
    status: "open", notes: "", parent_notified: true, rule_id: null,
  });
  const [followupText, setFollowupText] = useState("");

  const reload = () =>
    behaviorApi.incidents({}).then((r: any) => {
      const arr = r.data ?? r ?? [];
      setIncidents((Array.isArray(arr) ? arr : []).map(normalizeIncident));
    });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      behaviorApi.incidents({}),
      behaviorApi.rules({}),
    ]).then(([inc, rul]: any[]) => {
      const arrI = inc.data ?? inc ?? [];
      const arrR = rul.data ?? rul ?? [];
      setIncidents((Array.isArray(arrI) ? arrI : []).map(normalizeIncident));
      setRules(Array.isArray(arrR) ? arrR : []);
    }).finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    let list = incidents.slice();
    if (search) list = list.filter(i => i.student.includes(search) || i.type.includes(search) || i.cls.includes(search));
    if (filter === "urgent") list = list.filter(i => i.severity >= 4 && i.status !== "closed");
    else if (filter !== "all") list = list.filter(i => i.status === filter);
    if (severity !== "all") list = list.filter(i => i.severity === Number(severity));
    return list;
  }, [incidents, search, filter, severity]);

  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter(i => i.status === "open").length,
    prog: incidents.filter(i => i.status === "prog").length,
    urgent: incidents.filter(i => i.severity >= 4 && i.status !== "closed").length,
    closed: incidents.filter(i => i.status === "closed").length,
  }), [incidents]);

  const selected = selectedId ? incidents.find(i => i.id === selectedId) ?? null : null;

  function openAdd() {
    setEditMode(false);
    setForm({ employee_id: "", student: "", cls: "", type: "", description: "", severity: 2, action: "", incident_date: new Date().toISOString().slice(0, 10), status: "open", notes: "", parent_notified: true, rule_id: null });
    setAddOpen(true);
  }

  function openEdit(inc: any) {
    setEditMode(true);
    setForm({
      id: inc.id,
      employee_id: inc.employee_id ?? "", student: inc.student, cls: inc.cls,
      type: inc.type, description: inc.desc, severity: inc.severity, action: inc.action,
      incident_date: inc.date, status: inc.status, notes: inc.notes,
      parent_notified: Boolean(inc.parent !== "لم يُبلَّغ بعد"), rule_id: inc.rule_id,
    });
    setAddOpen(true);
    setDetailOpen(false);
  }

  function openDetail(id: string) {
    const inc = incidents.find(i => i.id === id);
    setSelectedId(id);
    setFollowupText(inc?.followup ?? "");
    setDetailOpen(true);
  }

  async function saveIncident() {
    if (!form.employee_id) return alert("الرجاء إدخال رقم الطالب (employee_id)");
    if (!form.description) return alert("الرجاء كتابة وصف المخالفة");
    setSaving(true);
    try {
      const payload: any = {
        employee_id: Number(form.employee_id),
        description: form.description,
        severity: form.severity,
        action: form.action,
        incident_date: form.incident_date,
        status: form.status,
        notes: form.notes,
        parent_notified: form.parent_notified,
        rule_id: form.rule_id || undefined,
        type: form.type,
      };
      if (editMode && form.id) {
        await behaviorApi.updateIncident(form.id, payload);
      } else {
        await behaviorApi.createIncident(payload);
      }
      await reload();
      setAddOpen(false);
    } catch (e: any) {
      alert("تعذّر الحفظ: " + (e?.message ?? ""));
    } finally { setSaving(false); }
  }

  async function closeIncident(id: string) {
    try { await behaviorApi.closeIncident(id, "closed"); await reload(); setDetailOpen(false); }
    catch { alert("تعذّر الإغلاق"); }
  }
  async function reopenIncident(id: string) {
    try { await behaviorApi.closeIncident(id, "open"); await reload(); }
    catch { alert("تعذّر إعادة الفتح"); }
  }
  async function deleteIncident(id: string) {
    if (!confirm("متأكد من حذف هذه المخالفة؟")) return;
    try { await behaviorApi.deleteIncident(id); await reload(); setDetailOpen(false); }
    catch { alert("تعذّر الحذف"); }
  }
  async function saveFollowup() {
    if (!selected) return;
    try {
      const nextStatus = followupText.trim() && selected.status === "open" ? "prog" : selected.status;
      await behaviorApi.updateIncident(selected.id, { followup: followupText, status: nextStatus });
      await reload();
      alert("💾 تم حفظ خطة المتابعة");
    } catch { alert("تعذّر الحفظ"); }
  }
  async function notifyParent(id: string) {
    try { await behaviorApi.updateIncident(id, { parent_notified: true }); await reload(); alert("📱 تم إبلاغ ولي الأمر"); }
    catch { alert("تعذّر الإرسال"); }
  }

  /* Rules CRUD */
  const [ruleForm, setRuleForm] = useState<any>({ id: null, name: "", severity: 1, first_action: "", repeat_action: "", color: "#22C55E" });
  const [ruleOpen, setRuleOpen] = useState(false);
  async function saveRule() {
    if (!ruleForm.name) return alert("الرجاء إدخال اسم القاعدة");
    try {
      const payload = { name: ruleForm.name, severity: ruleForm.severity, first_action: ruleForm.first_action, repeat_action: ruleForm.repeat_action, color: ruleForm.color };
      if (ruleForm.id) await behaviorApi.updateRule(ruleForm.id, payload);
      else             await behaviorApi.createRule(payload);
      const r: any = await behaviorApi.rules({});
      setRules(r.data ?? r ?? []);
      setRuleOpen(false);
    } catch { alert("تعذّر الحفظ"); }
  }
  async function deleteRule(id: string) {
    if (!confirm("حذف هذه القاعدة؟")) return;
    try { await behaviorApi.deleteRule(id); const r: any = await behaviorApi.rules({}); setRules(r.data ?? r ?? []); }
    catch { alert("تعذّر الحذف"); }
  }

  /* ═══ ANALYTICS computed data ═══ */
  const analytics = useMemo(() => {
    const typeCount: Record<string, number> = {};
    const clsCount:  Record<string, number> = {};
    const sevCount: Record<number, number>  = { 1: 0, 2: 0, 3: 0, 4: 0 };
    incidents.forEach(i => {
      typeCount[i.type] = (typeCount[i.type] ?? 0) + 1;
      clsCount[i.cls]   = (clsCount[i.cls]   ?? 0) + 1;
      sevCount[i.severity] = (sevCount[i.severity] ?? 0) + 1;
    });
    const topTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxType  = topTypes[0]?.[1] ?? 1;
    const topCls   = Object.entries(clsCount).sort((a, b) => b[1] - a[1]);
    const maxCls   = topCls[0]?.[1] ?? 1;
    const stCnt:   Record<string, { cnt: number; cls: string; av: string; sev: number }> = {};
    incidents.forEach(i => {
      if (!stCnt[i.student]) stCnt[i.student] = { cnt: 0, cls: i.cls, av: i.av, sev: 0 };
      stCnt[i.student].cnt++;
      stCnt[i.student].sev = Math.max(stCnt[i.student].sev, i.severity);
    });
    const topOffenders = Object.entries(stCnt).sort((a, b) => b[1].cnt - a[1].cnt).slice(0, 5);
    // Heatmap: 5 days × 7 weeks of random-but-deterministic data from incidents dates
    const heat = Array.from({ length: 5 }, (_, d) => Array.from({ length: 7 }, (_, w) => {
      // count incidents within day-of-week=d and week offset=w (simple seed)
      return incidents.filter(i => {
        if (!i.date) return false;
        const dt = new Date(i.date);
        return dt.getDay() === (d === 4 ? 4 : d + 6) % 7 && Math.floor((Date.now() - dt.getTime()) / (7 * 86400000)) === w;
      }).length;
    }));
    return { topTypes, maxType, topCls, maxCls, sevCount, topOffenders, heat };
  }, [incidents]);

  return (
    <DashboardLayout title="إدارة السلوك والانضباط" subtitle={`${stats.open + stats.prog} مخالفة نشطة${stats.urgent > 0 ? " · " + stats.urgent + " حرجة" : ""}`}>
      <style>{`
        .bv-chip { padding: 5px 11px; border-radius: 14px; border: 1px solid var(--brd); background: var(--bg1); color: var(--tx2); font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .bv-chip.on { background: #FEF3E8; color: #E8702A; border-color: #E8702A; }
        .bv-sev { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 5px; }
        .bv-sev.s1 { background: #F0FDF4; color: #16A34A; border: 1px solid #86EFAC; }
        .bv-sev.s2 { background: #FFFBEB; color: #B45309; border: 1px solid #FCD34D; }
        .bv-sev.s3 { background: #FFF0E9; color: #C2410C; border: 1px solid #FDBA74; }
        .bv-sev.s4 { background: #FEF2F2; color: #DC2626; border: 1px solid #FCA5A5; }
        .bv-status { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 5px; }
        .bv-status.open { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
        .bv-status.prog { background: #FFFBEB; color: #B45309; border: 1px solid #FCD34D; }
        .bv-status.closed { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
        .bv-card { background: var(--bg1); border: 1.5px solid var(--brd); border-radius: 12px; box-shadow: var(--card-sh); cursor: pointer; transition: all .15s; }
        .bv-card:hover { border-color: #E8702A; transform: translateY(-1px); }
        .bv-stripe { width: 4px; flex-shrink: 0; }
        .bv-action { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 5px; background: var(--bg3); color: var(--tx1); border: 1px solid var(--brd); }
        .bv-hm-cell { border-radius: 3px; cursor: pointer; transition: all .15s; }
      `}</style>

      {/* ══ ADD/EDIT INCIDENT DRAWER ══ */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,.45)" }} onClick={() => setAddOpen(false)} />
          <div style={{ width: 460, background: "var(--bg1)", boxShadow: "-4px 0 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{editMode ? "تعديل المخالفة" : "تسجيل مخالفة جديدة"}</div>
              <button onClick={() => setAddOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "var(--bg3)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Fld label="رقم الطالب *" type="number" value={form.employee_id} onChange={v => setForm((p: any) => ({ ...p, employee_id: v }))} placeholder="84728" />
                <Fld label="اسم الطالب" value={form.student} onChange={v => setForm((p: any) => ({ ...p, student: v }))} placeholder="يُعبَّأ تلقائياً" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Sel label="الصف" value={form.cls} onChange={v => setForm((p: any) => ({ ...p, cls: v }))} options={["", "1/أ", "1/ب", "2/أ", "2/ب", "3/أ", "3/ب", "4/أ", "4/ب"]} />
                <Sel label="القاعدة / النوع" value={String(form.rule_id ?? "")}
                  onChange={(v: string) => {
                    const r: any = rules.find((x: any) => String(x.id) === v);
                    setForm((p: any) => ({ ...p, rule_id: v || null, type: r?.name ?? p.type, severity: r?.severity ?? p.severity }));
                  }}
                  options={["", ...rules.map((r: any) => String(r.id))]}
                  labels={["— اختر —", ...rules.map((r: any) => r.name)]} />
              </div>
              <Fld label="نوع المخالفة *" value={form.type} onChange={v => setForm((p: any) => ({ ...p, type: v }))} placeholder="تشويش / تنمر / ..." />
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الوصف *</label>
                <textarea value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={4} placeholder="اكتب وصفاً للحادثة..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Sel label="درجة الخطورة" value={String(form.severity)} onChange={v => setForm((p: any) => ({ ...p, severity: Number(v) }))} options={["1", "2", "3", "4"]} labels={[SEV[1].ar, SEV[2].ar, SEV[3].ar, SEV[4].ar]} />
                <Sel label="الإجراء المتخذ" value={form.action} onChange={v => setForm((p: any) => ({ ...p, action: v }))} options={["", "تنبيه شفهي", "إنذار كتابي", "مصادرة الهاتف", "استدعاء ولي الأمر", "إيقاف يوم", "إيقاف مؤقت", "صفر + إنذار", "تعويض مالي", "إحالة للإدارة"]} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Fld label="التاريخ" type="date" value={form.incident_date} onChange={v => setForm((p: any) => ({ ...p, incident_date: v }))} />
                <Sel label="الحالة" value={form.status} onChange={v => setForm((p: any) => ({ ...p, status: v }))} options={["open", "prog", "closed"]} labels={["مفتوحة", "قيد المتابعة", "مغلقة"]} />
              </div>
              <Fld label="ملاحظات" value={form.notes} onChange={v => setForm((p: any) => ({ ...p, notes: v }))} placeholder="ملاحظات إضافية..." />
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)", cursor: "pointer" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>📱 إبلاغ ولي الأمر فوراً</span>
                <input type="checkbox" checked={form.parent_notified} onChange={e => setForm((p: any) => ({ ...p, parent_notified: e.target.checked }))} />
              </label>
            </div>
            <div style={{ padding: "13px 18px", borderTop: "1px solid var(--brd)", display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={saveIncident} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري..." : (editMode ? "حفظ التعديلات" : "تسجيل المخالفة")}</button>
              <button onClick={() => setAddOpen(false)} style={{ padding: "10px 16px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DETAIL DRAWER ══ */}
      {detailOpen && selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,.45)" }} onClick={() => setDetailOpen(false)} />
          <div style={{ width: 480, background: "var(--bg1)", boxShadow: "-4px 0 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between", background: SEV[selected.severity].bg, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: selected.av, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>{selected.student.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{selected.student}</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)" }}>🏫 {selected.cls} · {selected.date} {selected.time}</div>
                </div>
              </div>
              <button onClick={() => setDetailOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(0,0,0,.08)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{selected.type}</span>
                <span className={`bv-sev s${selected.severity}`}>{SEV[selected.severity].ar}</span>
                <span className={`bv-status ${selected.status}`}>{STATUS[selected.status].ico} {STATUS[selected.status].ar}</span>
              </div>
              {selected.desc && (
                <div style={{ background: "var(--bg3)", borderRadius: 11, padding: "13px 14px", border: "1px solid var(--brd)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx2)", marginBottom: 5 }}>📝 وصف الحادثة</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65 }}>{selected.desc}</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["المُبلِّغ", selected.reporter],
                  ["الإجراء المتخذ", `${selected.action || "—"}${selected.actionDone ? " ✓" : " ⏳"}`],
                  ["ولي الأمر", selected.parent],
                  ["التاريخ", `${selected.date} ${selected.time}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 9, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "var(--tx2)", fontWeight: 700, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 5 }}>🔔 خطة المتابعة</div>
                <textarea value={followupText} onChange={e => setFollowupText(e.target.value)} rows={3} placeholder="أضف خطة متابعة..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
              </div>
              {selected.notes && (
                <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 9, padding: "10px 13px", fontSize: 12 }}>
                  📌 <strong>ملاحظة:</strong> {selected.notes}
                </div>
              )}
              {selected.tags.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {selected.tags.map((t: string) => (
                    <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "13px 18px", borderTop: "1px solid var(--brd)", display: "flex", gap: 7, flexWrap: "wrap", flexShrink: 0 }}>
              <button onClick={saveFollowup} style={{ flex: 1, padding: "7px 12px", borderRadius: 8, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>💾 حفظ المتابعة</button>
              <button onClick={() => notifyParent(selected.id)} style={{ flex: 1, padding: "7px 12px", borderRadius: 8, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>📱 إبلاغ ولي الأمر</button>
              <button onClick={() => openEdit(selected)} style={{ padding: "7px 12px", borderRadius: 8, background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>✏️</button>
              {selected.status !== "closed" ? (
                <button onClick={() => closeIncident(selected.id)} style={{ padding: "7px 12px", borderRadius: 8, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>✓ إغلاق</button>
              ) : (
                <button onClick={() => reopenIncident(selected.id)} style={{ padding: "7px 12px", borderRadius: 8, background: "var(--bg3)", color: "var(--tx2)", border: "1px solid var(--brd)", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>↩ إعادة فتح</button>
              )}
              <button onClick={() => deleteIncident(selected.id)} style={{ padding: "7px 12px", borderRadius: 8, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>🗑️</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ RULE EDIT MODAL ══ */}
      {ruleOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={() => setRuleOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, background: "var(--bg1)", borderRadius: 14, border: "1px solid var(--brd)", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{ruleForm.id ? "✏️ تعديل القاعدة" : "+ قاعدة جديدة"}</div>
            <Fld label="اسم القاعدة *" value={ruleForm.name} onChange={v => setRuleForm((p: any) => ({ ...p, name: v }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Sel label="الخطورة" value={String(ruleForm.severity)} onChange={v => setRuleForm((p: any) => ({ ...p, severity: Number(v), color: SEV[Number(v) as 1 | 2 | 3 | 4].stripe }))} options={["1", "2", "3", "4"]} labels={[SEV[1].ar, SEV[2].ar, SEV[3].ar, SEV[4].ar]} />
              <Fld label="اللون" value={ruleForm.color} onChange={v => setRuleForm((p: any) => ({ ...p, color: v }))} />
            </div>
            <Fld label="إجراء المرة الأولى" value={ruleForm.first_action} onChange={v => setRuleForm((p: any) => ({ ...p, first_action: v }))} />
            <Fld label="إجراء التكرار" value={ruleForm.repeat_action} onChange={v => setRuleForm((p: any) => ({ ...p, repeat_action: v }))} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveRule} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#E8702A", color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>💾 حفظ</button>
              <button onClick={() => setRuleOpen(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1.5px solid var(--brd)", background: "var(--bg3)", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAGE HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>إدارة السلوك والانضباط</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
            {stats.open + stats.prog} مخالفة نشطة
            {stats.urgent > 0 && <span style={{ color: "#DC2626", fontWeight: 700 }}> · {stats.urgent} حرجة</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button className="btn btn-g btn-sm">📊 تصدير</button>
          <button onClick={openAdd} className="btn btn-p">+ تسجيل مخالفة</button>
        </div>
      </div>

      {/* ══ STATS STRIP ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { v: stats.total,  ar: "إجمالي المخالفات", c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)", f: "all" },
          { v: stats.open,   ar: "مفتوحة",           c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE",             f: "open" },
          { v: stats.prog,   ar: "قيد المتابعة",     c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D",             f: "prog" },
          { v: stats.urgent, ar: "حرجة",             c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5",             f: "urgent" },
          { v: stats.closed, ar: "مغلقة",            c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0",             f: "closed" },
        ].map(s => (
          <div key={s.f} onClick={() => setFilter(s.f)} style={{ background: s.bg, border: `2px solid ${filter === s.f ? s.c : s.brd}`, borderRadius: 12, padding: "11px 13px", cursor: "pointer", transition: "border-color .15s" }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.ar}</div>
          </div>
        ))}
      </div>

      {/* ══ TABS ══ */}
      <div style={{ display: "flex", borderBottom: "1.5px solid var(--brd)", marginBottom: 14, overflowX: "auto" }}>
        {[
          { id: "incidents" as const, ar: "المخالفات",      ico: "⚠️", badge: 0 },
          { id: "analytics" as const, ar: "التحليلات",      ico: "📊", badge: 0 },
          { id: "followup" as const,  ar: "المتابعة",       ico: "🔔", badge: stats.open + stats.prog },
          { id: "rules" as const,     ar: "لائحة السلوك",   ico: "📋", badge: 0 },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "10px 16px", border: "none", background: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: activeTab === t.id ? "#E8702A" : "var(--tx2)", borderBottom: `2px solid ${activeTab === t.id ? "#E8702A" : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
            {t.ico} {t.ar}
            {t.badge > 0 && (
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: activeTab === t.id ? "#E8702A" : "#FEF2F2", color: activeTab === t.id ? "#fff" : "#DC2626" }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ SEARCH + FILTER (incidents tab only) ══ */}
      {activeTab === "incidents" && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم الطالب أو نوع المخالفة..."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", paddingRight: 33, border: "1.5px solid var(--brd)", borderRadius: 10, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[
              { id: "all", ar: "الكل" }, { id: "open", ar: "مفتوحة" }, { id: "prog", ar: "جارٍ" },
              { id: "urgent", ar: "⚠️ حرجة" }, { id: "closed", ar: "مغلقة" },
            ].map(f => (
              <button key={f.id} className={`bv-chip ${filter === f.id ? "on" : ""}`} onClick={() => setFilter(f.id)}>{f.ar}</button>
            ))}
          </div>
          <select value={severity} onChange={e => setSeverity(e.target.value)} style={{ fontSize: 11, padding: "6px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit" }}>
            <option value="all">كل الخطورات</option>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{SEV[n].ar}</option>)}
          </select>
        </div>
      )}

      {/* ══ TAB CONTENT ══ */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--tx2)" }}>جاري التحميل...</div>
      ) : activeTab === "incidents" ? (
        shown.length === 0 ? (
          <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, padding: 60, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>لا توجد مخالفات في هذا التصنيف</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map(inc => {
              const sev = SEV[inc.severity] || SEV[1];
              const st = STATUS[inc.status] || STATUS.open;
              return (
                <div key={inc.id} className="bv-card" onClick={() => openDetail(inc.id)} style={{ display: "flex", overflow: "hidden" }}>
                  <div className="bv-stripe" style={{ background: sev.stripe }} />
                  <div style={{ flex: 1, padding: "13px 15px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: inc.av, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{inc.student.charAt(0)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{inc.student}</div>
                          <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 1 }}>🏫 {inc.cls} · 👤 {inc.reporter}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                        {inc.tags.map((t: string) => (
                          <span key={t} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5" }}>{t}</span>
                        ))}
                        <span className={`bv-sev s${inc.severity}`}>{sev.ar}</span>
                        <span className={`bv-status ${inc.status}`}>{st.ico} {st.ar}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 9, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{inc.type}</div>
                        <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 340 }}>{inc.desc}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span className="bv-action">
                          {inc.action} {inc.actionDone ? <span style={{ color: "#22C55E" }}>✓</span> : <span style={{ color: "#F59E0B" }}>⏳</span>}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{inc.date}</span>
                      </div>
                    </div>
                    {inc.followup && (
                      <div style={{ marginTop: 7, padding: "6px 10px", background: "#EFF6FF", borderRadius: 7, fontSize: 11, color: "#2563EB", border: "1px solid #BFDBFE" }}>🔔 {inc.followup}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === "analytics" ? (
        <AnalyticsPanel data={analytics} total={stats.total} />
      ) : activeTab === "followup" ? (
        <FollowupPanel incidents={incidents.filter(i => i.status !== "closed")} onOpen={openDetail} onClose={closeIncident} onNotify={notifyParent} />
      ) : (
        /* RULES */
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>لائحة السلوك والإجراءات</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-g btn-sm">🖨️ طباعة</button>
              <button onClick={() => { setRuleForm({ id: null, name: "", severity: 1, first_action: "", repeat_action: "", color: "#22C55E" }); setRuleOpen(true); }} className="btn btn-p btn-sm">+ قاعدة</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rules.map((r: any, i: number) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, borderRight: `4px solid ${r.color ?? "#6B7280"}` }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: (r.color ?? "#6B7280") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: r.color ?? "#6B7280", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10.5, color: "var(--tx1)" }}>المرة الأولى: <strong>{r.first_action ?? "—"}</strong></span>
                    <span style={{ fontSize: 10, color: "var(--tx2)" }}>·</span>
                    <span style={{ fontSize: 10.5, color: "var(--tx1)" }}>التكرار: <strong style={{ color: "#DC2626" }}>{r.repeat_action ?? "—"}</strong></span>
                  </div>
                </div>
                <span className={`bv-sev s${r.severity ?? 1}`}>{SEV[r.severity ?? 1].ar}</span>
                <button onClick={() => { setRuleForm({ id: r.id, name: r.name, severity: r.severity ?? 1, first_action: r.first_action ?? "", repeat_action: r.repeat_action ?? "", color: r.color ?? SEV[r.severity ?? 1].stripe }); setRuleOpen(true); }} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--brd)", background: "var(--bg3)", cursor: "pointer", fontSize: 11 }}>✏️</button>
                <button onClick={() => deleteRule(r.id)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontSize: 11 }}>🗑</button>
              </div>
            ))}
            {rules.length === 0 && <div style={{ textAlign: "center", padding: 30, color: "var(--tx2)", fontSize: 12 }}>لا توجد قواعد — اضغط «+ قاعدة» لإضافة</div>}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ─── analytics panel ─── */
function AnalyticsPanel({ data, total }: any) {
  const SVGC = ["#22C55E", "#F59E0B", "#F97316", "#EF4444"];
  const sevVals = [data.sevCount[1], data.sevCount[2], data.sevCount[3], data.sevCount[4]];
  const sevTot = Math.max(1, sevVals.reduce((a: number, b: number) => a + b, 0));
  let offset = 0;
  const R = 32, cx = 40, cy = 40, circ = 2 * Math.PI * R;
  const arcs = sevVals.map((v: number, i: number) => {
    const pct = v / sevTot; const dash = circ * pct; const gap = circ * (1 - pct);
    const el = <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={SVGC[i]} strokeWidth={14} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`} />;
    offset += dash;
    return el;
  });

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Type chart */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>📊 المخالفات حسب النوع</div>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {data.topTypes.length === 0 ? <div style={{ color: "var(--tx2)", textAlign: "center", padding: 20, fontSize: 12 }}>لا بيانات</div> : data.topTypes.map(([name, cnt]: any) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{name}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "var(--fm)", color: "#E8702A" }}>{cnt}</span>
                </div>
                <div style={{ height: 7, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, width: `${Math.round(cnt / data.maxType * 100)}%`, background: "linear-gradient(90deg,#E8702A,#F97316)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Severity donut + by class */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12 }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>🎯 توزيع الخطورة</div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    {arcs}
                    <text x={40} y={44} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--tx0)">{total}</text>
                  </svg>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: SEV[n].stripe }} />
                      <span style={{ fontSize: 11, flex: 1 }}>{SEV[n].ar}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "var(--fm)" }}>{data.sevCount[n]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12 }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>🏫 حسب الصف</div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
              {data.topCls.length === 0 ? <div style={{ color: "var(--tx2)", fontSize: 11 }}>لا بيانات</div> : data.topCls.map(([cls, cnt]: any) => (
                <div key={cls} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--fm)", width: 40 }}>{cls}</span>
                  <div style={{ flex: 1, height: 7, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, width: `${Math.round(cnt / data.maxCls * 100)}%`, background: "#E8702A" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#E8702A", width: 20, textAlign: "left" }}>{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, marginBottom: 14 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>🗓 خريطة الحرارة — المخالفات بالأيام (آخر 7 أسابيع)</div>
        <div style={{ padding: "14px 16px", overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 22 }}>
              {["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس"].map(d => (
                <div key={d} style={{ fontSize: 9, fontWeight: 700, color: "var(--tx2)", height: 20, display: "flex", alignItems: "center" }}>{d}</div>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {Array.from({ length: 7 }, (_, w) => (
                  <div key={w} style={{ fontSize: 9, color: "var(--tx2)", width: 20, textAlign: "center" }}>أ{w + 1}</div>
                ))}
              </div>
              {data.heat.map((row: number[], di: number) => (
                <div key={di} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {row.map((v, w) => {
                    const color = v === 0 ? "var(--bg3)" : v === 1 ? "#FEF9C3" : v === 2 ? "#FED7AA" : v === 3 ? "#FB923C" : "#EF4444";
                    return <div key={w} className="bv-hm-cell" style={{ width: 20, height: 20, background: color, opacity: v === 0 ? 0.3 : 1 }} title={`${v} مخالفات`} />;
                  })}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: 10, color: "var(--tx2)" }}>أقل</span>
                {["#F9FAFB", "#FEF9C3", "#FED7AA", "#FB923C", "#EF4444"].map(c => (
                  <div key={c} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
                ))}
                <span style={{ fontSize: 10, color: "var(--tx2)" }}>أكثر</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top offenders */}
      <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800 }}>👤 الطلاب الأكثر مخالفات</div>
        <div>
          {data.topOffenders.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>لا بيانات</div>
          ) : data.topOffenders.map(([name, d]: any, i: number) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: "1px solid var(--brd)", background: i === 0 ? "rgba(232,112,42,.04)" : "transparent" }}>
              <div style={{ width: 24, fontSize: 12, fontWeight: 800, color: i === 0 ? "#E8702A" : "var(--tx2)", fontFamily: "var(--fm)" }}>#{i + 1}</div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: d.av, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{name.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>{d.cls}</div>
              </div>
              <span className={`bv-sev s${d.sev}`}>{SEV[d.sev].ar}</span>
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--fm)", color: "#E8702A" }}>{d.cnt}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─── followup panel ─── */
function FollowupPanel({ incidents, onOpen, onClose, onNotify }: any) {
  if (incidents.length === 0) {
    return (
      <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, padding: 60, textAlign: "center", color: "var(--tx2)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>جميع المخالفات مغلقة</div>
      </div>
    );
  }
  return (
    <>
      <div style={{ marginBottom: 10, fontSize: 12, color: "var(--tx2)" }}>{incidents.length} مخالفة تحتاج متابعة</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {incidents.map((inc: any) => {
          const sev = SEV[inc.severity] || SEV[1];
          const st = STATUS[inc.status] || STATUS.open;
          return (
            <div key={inc.id} style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, borderRight: `4px solid ${sev.stripe}`, cursor: "pointer" }} onClick={() => onOpen(inc.id)}>
              <div style={{ padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: inc.av, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff" }}>{inc.student.charAt(0)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{inc.student} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--tx2)" }}>· {inc.cls}</span></div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 2 }}>{inc.type}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span className={`bv-sev s${inc.severity}`}>{sev.ar}</span>
                    <span className={`bv-status ${inc.status}`}>{st.ico} {st.ar}</span>
                  </div>
                </div>
                {inc.followup && (
                  <div style={{ marginTop: 8, padding: "7px 11px", background: "#EFF6FF", borderRadius: 8, fontSize: 11.5, color: "#2563EB", border: "1px solid #BFDBFE" }}>🔔 <strong>متابعة:</strong> {inc.followup}</div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={e => { e.stopPropagation(); onClose(inc.id); }} style={{ padding: "5px 12px", fontSize: 11, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>✓ إغلاق</button>
                  <button onClick={e => { e.stopPropagation(); onOpen(inc.id); }} style={{ padding: "5px 12px", fontSize: 11, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>تفاصيل</button>
                  <button onClick={e => { e.stopPropagation(); onNotify(inc.id); }} style={{ padding: "5px 12px", fontSize: 11, background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>📱 إبلاغ ولي الأمر</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── helpers ─── */
function Fld({ label, value, onChange, placeholder, type = "text" }: { label: string; value: any; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
    </div>
  );
}

function Sel({ label, value, onChange, options, labels }: { label: string; value: any; onChange: (v: string) => void; options: string[]; labels?: string[] }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, outline: "none" }}>
        {(options as string[]).map((o: string, i: number) => <option key={o + i} value={o}>{labels?.[i] ?? o}</option>)}
      </select>
    </div>
  );
}
