"use client";

import { useState, useEffect, useMemo } from "react";
import { attendanceApi } from "@/lib/attendance-api";
import Pagination, { useClientPagination } from "./Pagination";

/* ═══════════════════════════════════════
   STATUS CONFIG — 4 color buckets
═══════════════════════════════════════ */
const STATUS_META: Record<string, { ar: string; c: string; bg: string; rowBg: string; brd: string }> = {
  green:  { ar: "البصمة سليمة",                 c: "#065F46", bg: "#16A34A", rowBg: "#DCFCE7", brd: "#86EFAC" },
  yellow: { ar: "يحتاج تبصيم",                   c: "#78350F", bg: "#F59E0B", rowBg: "#FEF3C7", brd: "#FCD34D" },
  red:    { ar: "غير موجود في أجهزة البصمة",     c: "#7F1D1D", bg: "#DC2626", rowBg: "#FEE2E2", brd: "#FCA5A5" },
  blue:   { ar: "موجود بالبصمة فقط",             c: "#1E3A8A", bg: "#2563EB", rowBg: "#DBEAFE", brd: "#93C5FD" },
};

interface Emp {
  id: number | null;
  source: "local" | "biotime";
  name: string;
  identifier: string;
  phone: string | null;
  group: string | null;
  biotime_id: string | null;
  is_added_to_biotime: boolean;
  fingerprint: string;
  status: "green" | "yellow" | "red" | "blue";
}

interface Props {
  type: "student" | "teacher";
  roleLabel: string;
}

