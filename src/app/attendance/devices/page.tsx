"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { attendanceApi } from "@/lib/attendance-api";

/* ═══════════════════════════════════════
   DEVICE TYPES
═══════════════════════════════════════ */
const TYPE_LABEL: Record<string, { ar: string; ico: string; c: string; bg: string; brd: string }> = {
  student: { ar: "طلاب",      ico: "🎓", c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
  teacher: { ar: "معلمين",    ico: "👨‍🏫", c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  both:    { ar: "طلاب+معلمين", ico: "👥", c: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
  other:   { ar: "غير محدد",   ico: "📟", c: "#6B7280", bg: "var(--bg3)", brd: "var(--brd)" },
};

interface Device {
  id: number;
  name: string;
  sn: string;
  type: string;
  status: string;
  state: string;
  is_online: boolean;
  ip_address_device: string | null;
  area_id: number | null;
  area_name: string | null;
  department_id: number | null;
  department_name: string | null;
  biotime_device_id: number | null;
  transactions_count: number;
  created_at: string | null;
}

export default function DevicesPage() {
  const { lang } = useUi();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  /* Filters */
  const [search, setSearch]     = useState("");
  const [typeFilter, setTypeFilter]   = useState<"all" | "student" | "teacher" | "both">("all");
  const [stateFilter, setStateFilter] = useState<"all" | "online" | "offline">("all");
  const [view, setView]         = useState<"grid" | "table">("grid");
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  /* Add modal */
  const [addOpen, setAddOpen]   = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [form, setForm]         = useState<any>({
    name: "", sn: "", ip_address_device: "", type: "student", status: "مفعل",
  });
  const [saving, setSaving]     = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const r: any = await attendanceApi.devices.list();
      const arr = Array.isArray(r) ? r : (r?.data ?? []);
      setDevices(arr);
    } catch { setDevices([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  /* Stats */
  const stats = useMemo(() => ({
    total:   devices.length,
    online:  devices.filter(d => d.is_online).length,
    offline: devices.filter(d => !d.is_online).length,
    txns:    devices.reduce((s, d) => s + (d.transactions_count ?? 0), 0),
  }), [devices]);

  const shown = useMemo(() => {
    let list = devices.slice();
    if (typeFilter !== "all")  list = list.filter(d => d.type === typeFilter);
    if (stateFilter === "online")  list = list.filter(d => d.is_online);
    if (stateFilter === "offline") list = list.filter(d => !d.is_online);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.sn?.toLowerCase().includes(q) ||
        d.ip_address_device?.toLowerCase().includes(q) ||
        d.area_name?.toLowerCase().includes(q) ||
        d.department_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [devices, typeFilter, stateFilter, search]);

  function openAdd() {
    setEditId(null);
    setForm({ name: "", sn: "", ip_address_device: "", type: "student", status: "مفعل" });
    setAddOpen(true);
  }

  function openEdit(d: Device) {
    setEditId(d.id);
    setForm({
      name: d.name ?? "", sn: d.sn ?? "",
      ip_address_device: d.ip_address_device ?? "",
      type: d.type ?? "student", status: d.status ?? "مفعل",
    });
    setAddOpen(true);
  }

  async function saveDevice() {
    if (!form.name || !form.sn) return alert("الاسم والرقم التسلسلى مطلوبان");
    setSaving(true);
    try {
      if (editId) await attendanceApi.devices.update(editId, form);
      else        await attendanceApi.devices.create(form);
      await reload();
      setAddOpen(false);
    } catch (e: any) { alert("تعذّر الحفظ: " + (e?.message ?? "")); }
    finally { setSaving(false); }
  }

  async function deleteDevice(d: Device) {
    if (!confirm(`حذف الجهاز "${d.name}"؟`)) return;
    try { await attendanceApi.devices.delete(d.id); await reload(); }
    catch { alert("تعذّر الحذف"); }
  }

  return (
    <DashboardLayout title="📟 الأجهزة والبصمات" subtitle={`${devices.length} جهاز · ${stats.online} متصل · ${stats.txns.toLocaleString()} بصمة`}>
      <style>{`
        .dev-card { background: var(--bg1); border: 1.5px solid var(--brd); border-radius: 14px; padding: 14px; box-shadow: var(--card-sh); transition: all .15s; }
        .dev-card:hover { border-color: #E8702A; transform: translateY(-1px); }
        .dev-chip { font-size: 10px; padding: 2px 8px; border-radius: 5px; font-weight: 700; border: 1px solid; }
        @keyframes pulseDev { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: .6; } }
        .dev-pulse { animation: pulseDev 1.6s ease-in-out infinite; }
      `}</style>

      {/* ══ ADD/EDIT MODAL ══ */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={() => setAddOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, maxWidth: "95vw", background: "var(--bg1)", borderRadius: 14, border: "1px solid var(--brd)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{editId ? "✏️ تعديل الجهاز" : "➕ إضافة جهاز بصمة"}</div>
              <button onClick={() => setAddOpen(false)} style={{ width: 28, height: 28, border: "1px solid var(--brd)", borderRadius: 7, background: "var(--bg3)", cursor: "pointer", fontSize: 15 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الرقم التسلسلى *</label>
                <input value={form.sn} onChange={e => setForm((p: any) => ({ ...p, sn: e.target.value }))} placeholder="CGDQ231660234" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "var(--fm)", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>اسم الجهاز (Alias) *</label>
                <input value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="مثال: المدخل الرئيسى" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>عنوان IP</label>
                <input value={form.ip_address_device} onChange={e => setForm((p: any) => ({ ...p, ip_address_device: e.target.value }))} placeholder="192.168.1.200" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "var(--fm)", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>نوع الجهاز *</label>
                <select value={form.type} onChange={e => setForm((p: any) => ({ ...p, type: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13 }}>
                  <option value="student">🎓 طلاب</option>
                  <option value="teacher">👨‍🏫 معلمين</option>
                  <option value="both">👥 كلاهما</option>
                </select>
              </div>
              <div style={{ padding: "10px 13px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 9, fontSize: 11, color: "#1D4ED8", lineHeight: 1.6 }}>
                ℹ️ تأكد أن توقيت الجهاز على <strong>GMT+03</strong> (توقيت مكة المكرمة) قبل الإضافة.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={saveDevice} disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                💾 {saving ? "جاري..." : editId ? "حفظ التعديلات" : "إضافة الجهاز"}
              </button>
              <button onClick={() => setAddOpen(false)} style={{ padding: "10px 16px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>📟 أجهزة البصمة</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{devices.length} جهاز مسجّل · {stats.online} متصل حالياً</div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button onClick={() => setInstructionsOpen(o => !o)} className="btn btn-g btn-sm">ℹ️ تعليمات</button>
          <button onClick={reload} className="btn btn-g btn-sm" title="تحديث">🔄 تحديث</button>
          <button onClick={openAdd} className="btn btn-p">➕ إضافة جهاز</button>
        </div>
      </div>

      {/* ══ INSTRUCTIONS (collapsible) ══ */}
      {instructionsOpen && (
        <div style={{ padding: "14px 16px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 11, marginBottom: 14, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontSize: 12.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
            <span>تمكّنك هذه الصفحة من استعراض جميع أجهزة البصمة، مع عرض حالة الاتصال فى الوقت الحقيقى، عدد البصمات لكل جهاز، والمنطقة/القسم المرتبط.</span>
          </div>
          <div style={{ fontSize: 12.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⏰</span>
            <span>يجب أن يكون الجهاز على توقيت <strong>GMT+03</strong> ليتوافق مع توقيت مكة المكرمة.</span>
          </div>
          <div style={{ fontSize: 12.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>💾</span>
            <span>ضرورى وضع نسخة احتياطية كل فترة على USB — <a target="_blank" rel="noreferrer" href="https://mobile.net.sa/sms/fingerprintbackup.htm" style={{ color: "#2563EB", fontWeight: 700 }}>شرح الطريقة هنا</a></span>
          </div>
          <div style={{ fontSize: 12.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>📜</span>
            <span>يتوافق النظام مع الدليل التنظيمى والإجرائى لمدارس التعليم العام 1436هـ لإثبات حضور منسوبى المدرسة إلكترونياً.</span>
          </div>
        </div>
      )}

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: stats.total,   l: "إجمالى الأجهزة", c: "#E8702A", bg: "#FEF3E8", br: "rgba(232,112,42,.2)", ico: "📟" },
          { v: stats.online,  l: "متصلة",          c: "#059669", bg: "#ECFDF5", br: "#A7F3D0",             ico: "🟢" },
          { v: stats.offline, l: "منقطعة",        c: stats.offline > 0 ? "#DC2626" : "#6B7280", bg: stats.offline > 0 ? "#FEF2F2" : "var(--bg3)", br: stats.offline > 0 ? "#FCA5A5" : "var(--brd)", ico: "🔴" },
          { v: stats.txns.toLocaleString(), l: "إجمالى البصمات", c: "#2563EB", bg: "#EFF6FF", br: "#BFDBFE", ico: "📊" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.br}`, borderRadius: 11, padding: "10px 13px", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 20 }}>{s.ico}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: s.c, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ FILTERS ══ */}
      <div style={{ display: "flex", gap: 7, marginBottom: 13, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
          <svg style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الـSN أو IP أو القسم..."
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", paddingRight: 30, border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12.5, outline: "none" }} />
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {([
            { id: "all",     ar: "كل الأنواع" },
            { id: "student", ar: "🎓 طلاب" },
            { id: "teacher", ar: "👨‍🏫 معلمين" },
            { id: "both",    ar: "👥 كلاهما" },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setTypeFilter(f.id as any)}
              style={{ padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${typeFilter === f.id ? "#E8702A" : "var(--brd)"}`, background: typeFilter === f.id ? "#FEF3E8" : "var(--bg1)", color: typeFilter === f.id ? "#E8702A" : "var(--tx2)", cursor: "pointer", fontFamily: "inherit" }}>{f.ar}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {([
            { id: "all",     ar: "الحالتين" },
            { id: "online",  ar: "🟢 متصلة" },
            { id: "offline", ar: "🔴 منقطعة" },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setStateFilter(f.id as any)}
              style={{ padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${stateFilter === f.id ? "#E8702A" : "var(--brd)"}`, background: stateFilter === f.id ? "#FEF3E8" : "var(--bg1)", color: stateFilter === f.id ? "#E8702A" : "var(--tx2)", cursor: "pointer", fontFamily: "inherit" }}>{f.ar}</button>
          ))}
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", border: "1.5px solid var(--brd)", borderRadius: 9, overflow: "hidden", marginRight: "auto" }}>
          <button onClick={() => setView("grid")} style={{ padding: "6px 12px", border: "none", background: view === "grid" ? "#E8702A" : "var(--bg1)", color: view === "grid" ? "#fff" : "var(--tx2)", cursor: "pointer", fontSize: 14 }}>⊞</button>
          <button onClick={() => setView("table")} style={{ padding: "6px 12px", border: "none", background: view === "table" ? "#E8702A" : "var(--bg1)", color: view === "table" ? "#fff" : "var(--tx2)", cursor: "pointer", fontSize: 14 }}>☰</button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 10 }}>عرض {shown.length} من {devices.length}</div>

      {/* ══ CONTENT ══ */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل...</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, boxShadow: "var(--card-sh)" }}>
          <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 10 }}>📟</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx2)" }}>
            {devices.length === 0 ? "لا توجد أجهزة مسجلة — أضف جهازك الأول" : "لا نتائج مطابقة للفلتر"}
          </div>
          {devices.length === 0 && (
            <button onClick={openAdd} className="btn btn-p btn-sm" style={{ marginTop: 12 }}>➕ إضافة جهاز</button>
          )}
        </div>
      ) : view === "grid" ? (
        /* ── GRID VIEW ── */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {shown.map(d => {
            const tm = TYPE_LABEL[d.type] ?? TYPE_LABEL.other;
            const online = d.is_online;
            return (
              <div key={d.id} className="dev-card">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: tm.bg, border: `1.5px solid ${tm.brd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{tm.ico}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                      <div style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)", marginTop: 2 }}>SN: {d.sn}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    <div className={online ? "dev-pulse" : ""} style={{ width: 10, height: 10, borderRadius: "50%", background: online ? "#22C55E" : "#DC2626" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: online ? "#059669" : "#DC2626" }}>{online ? "متصل" : "منقطع"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  <div style={{ padding: "7px 10px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--brd)" }}>
                    <div style={{ fontSize: 9, color: "var(--tx2)", marginBottom: 2 }}>IP</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{d.ip_address_device || "—"}</div>
                  </div>
                  <div style={{ padding: "7px 10px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--brd)" }}>
                    <div style={{ fontSize: 9, color: "var(--tx2)", marginBottom: 2 }}>البصمات</div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, fontFamily: "var(--fm)", color: "#E8702A" }}>{(d.transactions_count ?? 0).toLocaleString()}</div>
                  </div>
                  {d.area_name && (
                    <div style={{ gridColumn: "1 / -1", padding: "7px 10px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--brd)" }}>
                      <div style={{ fontSize: 9, color: "var(--tx2)", marginBottom: 2 }}>المنطقة</div>
                      <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.area_name}</div>
                    </div>
                  )}
                  {d.department_name && (
                    <div style={{ gridColumn: "1 / -1", padding: "7px 10px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--brd)" }}>
                      <div style={{ fontSize: 9, color: "var(--tx2)", marginBottom: 2 }}>القسم</div>
                      <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.department_name}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <span className="dev-chip" style={{ background: tm.bg, color: tm.c, borderColor: tm.brd }}>{tm.ico} {tm.ar}</span>
                    <span className="dev-chip" style={{ background: d.status === "مفعل" ? "#ECFDF5" : "#FFFBEB", color: d.status === "مفعل" ? "#059669" : "#B45309", borderColor: d.status === "مفعل" ? "#A7F3D0" : "#FCD34D" }}>{d.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => openEdit(d)} title="تعديل" style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--brd)", background: "var(--bg3)", cursor: "pointer", fontSize: 11 }}>✏️</button>
                    <button onClick={() => deleteDevice(d)} title="حذف" style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontSize: 11 }}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW (matches reference) ── */
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg3)" }}>
                  {["الرقم التسلسلى", "النوع", "عنوان IP", "الاسم", "الحالة", "الاتصال", "المنطقة", "القسم", "البصمات", ""].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 800, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((d, i) => {
                  const tm = TYPE_LABEL[d.type] ?? TYPE_LABEL.other;
                  return (
                    <tr key={d.id} style={{ borderBottom: i < shown.length - 1 ? "1px solid var(--brd)" : "none", transition: "background .12s" }}
                      onMouseOver={e => (e.currentTarget as HTMLElement).style.background = "var(--bg3)"}
                      onMouseOut={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--fm)", fontSize: 11.5, fontWeight: 700, direction: "ltr" }}>{d.sn}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className="dev-chip" style={{ background: tm.bg, color: tm.c, borderColor: tm.brd }}>{tm.ico} {tm.ar}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{d.ip_address_device || "—"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>{d.name}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className="dev-chip" style={{ background: d.status === "مفعل" ? "#ECFDF5" : "#FFFBEB", color: d.status === "مفعل" ? "#059669" : "#B45309", borderColor: d.status === "مفعل" ? "#A7F3D0" : "#FCD34D" }}>{d.status}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: d.is_online ? "#059669" : "#DC2626" }}>
                          <span className={d.is_online ? "dev-pulse" : ""} style={{ width: 8, height: 8, borderRadius: "50%", background: d.is_online ? "#22C55E" : "#DC2626" }} />
                          {d.is_online ? "متصل" : "غير متصل"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.area_name ?? "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 11 }}>{d.department_name ?? "—"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 800, fontFamily: "var(--fm)", color: "#E8702A" }}>{(d.transactions_count ?? 0).toLocaleString()}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => openEdit(d)} title="تعديل" style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid var(--brd)", background: "var(--bg3)", cursor: "pointer", fontSize: 11 }}>✏️</button>
                          <button onClick={() => deleteDevice(d)} title="حذف" style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontSize: 11 }}>🗑</button>
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
