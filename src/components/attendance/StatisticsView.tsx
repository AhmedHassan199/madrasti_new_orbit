"use client";

import { useState, useEffect, useMemo } from "react";
import Pagination, { useClientPagination } from "./Pagination";

interface Props {
  fetcher: (params: Record<string, any>) => Promise<any>;
  roleLabel: string;
  classLabel: string;
}

function formatDelay(mins: number): string {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h} ساعة${m > 0 ? ` ${m} دقيقة` : ""}`;
  return `${m} دقيقة`;
}

export default function StatisticsView({ fetcher, roleLabel, classLabel }: Props) {
  const today   = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo]     = useState(today.toISOString().slice(0, 10));
  const [status, setStatus] = useState<string>("all");
  const [studentId, setStudentId] = useState("");
  const [name, setName]           = useState("");
  const [search, setSearch]       = useState("");

  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = { from, to };
      if (status !== "all") params.status = status;
      if (studentId) params.student_id = studentId;
      if (name) params.employee_name = name;
      const res: any = await fetcher(params);
      setData(res?.data ?? res);
    } catch { setData(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const rows: any[] = data?.by_employee ?? [];
  const totals      = data?.totals ?? { present: 0, late: 0, absent: 0, excused: 0, total: 0 };

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      (r.name ?? "").toLowerCase().includes(s) ||
      (r.identifier ?? "").toLowerCase().includes(s) ||
      (r.group ?? "").toLowerCase().includes(s) ||
      (r.sub_group ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  const pg = useClientPagination(filtered, 50);

  const pct = (n: number) => totals.total ? Math.round((n / totals.total) * 100) : 0;

  function exportCsv() {
    const header = ["#","ID","Name","Class","Absent Days","Total Delay (min)"];
    const lines = [header.join(",")];
    filtered.forEach((r, i) => {
      lines.push([
        i + 1,
        r.identifier ?? "",
        `"${r.name ?? ""}"`,
        `"${r.sub_group ?? r.group ?? ""}"`,
        r.total_absent_days ?? 0,
        r.total_delay_time ?? 0,
      ].join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `statistics-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* TOTALS KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi label="الإجمالي" value={totals.total}   c="#2563EB" bg="#EFF6FF" />
        <Kpi label="حاضر"     value={totals.present} c="#059669" bg="#ECFDF5" pct={pct(totals.present)} />
        <Kpi label="متأخر"    value={totals.late}    c="#D97706" bg="#FFFBEB" pct={pct(totals.late)} />
        <Kpi label="غائب"     value={totals.absent}  c="#DC2626" bg="#FEF2F2" pct={pct(totals.absent)} />
        <Kpi label="مستأذن"   value={totals.excused} c="#0891B2" bg="#ECFEFF" pct={pct(totals.excused)} />
      </div>

      {/* FILTERS */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          <Field label="من تاريخ">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
          </Field>
          <Field label="إلى تاريخ">
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
          </Field>
          <Field label={`رقم ${roleLabel}`}>
            <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} style={inp} />
          </Field>
          <Field label={`اسم ${roleLabel}`}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inp} />
          </Field>
          <Field label="الحالة">
            <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
              <option value="all">الكل</option>
              <option value="2">متأخرين فقط</option>
              <option value="3">غائبين فقط</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading} style={btnPrimary}>
            {loading ? "جاري التحميل…" : "🔍 بحث"}
          </button>
          <button onClick={exportCsv} disabled={!filtered.length} style={btnGhost}>📥 تصدير CSV</button>
          <input
            type="text"
            placeholder="بحث سريع في النتائج…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, flex: 1, minWidth: 180 }}
          />
        </div>
      </div>

      {/* PER-EMPLOYEE TABLE */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>📊</div>
            {rows.length ? "لا نتائج مطابقة" : "لا توجد إحصائيات في هذه الفترة"}
          </div>
        ) : (
          <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                  {["#", `رقم ${roleLabel}`, `اسم ${roleLabel}`, classLabel, "أيام الغياب", "وقت التأخير"].map((h, i) => (
                    <th key={i} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map((r, i) => (
                  <tr key={r.employee_id ?? i} style={{ borderBottom: "1px solid var(--brd)" }}>
                    <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                    <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{r.identifier ?? "—"}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.name ?? "—"}</td>
                    <td style={{ ...td, color: "var(--tx2)" }}>{r.sub_group ?? r.group ?? "—"}</td>
                    <td style={{ ...td, fontFamily: "var(--fm)", color: (r.total_absent_days ?? 0) > 0 ? "#DC2626" : "var(--tx2)", fontWeight: 700 }}>
                      {(r.total_absent_days ?? 0).toLocaleString("ar-EG")}
                    </td>
                    <td style={{ ...td, color: (r.total_delay_time ?? 0) > 0 ? "#D97706" : "var(--tx2)", fontWeight: 600 }}>
                      {formatDelay(r.total_delay_time ?? 0)}
                    </td>
                  </tr>
                ))}
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

function Kpi({ label, value, c, bg, pct }: { label: string; value: number; c: string; bg: string; pct?: number }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 10, color: "var(--tx2)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6, padding: "4px 8px", borderRadius: 6, background: bg }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: c, fontFamily: "var(--fm)" }}>{(value ?? 0).toLocaleString("ar-EG")}</span>
        {pct !== undefined && <span style={{ fontSize: 10, color: c, fontFamily: "var(--fm)" }}>({pct}%)</span>}
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

const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "var(--bg2)", color: "var(--tx1)" };
const btnPrimary: React.CSSProperties = { padding: "7px 14px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnGhost:   React.CSSProperties = { padding: "7px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
