"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { employeesApi } from "@/lib/employees-api";
import Pagination, { useClientPagination } from "@/components/attendance/Pagination";

interface SubGroup {
  id: number;
  name: string;
  group_id: number;
  group_name?: string;
  employees_count?: number;
}

export default function AttendanceSubGroupsPage() {
  const { lang } = useUi();
  const [rows, setRows] = useState<SubGroup[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("");

  const [editing, setEditing] = useState<SubGroup | null>(null);
  const [fName, setFName] = useState("");
  const [fGroup, setFGroup] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [sg, gs]: any = await Promise.all([
        employeesApi.subGroupsAll({}),
        employeesApi.groups({}),
      ]);
      setRows(Array.isArray(sg) ? sg : (sg?.data ?? []));
      setGroups(Array.isArray(gs) ? gs : (gs?.data ?? []));
    } catch { setRows([]); setGroups([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (filterGroup) list = list.filter(r => String(r.group_id) === filterGroup);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(r => (r.name ?? "").toLowerCase().includes(s) || (r.group_name ?? "").toLowerCase().includes(s));
    }
    return list;
  }, [rows, search, filterGroup]);

  const pg = useClientPagination(filtered, 30);

  function openNew() {
    setEditing(null); setFName(""); setFGroup(groups[0]?.id ?? "");
  }

  function openEdit(sg: SubGroup) {
    setEditing(sg); setFName(sg.name); setFGroup(sg.group_id);
  }

  async function save() {
    if (!fName.trim() || !fGroup) { setToast({ ok: false, msg: "اسم الفصل والمجموعة مطلوبين" }); return; }
    setBusy(true);
    try {
      if (editing) {
        await employeesApi.updateSubGroup(editing.id, { name: fName, group_id: fGroup });
        setToast({ ok: true, msg: "تم التحديث" });
      } else {
        await employeesApi.createSubGroup({ name: fName, group_id: fGroup });
        setToast({ ok: true, msg: "تم الإضافة" });
      }
      setEditing(null); setFName("");
      await load();
    } catch (e: any) { setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" }); }
    finally { setBusy(false); }
  }

  async function remove(sg: SubGroup) {
    if (!confirm(`حذف "${sg.name}"؟`)) return;
    try {
      await employeesApi.deleteSubGroup(sg.id);
      setToast({ ok: true, msg: "تم الحذف" });
      await load();
    } catch (e: any) { setToast({ ok: false, msg: e?.message ?? "فشل الحذف" }); }
  }

  return (
    <DashboardLayout
      title={lang === "ar" ? "إدارة الفصول الفرعية" : "Sub-Groups Management"}
      subtitle={lang === "ar" ? "الفصول الفرعية داخل كل مجموعة" : "Sub-groups inside each group"}
    >
      {toast && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit", fontSize: 14 }}>×</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <div>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", gap: 8 }}>
            <input
              type="text" placeholder="ابحث…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
            />
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, background: "var(--bg2)", color: "var(--tx1)" }}>
              <option value="">كل المجموعات</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={openNew} style={{ padding: "8px 14px", background: "#2563EB", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>➕ جديد</button>
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
            ) : !filtered.length ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>لا توجد فصول</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                    <th style={th}>#</th>
                    <th style={th}>اسم الفصل</th>
                    <th style={th}>المجموعة الأم</th>
                    <th style={th}>الأعضاء</th>
                    <th style={{ ...th, width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pg.paginated.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--brd)" }}>
                      <td style={{ ...td, fontFamily: "var(--fm)", color: "var(--tx2)" }}>{pg.start + i + 1}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                      <td style={{ ...td, color: "var(--tx2)" }}>{r.group_name ?? groups.find(g => g.id === r.group_id)?.name ?? "—"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", fontWeight: 600 }}>{r.employees_count ?? 0}</td>
                      <td style={td}>
                        <button onClick={() => openEdit(r)} style={btnSm}>✏️</button>
                        <button onClick={() => remove(r)} style={{ ...btnSm, color: "#DC2626", borderColor: "#FECACA", background: "#FEF2F2" }}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pagination
              page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
              onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
            />
          </div>
        </div>

        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, height: "fit-content", position: "sticky", top: 80 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>
            {editing ? "✏️ تعديل" : "➕ جديد"}
          </h3>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>اسم الفصل</label>
            <input value={fName} onChange={e => setFName(e.target.value)} style={inp} placeholder="3/أ" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>المجموعة الأم</label>
            <select value={fGroup} onChange={e => setFGroup(e.target.value ? +e.target.value : "")} style={inp}>
              <option value="">اختر…</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
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
    </DashboardLayout>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, color: "var(--tx2)", marginBottom: 4, fontWeight: 600 };
const btnSave: React.CSSProperties = { flex: 1, padding: "10px 16px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSm: React.CSSProperties = { padding: "4px 8px", background: "var(--bg2)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", marginLeft: 4 };
