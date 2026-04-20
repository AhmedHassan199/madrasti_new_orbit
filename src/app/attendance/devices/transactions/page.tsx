"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { attendanceApi } from "@/lib/attendance-api";
import Pagination, { useClientPagination } from "@/components/attendance/Pagination";

/* ═══════════════════════════════════════
   PUNCH STATE CONFIG
═══════════════════════════════════════ */
const PUNCH_STATE: Record<number, { ar: string; c: string; bg: string; brd: string }> = {
  1: { ar: "دخول", c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  0: { ar: "خروج", c: "#DC2626", bg: "#FEF2F2", brd: "#FECACA" },
};

const STATUS_CONFIG: Record<number, { ar: string; c: string; bg: string; brd: string }> = {
  1: { ar: "حاضر",   c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  2: { ar: "متأخر",  c: "#D97706", bg: "#FFFBEB", brd: "#FDE68A" },
  3: { ar: "غائب",   c: "#DC2626", bg: "#FEF2F2", brd: "#FECACA" },
  4: { ar: "مستأذن", c: "#0891B2", bg: "#ECFEFF", brd: "#A5F3FC" },
};

interface Txn {
  id: number;
  punch_date: string;
  punch_time: string | null;
  punch_state: number;
  punch_state_name: string;
  biotime_upload_time: string | null;
  status: number;
  status_label: string;
  employee: { id: number; name: string; identifier: string; group: { id: number; name: string } | null } | null;
  terminal: { id: number; name: string; sn: string } | null;
}

export default function DeviceTransactionsPage() {
  const { lang } = useUi();
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);

  /* Filters */
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [identifier, setIdentifier] = useState("");
  const [sn, setSn]               = useState("");
  const [perPage, setPerPage]     = useState(50);

  /* Count button state */
  const [countValue, setCountValue] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = { per_page: perPage };
      if (startDate) params.from       = startDate;
      if (endDate)   params.to         = endDate;
      if (identifier) params.identifier = identifier;
      if (sn) params.sn                = sn;
      const r: any = await attendanceApi.devices.transactions(params);
      const arr = Array.isArray(r) ? r : (r?.data ?? []);
      setRows(arr);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function runCount() {
    setCounting(true);
    setCountValue(null);
    try {
      const params: any = {};
      if (startDate) params.from = startDate;
      if (endDate)   params.to   = endDate;
      const r: any = await attendanceApi.devices.transactionsCount(params);
      setCountValue(r?.count ?? r?.data?.count ?? 0);
    } catch { setCountValue(0); }
    finally { setCounting(false); }
  }

  /* Stats — punch_state=1 means دخول, status only meaningful on دخول rows */
  const stats = useMemo(() => {
    const total = rows.length;
    const checkin  = rows.filter(r => r.punch_state === 1).length;
    const checkout = rows.filter(r => r.punch_state !== 1).length;
    const present  = rows.filter(r => r.punch_state === 1 && r.status === 1).length;
    const late     = rows.filter(r => r.punch_state === 1 && r.status === 2).length;
    return { total, checkin, checkout, present, late };
  }, [rows]);

  const pg = useClientPagination(rows, 50);

  function clearFilters() {
    setStartDate(""); setEndDate(""); setIdentifier(""); setSn("");
    setTimeout(load, 0);
  }

  function exportCsv() {
    const header = ["ID","الرقم","الاسم","المجموعة","التاريخ","الوقت","الحالة","الرقم التسلسلي","الجهاز"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.id,
        r.employee?.identifier ?? "",
        `"${r.employee?.name ?? ""}"`,
        `"${r.employee?.group?.name ?? ""}"`,
        r.punch_date,
        r.punch_time ?? "",
        `"${r.punch_state_name}"`,
        r.terminal?.sn ?? "",
        `"${r.terminal?.name ?? ""}"`,
      ].join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout
      title={lang === "ar" ? "كل البصمات" : "All Transactions"}
      subtitle={lang === "ar" ? "عرض وتصفية جميع بصمات الأجهزة" : "View and filter all device punches"}
    >
      {/* ═══ STATS KPIs ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="إجمالي البصمات" value={stats.total} c="#2563EB" bg="#EFF6FF" ico="📊" />
        <StatCard label="دخول" value={stats.checkin} c="#059669" bg="#ECFDF5" ico="⬇️" />
        <StatCard label="خروج" value={stats.checkout} c="#DC2626" bg="#FEF2F2" ico="⬆️" />
        <StatCard label="حضور" value={stats.present} c="#059669" bg="#ECFDF5" ico="✓" />
        <StatCard label="متأخر" value={stats.late} c="#D97706" bg="#FFFBEB" ico="⏰" />
      </div>

      {/* ═══ FILTERS CARD ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <Field label="من تاريخ">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inpS} />
          </Field>
          <Field label="إلى تاريخ">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inpS} />
          </Field>
          <Field label="رقم الهوية / الاسم">
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="ابحث بالهوية أو الاسم" style={inpS} />
          </Field>
          <Field label="الرقم التسلسلي للجهاز">
            <input type="text" value={sn} onChange={e => setSn(e.target.value)} placeholder="SN" style={inpS} />
          </Field>
          <Field label="عدد الصفوف">
            <select value={perPage} onChange={e => setPerPage(parseInt(e.target.value))} style={inpS}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={load} style={btnPrimary}>🔍 تصفية</button>
          <button onClick={clearFilters} style={btnGhost}>✕ مسح</button>
          <button onClick={runCount} disabled={counting} style={btnOrange}>
            {counting ? "جاري العد…" : "🔢 عد السجلات"}
          </button>
          <button onClick={exportCsv} style={btnGhost} disabled={!rows.length}>
            📥 تصدير CSV
          </button>
        </div>

        {countValue !== null && !counting && (
          <div style={{ marginTop: 12, padding: 16, background: "#FFF4EC", border: "2px solid #FED7AA", borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#9A3412", marginBottom: 4 }}>إجمالي السجلات المطابقة</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#D95D13", fontFamily: "var(--fm)" }}>
              {countValue.toLocaleString("ar-EG")}
            </div>
          </div>
        )}
      </div>

      {/* ═══ TABLE CARD ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !rows.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>📭</div>
            لا توجد بصمات
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                  {["#","الرقم","الاسم","المجموعة","التاريخ والوقت","وقت الرفع","نوع البصمة","الحالة","SN","الجهاز"].map((h, i) => (
                    <th key={i} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map((r, i) => {
                  const ps = PUNCH_STATE[r.punch_state] ?? PUNCH_STATE[0];
                  const isCheckIn = r.punch_state === 1;
                  const st = isCheckIn ? STATUS_CONFIG[r.status] : null;
                  return (
                    <tr key={r.id ?? i} style={{ borderBottom: "1px solid var(--brd)" }}>
                      <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{r.id}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>
                        {r.employee?.identifier ?? "—"}
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.employee?.name ?? "—"}</td>
                      <td style={{ ...td, color: "var(--tx2)" }}>{r.employee?.group?.name ?? "لم يتم إضافة"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", whiteSpace: "nowrap" }}>
                        <div>{r.punch_date}</div>
                        <div style={{ color: "var(--tx2)", fontSize: 11 }}>{r.punch_time ?? "—"}</div>
                      </td>
                      <td style={{ ...td, fontFamily: "var(--fm)", fontSize: 11, color: "var(--tx2)" }}>
                        {r.biotime_upload_time ? r.biotime_upload_time.replace("T", " ").slice(0, 16) : "—"}
                      </td>
                      <td style={td}>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: ps.c, background: ps.bg, border: `1px solid ${ps.brd}` }}>
                          {ps.ar}
                        </span>
                      </td>
                      <td style={td}>
                        {st ? (
                          <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: st.c, background: st.bg, border: `1px solid ${st.brd}` }}>
                            {st.ar}
                          </span>
                        ) : (
                          <span style={{ color: "var(--tx2)", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ ...td, fontFamily: "var(--fm)", fontSize: 11, direction: "ltr", textAlign: "right" }}>
                        {r.terminal?.sn ?? "—"}
                      </td>
                      <td style={td}>{r.terminal?.name ?? "—"}</td>
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
    </DashboardLayout>
  );
}

/* ═══════════════════════════════════════
   SUBCOMPONENTS
═══════════════════════════════════════ */
function StatCard({ label, value, c, bg, ico }: { label: string; value: number; c: string; bg: string; ico: string }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
        {ico}
      </div>
      <div>
        <div style={{ fontSize: 10, color: "var(--tx2)" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "var(--fm)" }}>{value.toLocaleString("ar-EG")}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: "var(--tx2)", marginBottom: 4, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════
   STYLES
═══════════════════════════════════════ */
const inpS: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "var(--bg2)", color: "var(--tx1)" };
const btnPrimary: React.CSSProperties = { padding: "7px 14px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnGhost:   React.CSSProperties = { padding: "7px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnOrange:  React.CSSProperties = { padding: "7px 14px", background: "#D95D13", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "8px 12px", fontSize: 12 };
