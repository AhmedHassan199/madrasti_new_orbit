"use client";

import { useState, useEffect, useMemo } from "react";
import { attendanceApi } from "@/lib/attendance-api";
import Pagination, { useClientPagination } from "./Pagination";

interface Props {
  type: "student" | "teacher";
  roleLabel: string;
  bulkAction: (data: { std_ids: number[]; std_time?: Record<number, string>; unified_punch_time?: string }) => Promise<any>;
}

export default function AddEarlyLeaveView({ type, roleLabel, bulkAction }: Props) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [unifiedTime, setUnifiedTime] = useState("");
  const [perEmpTime, setPerEmpTime]   = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r: any = await attendanceApi.biotime.employees({ type });
      const data = r?.data ?? r;
      const all = [...(data?.unsynced ?? []), ...(data?.synced ?? [])];
      setEmployees(all);
    } catch { setEmployees([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const s = search.toLowerCase();
    return employees.filter(e =>
      (e.name ?? "").toLowerCase().includes(s) ||
      (e.identifier ?? "").toLowerCase().includes(s) ||
      (e.phone ?? "").toLowerCase().includes(s)
    );
  }, [employees, search]);

  const pg = useClientPagination(filtered, 50);

  function toggle(id: number) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(e => e.id)));
  }

  async function submit() {
    const ids = Array.from(selected);
    if (!ids.length) { setToast({ ok: false, msg: `اختر ${roleLabel} واحد على الأقل` }); return; }

    const timesProvided = unifiedTime || ids.some(id => perEmpTime[id]);
    if (!timesProvided) { setToast({ ok: false, msg: "أدخل وقت الانصراف (موحّد أو فردي)" }); return; }

    if (!confirm(`إضافة طلب استئذان لـ ${ids.length} ${roleLabel}؟`)) return;

    setBusy(true);
    try {
      const r: any = await bulkAction({
        std_ids: ids,
        unified_punch_time: unifiedTime || undefined,
        std_time: !unifiedTime ? (Object.fromEntries(ids.filter(id => perEmpTime[id]).map(id => [id, perEmpTime[id]]))) : undefined,
      });
      const data = r?.data ?? r;
      setToast({ ok: true, msg: data?.message ?? "تمت الإضافة" });
      setSelected(new Set());
      setPerEmpTime({});
      setUnifiedTime("");
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الإضافة" });
    } finally { setBusy(false); }
  }

  return (
    <>
      {/* TOP CARD — unified time + submit */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--tx2)", marginBottom: 6, fontWeight: 600 }}>⏰ وقت الانصراف الموحّد (اختياري)</label>
            <input type="time" value={unifiedTime} onChange={e => setUnifiedTime(e.target.value)} style={inp} />
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 4 }}>
              لو محدد، هيطبّق على كل المختارين. سيبه فاضي عشان تحدد وقت مختلف لكل {roleLabel}.
            </div>
          </div>
          <button onClick={submit} disabled={busy || !selected.size} style={{
            padding: "10px 20px", background: busy ? "var(--bg3)" : "#2563EB",
            color: "#fff", border: 0, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            {busy ? "جاري…" : `➕ إضافة استئذان (${selected.size})`}
          </button>
        </div>

        {toast && (
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 6,
            background: toast.ok ? "#ECFDF5" : "#FEF2F2",
            border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`,
            color: toast.ok ? "#065F46" : "#991B1B",
            fontSize: 12, fontWeight: 600,
          }}>
            {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
            <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit" }}>×</button>
          </div>
        )}
      </div>

      {/* SEARCH */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder={`ابحث في ${roleLabel} بالاسم، الهوية، أو الهاتف…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
        />
      </div>

      {/* TABLE */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>😕</div>
            {employees.length ? "لا نتائج" : `لا يوجد ${roleLabel}`}
          </div>
        ) : (
          <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#D95D13", color: "#fff" }}>
                  <th style={{ ...th, width: 40 }}>
                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} />
                  </th>
                  <th style={th}>#</th>
                  <th style={th}>الاسم</th>
                  <th style={th}>رقم الهاتف</th>
                  <th style={th}>الهوية</th>
                  <th style={{ ...th, width: 140 }}>وقت الخروج</th>
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map((e, i) => {
                  const isSel = selected.has(e.id);
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid var(--brd)", background: isSel ? "rgba(232,112,42,.06)" : undefined }}>
                      <td style={td}>
                        <input type="checkbox" checked={isSel} onChange={() => toggle(e.id)} />
                      </td>
                      <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{e.name}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right", color: "var(--tx2)" }}>{e.phone ?? "غير متوفر"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{e.identifier ?? "—"}</td>
                      <td style={td}>
                        <input
                          type="time"
                          value={perEmpTime[e.id] ?? ""}
                          onChange={ev => setPerEmpTime({ ...perEmpTime, [e.id]: ev.target.value })}
                          disabled={!isSel || !!unifiedTime}
                          style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--brd)", borderRadius: 4, fontSize: 12, background: (!isSel || !!unifiedTime) ? "var(--bg3)" : "var(--bg2)", color: "var(--tx1)" }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
            onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
          />
          </>
        )}
      </div>
    </>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" };
