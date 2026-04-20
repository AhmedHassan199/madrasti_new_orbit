"use client";

import { useState, useEffect, useMemo } from "react";
import Pagination, { useClientPagination } from "./Pagination";

interface Group { id: number; name: string }

interface Props {
  fetcher: (params: Record<string, any>) => Promise<any>;
  groups: Group[];
  roleLabel: string;
  classLabel: string;
}

const STATUS_MAP: Record<number, { ar: string; c: string; bg: string; brd: string }> = {
  1: { ar: "حاضر",   c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  2: { ar: "متأخر",  c: "#D97706", bg: "#FFFBEB", brd: "#FDE68A" },
  3: { ar: "غائب",   c: "#DC2626", bg: "#FEF2F2", brd: "#FECACA" },
  4: { ar: "مستأذن", c: "#0891B2", bg: "#ECFEFF", brd: "#A5F3FC" },
};

export default function SignaturesView({ fetcher, groups, roleLabel, classLabel }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom]           = useState(weekAgo);
  const [to, setTo]               = useState(today);
  const [status, setStatus]       = useState<string>("all");
  const [classSection, setClass]  = useState<string>("all");
  const [employeeName, setName]   = useState("");
  const [studentId, setId]        = useState("");
  const [search, setSearch]       = useState("");

  async function load() {
    setLoading(true);
    try {
      const params: any = { is_search: true };
      if (from) params.from = from;
      if (to)   params.to = to;
      if (status && status !== "all")            params.status = status;
      if (classSection && classSection !== "all") params.class_section = classSection;
      if (employeeName) params.employee_name = employeeName;
      if (studentId)    params.student_id = studentId;
      const r: any = await fetcher(params);
      setRows(Array.isArray(r) ? r : (r?.data ?? []));
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      (r.employee?.name ?? "").toLowerCase().includes(s) ||
      (r.employee?.identifier ?? "").toLowerCase().includes(s) ||
      (r.employee?.sub_group?.name ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  const stats = useMemo(() => ({
    total:   rows.length,
    present: rows.filter(r => r.status === 1).length,
    late:    rows.filter(r => r.status === 2).length,
    absent:  rows.filter(r => r.status === 3).length,
    excused: rows.filter(r => r.status === 4).length,
  }), [rows]);

  const pg = useClientPagination(filtered, 50);

  function exportCsv() {
    const header = ["#","ID","Name","Class","Date","In","Out","Device","Status"];
    const lines = [header.join(",")];
    filtered.forEach((r, i) => {
      lines.push([
        i + 1,
        r.employee?.identifier ?? "",
        `"${r.employee?.name ?? ""}"`,
        `"${r.employee?.sub_group?.name ?? ""}"`,
        r.punch_date ?? "",
        r.punch_time ?? "",
        r.exit_time ?? "",
        `"${r.terminal?.name ?? ""}"`,
        STATUS_MAP[r.status]?.ar ?? "—",
      ].join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `signatures-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
        <Stat label="الإجمالي" value={stats.total}   c="#2563EB" bg="#EFF6FF" />
        <Stat label="حاضر"     value={stats.present} c="#059669" bg="#ECFDF5" />
        <Stat label="متأخر"    value={stats.late}    c="#D97706" bg="#FFFBEB" />
        <Stat label="غائب"     value={stats.absent}  c="#DC2626" bg="#FEF2F2" />
        <Stat label="مستأذن"   value={stats.excused} c="#0891B2" bg="#ECFEFF" />
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          <Field label="من تاريخ">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
          </Field>
          <Field label="إلى تاريخ">
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
          </Field>
          <Field label={`رقم ${roleLabel}`}>
            <input type="text" value={studentId} onChange={e => setId(e.target.value)} style={inp} />
          </Field>
          <Field label={`اسم ${roleLabel}`}>
            <input type="text" value={employeeName} onChange={e => setName(e.target.value)} style={inp} />
          </Field>
          <Field label="الحالة">
            <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
              <option value="all">الكل</option>
              <option value="1">حاضر</option>
              <option value="2">متأخر</option>
              <option value="3">غائب</option>
              <option value="4">مستأذن</option>
            </select>
          </Field>
          <Field label={classLabel}>
            <select value={classSection} onChange={e => setClass(e.target.value)} style={inp}>
              <option value="all">الكل</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
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

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>📭</div>
            {rows.length ? "لا نتائج مطابقة" : "لا توجد بصمات في هذا النطاق"}
          </div>
        ) : (
          <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                  {["#", `رقم ${roleLabel}`, `اسم ${roleLabel}`, classLabel, "التاريخ", "وقت الدخول", "وقت الخروج", "الجهاز", "الحالة"].map((h, i) => (
                    <th key={i} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map((r, i) => {
                  const st = STATUS_MAP[r.status];
                  return (
                    <tr key={r.id ?? `v-${i}`} style={{ borderBottom: "1px solid var(--brd)" }}>
                      <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{r.employee?.identifier ?? "—"}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.employee?.name ?? "—"}</td>
                      <td style={{ ...td, color: "var(--tx2)" }}>{r.employee?.sub_group?.name ?? "لا يوجد فصل"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)" }}>{r.punch_date ?? "—"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", color: "#059669", fontWeight: 600 }}>{r.punch_time ?? "—"}</td>
                      <td style={{ ...td, fontFamily: "var(--fm)", color: "#DC2626", fontWeight: 600 }}>{r.exit_time ?? "لم يسجل خروج"}</td>
                      <td style={{ ...td, fontSize: 11, color: "var(--tx2)" }}>{r.terminal?.name ?? "—"}</td>
                      <td style={td}>
                        {st && (
                          <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: st.c, background: st.bg, border: `1px solid ${st.brd}` }}>
                            {st.ar}
                          </span>
                        )}
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

function Stat({ label, value, c, bg }: { label: string; value: number; c: string; bg: string }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 10, color: "var(--tx2)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: c, fontFamily: "var(--fm)", padding: "4px 8px", borderRadius: 6, background: bg, display: "inline-block" }}>
        {value.toLocaleString("ar-EG")}
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
