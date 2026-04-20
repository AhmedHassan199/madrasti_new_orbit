"use client";

import { useState, useEffect, useMemo } from "react";
import { employeesApi } from "@/lib/employees-api";
import Pagination, { useClientPagination } from "./Pagination";

interface Props {
  type: "student" | "teacher";
  roleLabel: string;
}

interface Emp {
  id: number;
  name: string;
  identifier: string;
  phone: string | null;
  group_id: number | null;
  group?: { id: number; name: string } | null;
  sub_group_id?: number | null;
  sub_group?: { id: number; name: string } | null;
  is_added_to_biotime?: boolean;
  biotime_id?: string | null;
}

export default function EmployeesCrudView({ type, roleLabel }: Props) {
  const [rows, setRows] = useState<Emp[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [subGroups, setSubGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("");

  const [editing, setEditing] = useState<Emp | null>(null);
  const [form, setForm] = useState({ name: "", identifier: "", phone: "", group_id: "", sub_group_id: "" });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const [es, gs, sgs]: any = await Promise.all([
        employeesApi.list({ type, per_page: 200 }),
        employeesApi.groups({ type }),
        employeesApi.subGroupsAll({}),
      ]);
      setRows(Array.isArray(es) ? es : (es?.data ?? []));
      setGroups(Array.isArray(gs) ? gs : (gs?.data ?? []));
      setSubGroups(Array.isArray(sgs) ? sgs : (sgs?.data ?? []));
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (filterGroup) list = list.filter(r => String(r.group_id) === filterGroup);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        (r.name ?? "").toLowerCase().includes(s) ||
        (r.identifier ?? "").toLowerCase().includes(s) ||
        (r.phone ?? "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [rows, search, filterGroup]);

  const pg = useClientPagination(filtered, 50);

  const availableSubGroups = useMemo(() => {
    if (!form.group_id) return subGroups;
    return subGroups.filter(sg => String(sg.group_id) === String(form.group_id));
  }, [form.group_id, subGroups]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", identifier: "", phone: "", group_id: "", sub_group_id: "" });
  }

  function openEdit(e: Emp) {
    setEditing(e);
    setForm({
      name:         e.name ?? "",
      identifier:   e.identifier ?? "",
      phone:        e.phone ?? "",
      group_id:     e.group_id ? String(e.group_id) : "",
      sub_group_id: e.sub_group_id ? String(e.sub_group_id) : "",
    });
  }

  async function save() {
    if (!form.name.trim() || !form.identifier.trim()) {
      setToast({ ok: false, msg: "الاسم والهوية مطلوبين" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        identifier: form.identifier,
        phone: form.phone || null,
        group_id: form.group_id ? +form.group_id : null,
        sub_group_id: form.sub_group_id ? +form.sub_group_id : null,
      };
      if (editing) {
        await employeesApi.update(editing.id, payload);
        setToast({ ok: true, msg: "تم التحديث" });
      } else {
        await employeesApi.create(payload);
        setToast({ ok: true, msg: "تم الإضافة" });
      }
      openNew();
      await load();
    } catch (e: any) { setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" }); }
    finally { setBusy(false); }
  }

  async function remove(e: Emp) {
    if (!confirm(`حذف ${roleLabel} "${e.name}"؟`)) return;
    try {
      await employeesApi.delete(e.id);
      setToast({ ok: true, msg: "تم الحذف" });
      await load();
    } catch (err: any) { setToast({ ok: false, msg: err?.message ?? "فشل الحذف" }); }
  }

  function toggle(id: number) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(e => e.id)));
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`حذف ${ids.length} ${roleLabel}؟`)) return;
    try {
      // bulk-delete endpoint
      await fetch("/api/smos/employees/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      setSelected(new Set());
      setToast({ ok: true, msg: `تم حذف ${ids.length}` });
      await load();
    } catch (e: any) { setToast({ ok: false, msg: e?.message ?? "فشل الحذف" }); }
  }

  return (
    <>
      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <Stat label={`إجمالي ${roleLabel}`} value={rows.length} c="#2563EB" bg="#EFF6FF" ico="👥" />
        <Stat label="متزامن BioTime" value={rows.filter(r => r.is_added_to_biotime).length} c="#059669" bg="#ECFDF5" ico="✓" />
        <Stat label="غير متزامن" value={rows.filter(r => !r.is_added_to_biotime).length} c="#DC2626" bg="#FEF2F2" ico="✕" />
      </div>

      {toast && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit", fontSize: 14 }}>×</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <div>
          {/* TOOLBAR */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text" placeholder={`ابحث…`} value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 180, padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
            />
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, background: "var(--bg2)", color: "var(--tx1)" }}>
              <option value="">كل المجموعات</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={openNew} style={btnBlue}>➕ {roleLabel} جديد</button>
            {selected.size > 0 && (
              <button onClick={bulkDelete} style={btnRed}>🗑️ حذف ({selected.size})</button>
            )}
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
            ) : !filtered.length ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>لا يوجد {roleLabel}</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                      <th style={{ ...th, width: 40 }}>
                        <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} />
                      </th>
                      <th style={th}>#</th>
                      <th style={th}>الاسم</th>
                      <th style={th}>الهوية</th>
                      <th style={th}>الهاتف</th>
                      <th style={th}>المجموعة</th>
                      <th style={th}>BioTime</th>
                      <th style={{ ...th, width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.paginated.map((e, i) => (
                      <tr key={e.id} style={{ borderBottom: "1px solid var(--brd)", background: selected.has(e.id) ? "rgba(232,112,42,.06)" : undefined }}>
                        <td style={td}>
                          <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                        </td>
                        <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{e.name}</td>
                        <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{e.identifier ?? "—"}</td>
                        <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right", color: "var(--tx2)" }}>{e.phone ?? "—"}</td>
                        <td style={{ ...td, color: "var(--tx2)" }}>{e.group?.name ?? groups.find(g => g.id === e.group_id)?.name ?? "—"}</td>
                        <td style={td}>
                          {e.is_added_to_biotime ? (
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, color: "#059669", background: "#ECFDF5" }}>✓</span>
                          ) : (
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEF2F2" }}>✕</span>
                          )}
                        </td>
                        <td style={td}>
                          <button onClick={() => openEdit(e)} style={btnSm}>✏️</button>
                          <button onClick={() => remove(e)} style={{ ...btnSm, color: "#DC2626", borderColor: "#FECACA", background: "#FEF2F2" }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
                  onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
                />
              </div>
            )}
          </div>
        </div>

        {/* FORM */}
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, height: "fit-content", position: "sticky", top: 80 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>
            {editing ? `✏️ تعديل ${roleLabel}` : `➕ ${roleLabel} جديد`}
          </h3>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>الاسم *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>الهوية *</label>
            <input value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} style={inp} dir="ltr" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>الهاتف</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} dir="ltr" placeholder="+966…" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>المجموعة</label>
            <select value={form.group_id} onChange={e => setForm({ ...form, group_id: e.target.value, sub_group_id: "" })} style={inp}>
              <option value="">— اختر —</option>
              {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>الفصل الفرعي</label>
            <select value={form.sub_group_id} onChange={e => setForm({ ...form, sub_group_id: e.target.value })} style={inp} disabled={!form.group_id}>
              <option value="">— اختر —</option>
              {availableSubGroups.map((sg: any) => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
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

function Stat({ label, value, c, bg, ico }: { label: string; value: number; c: string; bg: string; ico: string }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{ico}</div>
      <div>
        <div style={{ fontSize: 10, color: "var(--tx2)" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "var(--fm)" }}>{value.toLocaleString("ar-EG")}</div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, color: "var(--tx2)", marginBottom: 4, fontWeight: 600 };
const btnBlue: React.CSSProperties = { padding: "8px 14px", background: "#2563EB", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnRed:  React.CSSProperties = { padding: "8px 14px", background: "#DC2626", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSave: React.CSSProperties = { flex: 1, padding: "10px 16px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSm: React.CSSProperties = { padding: "4px 8px", background: "var(--bg2)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", marginLeft: 4 };