export default function BiotimeComparisonView({ type, roleLabel }: Props) {
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading]     = useState(true);
  const [bioUnreachable, setBioUnreachable] = useState(false);
  const [search, setSearch]       = useState("");
  const [colorFilter, setColorFilter] = useState<"all" | "green" | "yellow" | "red" | "blue">("all");
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [busy, setBusy]           = useState(false);
  const [toast, setToast]         = useState<{ ok: boolean; msg: string } | null>(null);
  const [conn, setConn]           = useState<"checking" | "ok" | "fail" | "unknown">("unknown");

  async function load() {
    setLoading(true);
    try {
      const r: any = await attendanceApi.biotime.employees({ type, search: search || undefined });
      const data = r?.data ?? r;
      setEmployees(data?.employees ?? []);
      setBioUnreachable(!!data?.bio_unreachable);
    } catch { setEmployees([]); }
    finally { setLoading(false); }
  }

  async function checkConnection() {
    setConn("checking");
    try {
      const r: any = await attendanceApi.biotime.testConnection();
      const data = r?.data ?? r;
      setConn(data?.connected ? "ok" : "fail");
    } catch { setConn("fail"); }
  }

  useEffect(() => { load(); checkConnection(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    let list = employees;
    if (colorFilter !== "all") list = list.filter(e => e.status === colorFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        (e.name ?? "").toLowerCase().includes(s) ||
        (e.identifier ?? "").toLowerCase().includes(s) ||
        (e.phone ?? "").toLowerCase().includes(s) ||
        (e.group ?? "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [employees, search, colorFilter]);

  const counts = useMemo(() => ({
    total:  employees.length,
    green:  employees.filter(e => e.status === "green").length,
    yellow: employees.filter(e => e.status === "yellow").length,
    red:    employees.filter(e => e.status === "red").length,
    blue:   employees.filter(e => e.status === "blue").length,
  }), [employees]);

  const pg = useClientPagination(filtered, 50);

  /* Selection only valid for local records with an id */
  const selectableIds = useMemo(() => pg.paginated.filter(e => e.id !== null).map(e => e.id as number), [pg.paginated]);

  function toggle(id: number) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === selectableIds.length) setSelected(new Set());
    else setSelected(new Set(selectableIds));
  }

  async function runAdd(all: boolean) {
    const ids = all ? [] : Array.from(selected);
    if (!all && !ids.length) { setToast({ ok: false, msg: "اختر واحد على الأقل" }); return; }
    const count = all ? counts.red : ids.length;
    if (!confirm(all ? `مزامنة كل الـ ${counts.red} ${roleLabel} غير المتزامنين؟` : `مزامنة ${count} ${roleLabel}؟`)) return;
    setBusy(true);
    try {
      const r: any = await attendanceApi.biotime.addEmployees({ type, employee_ids: ids });
      const data = r?.data ?? r;
      setToast({ ok: true, msg: data?.message ?? "تم جدولة الإضافة" });
      setSelected(new Set());
      setTimeout(load, 2000);
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشلت العملية" });
    } finally { setBusy(false); }
  }

  async function runRemove() {
    const ids = Array.from(selected);
    if (!ids.length) { setToast({ ok: false, msg: "اختر واحد على الأقل" }); return; }
    if (!confirm(`حذف ${ids.length} ${roleLabel} من BioTime؟`)) return;
    setBusy(true);
    try {
      const r: any = await attendanceApi.biotime.removeEmployees(ids);
      const data = r?.data ?? r;
      setToast({ ok: true, msg: data?.message ?? "تم جدولة الحذف" });
      setSelected(new Set());
      setTimeout(load, 2000);
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشلت العملية" });
    } finally { setBusy(false); }
  }

  async function runSyncDevices() {
    if (!confirm("مزامنة الأجهزة من BioTime؟")) return;
    setBusy(true);
    try {
      const r: any = await attendanceApi.biotime.syncDevices();
      const data = r?.data ?? r;
      setToast({ ok: true, msg: data?.message ?? "تم بدء المزامنة" });
    } catch (e: any) { setToast({ ok: false, msg: e?.message ?? "فشلت المزامنة" }); }
    finally { setBusy(false); }
  }

  return (
    <>
      {/* ═══ HEADER STATUS STRIP ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 14 }}>
        <Stat label="الإجمالي" value={counts.total} color="#2563EB" bg="#EFF6FF" />
        <Stat label="✓ سليمة" value={counts.green} color="#16A34A" bg="#DCFCE7" />
        <Stat label="⚠ تحتاج تبصيم" value={counts.yellow} color="#D97706" bg="#FEF3C7" />
        <Stat label="✕ غير موجود بالبصمة" value={counts.red} color="#DC2626" bg="#FEE2E2" />
        <Stat label="ℹ بالبصمة فقط" value={counts.blue} color="#2563EB" bg="#DBEAFE" />
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: conn === "ok" ? "#DCFCE7" : conn === "fail" ? "#FEE2E2" : "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
            {conn === "ok" ? "🟢" : conn === "fail" ? "🔴" : conn === "checking" ? "⏳" : "❓"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "var(--tx2)" }}>حالة BioTime</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: conn === "ok" ? "#059669" : conn === "fail" ? "#DC2626" : "#D97706" }}>
              {conn === "ok" ? "متصل" : conn === "fail" ? "غير متصل" : "جاري…"}
            </div>
          </div>
          <button onClick={checkConnection} disabled={conn === "checking"} style={{ padding: "3px 7px", fontSize: 10, background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 4, cursor: "pointer" }}>🔄</button>
        </div>
      </div>

      {bioUnreachable && (
        <div style={{ marginBottom: 14, padding: 10, borderRadius: 6, background: "#FEF3C7", border: "1px solid #FCD34D", color: "#78350F", fontSize: 12, fontWeight: 600 }}>
          ⚠️ لم نتمكن من الوصول لسيرفر BioTime — القائمة تعتمد على البيانات المحلية فقط.
        </div>
      )}

      {/* ═══ LEGEND ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>تصفية حسب اللون/المصدر</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(STATUS_META).map(([k, meta]) => (
            <LegendPill
              key={k}
              active={colorFilter === k}
              color={meta.bg}
              label={meta.ar}
              onClick={() => setColorFilter(colorFilter === k ? "all" : k as any)}
            />
          ))}
          <button
            onClick={() => setColorFilter("all")}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              cursor: "pointer", color: colorFilter === "all" ? "#fff" : "var(--tx1)",
              background: colorFilter === "all" ? "#111827" : "var(--bg3)",
              border: `1px solid ${colorFilter === "all" ? "#111827" : "var(--brd)"}`,
            }}
          >الكل</button>
        </div>
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 10, padding: 12, marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder={`بحث في ${roleLabel}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
        />
        <button onClick={runRemove} disabled={busy || !selected.size} style={btnRed}>
          🗑️ حذف المحدد ({selected.size})
        </button>
        <button onClick={() => runAdd(false)} disabled={busy || !selected.size} style={btnYellow}>
          🔄 مزامنة المحدد ({selected.size})
        </button>
        <button onClick={() => runAdd(true)} disabled={busy || !counts.red} style={btnBlue}>
          🔄 مزامنة الجميع
        </button>
        <button onClick={runSyncDevices} disabled={busy} style={btnGhost}>
          🖥️ مزامنة الأجهزة
        </button>
      </div>

      {toast && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit", fontSize: 14 }}>×</button>
        </div>
      )}

      {/* ═══ TABLE ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>👥</div>
            {employees.length ? "لا نتائج" : `لا يوجد ${roleLabel}`}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#D37C08", color: "#fff" }}>
                  <th style={{ ...th, width: 40 }}>
                    <input type="checkbox" checked={selectableIds.length > 0 && selected.size === selectableIds.length} onChange={toggleAll} />
                  </th>
                  <th style={th}>#</th>
                  <th style={th}>الاسم</th>
                  <th style={th}>رقم الهاتف</th>
                  <th style={th}>رقم الهوية</th>
                  <th style={th}>المجموعة</th>
                  <th style={th}>الحالة</th>
                  <th style={{ ...th, width: 120 }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map((e, i) => {
                  const meta = STATUS_META[e.status];
                  const selectable = e.id !== null;
                  const isSel = selectable && selected.has(e.id as number);
                  return (
                    <tr key={`${e.source}-${e.id ?? e.identifier}`} style={{
                      background: isSel ? `${meta.rowBg}dd` : meta.rowBg,
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                    }}>
                      <td style={td}>
                        {selectable ? (
                          <input type="checkbox" checked={isSel} onChange={() => toggle(e.id as number)} />
                        ) : <span style={{ color: "var(--tx2)", fontSize: 10 }}>—</span>}
                      </td>
                      <td style={{ ...td, fontFamily: "var(--fm)", color: "#4B5563" }}>{pg.start + i + 1}</td>
                      <td style={{ ...td, fontWeight: 700, color: "#111827" }}>{e.name}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right", color: "#4B5563" }}>{e.phone ?? "—"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right", color: "#111827" }}>{e.identifier ?? "—"}</td>
                      <td style={{ ...td, color: "#4B5563" }}>{e.group ?? "—"}</td>
                      <td style={td}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 6,
                          fontSize: 10, fontWeight: 700, color: "#fff", background: meta.bg, whiteSpace: "nowrap",
                        }}>
                          {meta.ar}
                        </span>
                      </td>
                      <td style={td}>
                        {e.status === "green" && <Badge color="#22C55E">✓ تمت المزامنة</Badge>}
                        {e.status === "yellow" && <Badge color="#F59E0B">⚠ يحتاج تبصيم</Badge>}
                        {e.status === "red" && selectable && (
                          <button onClick={() => { setSelected(new Set([e.id as number])); runAdd(false); }} style={btnYellowSm}>
                            🔄 مزامنة
                          </button>
                        )}
                        {e.status === "blue" && <Badge color="#2563EB">📡 BioTime فقط</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
              onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
            />
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════ */
function Stat({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "var(--fm)" }}>{value.toLocaleString("ar-EG")}</div>
    </div>
  );
}

function LegendPill({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
        cursor: "pointer", color: "#fff", background: color,
        border: `2px solid ${active ? "#111827" : color}`,
        opacity: active ? 1 : 0.85,
        boxShadow: active ? "0 2px 4px rgba(0,0,0,0.15)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, color: "#fff", background: color, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
const btnRed:    React.CSSProperties = { padding: "8px 12px", background: "#DC2626", color: "#fff", border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" };
const btnYellow: React.CSSProperties = { padding: "8px 12px", background: "#F59E0B", color: "#fff", border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" };
const btnYellowSm: React.CSSProperties = { padding: "4px 8px", background: "#F59E0B", color: "#fff", border: 0, borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer" };
const btnBlue:   React.CSSProperties = { padding: "8px 12px", background: "#2563EB", color: "#fff", border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" };
const btnGhost:  React.CSSProperties = { padding: "8px 12px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" };
