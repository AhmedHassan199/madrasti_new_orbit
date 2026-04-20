"use client";

import { useState, useEffect, useMemo } from "react";
import { employeesApi } from "@/lib/employees-api";
import Pagination, { useClientPagination } from "./Pagination";

interface Props {
  groupType?: "student" | "teacher";
  title?: string;
}

interface SubGroup {
  id: number;
  name: string;
  group_id: number;
  group_name?: string;
  group_type?: string;
  employees_count?: number;
}

interface Group {
  id: number;
  name: string;
  type: string;
}

export default function SubGroupsCrudView({ groupType, title = "الفصول" }: Props) {
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGroupId, setFilterGroupId] = useState<string>("");

  const [editing, setEditing] = useState<SubGroup | null>(null);
  const [formName, setFormName] = useState("");
  const [formGroupId, setFormGroupId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (groupType) params.group_type = groupType;
      if (filterGroupId) params.group_id = filterGroupId;
      const r: any = await employeesApi.subGroupsAll(params);
      setSubGroups(Array.isArray(r) ? r : (r?.data ?? []));
    } catch { setSubGroups([]); }
    finally { setLoading(false); }
  }

  async function loadGroups() {
    try {
      const params: any = {};
      if (groupType) params.type = groupType;
      const r: any = await employeesApi.groups(params);
      const list = Array.isArray(r) ? r : (r?.data ?? []);
      setGroups(list);
      if (!formGroupId && list.length) setFormGroupId(String(list[0].id));
    } catch { setGroups([]); }
  }

  useEffect(() => { loadGroups(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterGroupId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return subGroups;
    const s = search.toLowerCase();
    return subGroups.filter(g =>
      (g.name ?? "").toLowerCase().includes(s) ||
      (g.group_name ?? "").toLowerCase().includes(s)
    );
  }, [subGroups, search]);

  const pg = useClientPagination(filtered, 30);

  function openNew() {
    setEditing(null);
    setFormName("");
    if (!formGroupId && groups.length) setFormGroupId(String(groups[0].id));
  }

  function openEdit(g: SubGroup) {
    setEditing(g);
    setFormName(g.name);
    setFormGroupId(String(g.group_id));
  }

  async function save() {
    if (!formName.trim()) { setToast({ ok: false, msg: "أدخل اسم الفصل" }); return; }
    if (!formGroupId) { setToast({ ok: false, msg: "اختر المجموعة الأم" }); return; }
    setBusy(true);
    try {
      const payload = { name: formName, group_id: Number(formGroupId) };
      if (editing) {
        await employeesApi.updateSubGroup(editing.id, payload);
        setToast({ ok: true, msg: "تم التحديث" });
      } else {
        await employeesApi.createSubGroup(payload);
        setToast({ ok: true, msg: "تم الإضافة" });
      }
      setEditing(null);
      setFormName("");
      await load();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" });
    } finally { setBusy(false); }
  }

  async function remove(g: SubGroup) {
    if (!confirm(`حذف "${g.name}"؟ ${g.employees_count ? `(عدد الأعضاء: ${g.employees_count})` : ""}`)) return;
    try {
      await employeesApi.deleteSubGroup(g.id);
      setToast({ ok: true, msg: "تم الحذف" });
      await load();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحذف" });
    }
  }

  const groupTypeColors: Record<string, { c: string; bg: string; label: string }> = {
    student: { c: "#2563EB", bg: "#EFF6FF", label: "طلاب" },
    teacher: { c: "#059669", bg: "#ECFDF5", label: "معلمين" },
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: "var(--tx2)" }}>إجمالي {title}</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: "#2563EB" }}>
            {subGroups.length.toLocaleString("ar-EG")}
          </div>
        </div>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: "var(--tx2)" }}>إجمالي الأعضاء</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: "#059669" }}>
            {subGroups.reduce((s, g) => s + (g.employees_count ?? 0), 0).toLocaleString("ar-EG")}
          </div>
        </div>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, color: "var(--tx2)" }}>المجموعات الأم</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: "#E8702A" }}>
            {groups.length.toLocaleString("ar-EG")}
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
            <select value={filterGroupId} onChange={e => setFilterGroupId(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, background: "var(--bg2)", color: "var(--tx1)", minWidth: 160 }}>
              <option value="">كل المجموعات</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={openNew} style={btnBlue}>➕ جديد</button>
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
            ) : !filtered.length ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
                <div style={{ fontSize: 36, opacity: 0.4 }}>🏫</div>
                {subGroups.length ? "لا نتائج" : `لا توجد ${title}`}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                    <th style={th}>#</th>
                    <th style={th}>اسم الفصل</th>
                    <th style={th}>المجموعة الأم</th>
                    <th style={th}>النوع</th>
                    <th style={th}>عدد الأعضاء</th>
                    <th style={{ ...th, width: 140 }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.paginated.map((g, i) => {
                    const t = g.group_type ? groupTypeColors[g.group_type] : null;
                    return (
                      <tr key={g.id} style={{ borderBottom: "1px solid var(--brd)" }}>
                        <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{g.name}</td>
                        <td style={{ ...td, color: "var(--tx2)" }}>{g.group_name ?? "—"}</td>
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
            {editing ? "✏️ تعديل فصل" : "➕ فصل جديد"}
          </h3>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>اسم الفصل</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} style={inp} placeholder="مثال: 3/أ" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>المجموعة الأم</label>
            <select value={formGroupId} onChange={e => setFormGroupId(e.target.value)} style={inp}>
              <option value="">— اختر مجموعة —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} {g.type === "teacher" ? "(معلمين)" : "(طلاب)"}</option>)}
            </select>
          </div>
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
const btnSave: React.CSSProperties = { flex: 1, padding: "10px 16px", background: "#E8702A", color: "#fff", border: 0, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSm: React.CSSProperties = { padding: "4px 8px", background: "var(--bg2)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", marginLeft: 4 };
