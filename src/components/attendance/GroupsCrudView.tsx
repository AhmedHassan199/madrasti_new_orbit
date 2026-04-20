"use client";

import { useState, useEffect, useMemo } from "react";
import { employeesApi } from "@/lib/employees-api";
import Pagination, { useClientPagination } from "./Pagination";

interface Props {
  type?: "student" | "teacher";
  title?: string;
}

interface Group {
  id: number;
  name: string;
  type: string;
  employees_count?: number;
}

export default function GroupsCrudView({ type, title = "المجموعات" }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Group | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"student" | "teacher">(type ?? "student");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (type) params.type = type;
      const r: any = await employeesApi.groups(params);
      setGroups(Array.isArray(r) ? r : (r?.data ?? []));
    } catch { setGroups([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const s = search.toLowerCase();
    return groups.filter(g => (g.name ?? "").toLowerCase().includes(s));
  }, [groups, search]);

  const pg = useClientPagination(filtered, 30);

  function openNew() {
    setEditing(null);
    setFormName("");
    setFormType(type ?? "student");
  }

  function openEdit(g: Group) {
    setEditing(g);
    setFormName(g.name);
    setFormType((g.type as any) ?? "student");
  }

  async function save() {
    if (!formName.trim()) { setToast({ ok: false, msg: "أدخل اسم المجموعة" }); return; }
    setBusy(true);
    try {
      if (editing) {
        await employeesApi.updateGroup(editing.id, { name: formName, type: formType });
        setToast({ ok: true, msg: "تم التحديث" });
      } else {
        await employeesApi.createGroup({ name: formName, type: formType });
        setToast({ ok: true, msg: "تم الإضافة" });
      }
      setEditing(null);
      setFormName("");
      await load();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" });
    } finally { setBusy(false); }
  }

  async function remove(g: Group) {
    if (!confirm(`حذف "${g.name}"؟ ${g.employees_count ? `(عدد الأعضاء: ${g.employees_count})` : ""}`)) return;
    try {
      await employeesApi.deleteGroup(g.id);
      setToast({ ok: true, msg: "تم الحذف" });
      await load();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحذف" });
    }
  }

  const types = [
    { v: "student",  label: "طلاب",   c: "#2563EB", bg: "#EFF6FF" },
    { v: "teacher",  label: "معلمين", c: "#059669", bg: "#ECFDF5" },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: "var(--tx2)" }}>إجمالي {title}</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: "#2563EB" }}>
            {groups.length.toLocaleString("ar-EG")}
          </div>
        </div>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: "var(--tx2)" }}>إجمالي الأعضاء</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: "#059669" }}>
            {groups.reduce((s, g) => s + (g.employees_count ?? 0), 0).toLocaleString("ar-EG")}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit", fontSize: 14 }}>×</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* LIST */}
        <div>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder={`ابحث في ${title}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
            />
            <button onClick={openNew} style={btnBlue}>➕ جديد</button>
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
            ) : !filtered.length ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
                <div style={{ fontSize: 36, opacity: 0.4 }}>👥</div>
                {groups.length ? "لا نتائج" : `لا توجد ${title}`}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                    <th style={th}>#</th>
                    <th style={th}>الاسم</th>
                    <th style={th}>النوع</th>
                    <th style={th}>عدد الأعضاء</th>
                    <th style={{ ...th, width: 140 }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.paginated.map((g, i) => {
                    const t = types.find(x => x.v === g.type);
                    return (
                      <tr key={g.id} style={{ borderBottom: "1px solid var(--brd)" }}>
                        <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{g.name}</td>
                        <td style={td}>
                          {t ? (
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, color: t.c, background: t.bg }}>
                              {t.label}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ ...td, fontFamily: "var(--fm)", fontWeight: 600 }}>{g.employees_count ?? 0}</td>
                        <td style={td}>
                          <button onClick={() => openEdit(g)} style={btnSm}>✏️</button>
                          <button onClick={() => remove(g)} style={{ ...btnSm, color: "#DC2626", borderColor: "#FECACA", background: "#FEF2F2" }}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <Pagination
              page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
              onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
            />
          </div>
        </div>

        {/* FORM */}
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, height: "fit-content", position: "sticky", top: 80 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>
            {editing ? "✏️ تعديل مجموعة" : "➕ مجموعة جديدة"}
          </h3>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>اسم المجموعة</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} style={inp} placeholder="مثال: 3/أ" />
          </div>
          {!type && (
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>النوع</label>
              <select value={formType} onChange={e => setFormType(e.target.value as any)} style={inp}>
                <option value="student">طلاب</option>
                <option value="teacher">معلمين</option>
              </select>
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={save} disabled={busy} style={btnSave}>
              {busy ? "جاري…" : (editing ? "💾 تحديث" : "➕ إضافة")}
            </button>
            {editing && <button onClick={openNew} style={btnGhost}>✕</button>}
          </div>
        </div>
      </div>
    </>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, color: "var(--tx2)", marginBottom: 4, fontWeight: 600 };
const btnBlue: React.CSSProperties = { padding: "8px 14px", background: "#2563EB", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSave: React.CSSProperties = { flex: 1, padding: "10px 16px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSm: React.CSSProperties = { padding: "4px 8px", background: "var(--bg2)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", marginLeft: 4 };
