"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { attendanceApi } from "@/lib/attendance-api";

interface Row {
  department: string;
  present: number;
  late: number;
  absent: number;
  total: number;
}

export default function DeviceReportPage() {
  const { lang } = useUi();

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0, 10));
  const [to, setTo]     = useState(today.toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [search, setSearch]   = useState("");

  async function load() {
    setLoading(true);
    try {
      const r: any = await attendanceApi.devices.report({ from, to });
      const arr = Array.isArray(r) ? r : (r?.data ?? []);
      setRows(arr.map((x: any) => ({
        department: x.department,
        present: Number(x.present ?? 0),
        late:    Number(x.late ?? 0),
        absent:  Number(x.absent ?? 0),
        total:   Number(x.total ?? 0),
      })));
      setLoaded(true);
    } catch { setRows([]); setLoaded(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter(r => !search || r.department.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    present: a.present + r.present,
    late:    a.late + r.late,
    absent:  a.absent + r.absent,
    total:   a.total + r.total,
  }), { present: 0, late: 0, absent: 0, total: 0 }), [filtered]);

  const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;

  function exportCsv() {
    const header = ["القسم","حاضر","متأخر","غائب","الإجمالي","نسبة الحضور %"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([`"${r.department}"`, r.present, r.late, r.absent, r.total, pct(r.present, r.total)].join(","));
    }
    lines.push(["الإجمالي", totals.present, totals.late, totals.absent, totals.total, pct(totals.present, totals.total)].join(","));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout
      title={lang === "ar" ? "تقرير الحضور حسب القسم" : "Attendance Report by Department"}
      subtitle={lang === "ar" ? "إحصائيات الحضور والغياب لكل قسم في الفترة المحددة" : "Department-wise attendance breakdown"}
    >
      {/* ═══ SUMMARY KPIs ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="إجمالي البصمات" value={totals.total} c="#2563EB" bg="#EFF6FF" ico="📊" />
        <StatCard label="حاضر" value={totals.present} c="#059669" bg="#ECFDF5" ico="✓" pct={pct(totals.present, totals.total)} />
        <StatCard label="متأخر" value={totals.late} c="#D97706" bg="#FFFBEB" ico="⏰" pct={pct(totals.late, totals.total)} />
        <StatCard label="غائب" value={totals.absent} c="#DC2626" bg="#FEF2F2" ico="✕" pct={pct(totals.absent, totals.total)} />
      </div>

      {/* ═══ FILTERS ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <Field label="من تاريخ">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inpS} />
          </Field>
          <Field label="إلى تاريخ">
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inpS} />
          </Field>
          <Field label="بحث بالقسم">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="اكتب اسم القسم…" style={inpS} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={load} disabled={loading} style={btnPrimary}>
            {loading ? "جاري التحميل…" : "🔍 تحديث التقرير"}
          </button>
          <button onClick={exportCsv} disabled={!filtered.length} style={btnGhost}>
            📥 تصدير CSV
          </button>
        </div>
      </div>

      {/* ═══ TABLE ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !loaded ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>اضغط تحديث التقرير</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>📭</div>
            لا توجد بيانات في هذه الفترة
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                  <th style={th}>القسم</th>
                  <th style={th}>حاضر</th>
                  <th style={th}>متأخر</th>
                  <th style={th}>غائب</th>
                  <th style={th}>الإجمالي</th>
                  <th style={{ ...th, minWidth: 160 }}>نسبة الحضور</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const presentPct = pct(r.present, r.total);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--brd)" }}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.department}</td>
                      <td style={{ ...td, color: "#059669", fontWeight: 700, fontFamily: "var(--fm)" }}>{r.present.toLocaleString("ar-EG")}</td>
                      <td style={{ ...td, color: "#D97706", fontWeight: 700, fontFamily: "var(--fm)" }}>{r.late.toLocaleString("ar-EG")}</td>
                      <td style={{ ...td, color: "#DC2626", fontWeight: 700, fontFamily: "var(--fm)" }}>{r.absent.toLocaleString("ar-EG")}</td>
                      <td style={{ ...td, fontWeight: 700, fontFamily: "var(--fm)" }}>{r.total.toLocaleString("ar-EG")}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 8, background: "var(--bg3)", borderRadius: 4, overflow: "hidden", minWidth: 80 }}>
                            <div style={{
                              width: `${presentPct}%`, height: "100%",
                              background: presentPct >= 80 ? "#059669" : presentPct >= 50 ? "#D97706" : "#DC2626",
                              transition: "width 0.3s",
                            }} />
                          </div>
                          <span style={{ fontFamily: "var(--fm)", fontSize: 11, fontWeight: 700, color: presentPct >= 80 ? "#059669" : presentPct >= 50 ? "#D97706" : "#DC2626", minWidth: 36, textAlign: "right" }}>
                            {presentPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--bg3)", fontWeight: 700 }}>
                  <td style={{ ...td, fontWeight: 800 }}>الإجمالي</td>
                  <td style={{ ...td, color: "#059669", fontWeight: 800, fontFamily: "var(--fm)" }}>{totals.present.toLocaleString("ar-EG")}</td>
                  <td style={{ ...td, color: "#D97706", fontWeight: 800, fontFamily: "var(--fm)" }}>{totals.late.toLocaleString("ar-EG")}</td>
                  <td style={{ ...td, color: "#DC2626", fontWeight: 800, fontFamily: "var(--fm)" }}>{totals.absent.toLocaleString("ar-EG")}</td>
                  <td style={{ ...td, fontWeight: 800, fontFamily: "var(--fm)" }}>{totals.total.toLocaleString("ar-EG")}</td>
                  <td style={{ ...td, fontWeight: 800, fontFamily: "var(--fm)" }}>{pct(totals.present, totals.total)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ═══════════════════════════════════════ */
function StatCard({ label, value, c, bg, ico, pct }: { label: string; value: number; c: string; bg: string; ico: string; pct?: number }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        {ico}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "var(--tx2)" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "var(--fm)" }}>
          {value.toLocaleString("ar-EG")}
          {pct !== undefined && <span style={{ fontSize: 10, fontWeight: 600, marginInlineStart: 6, color: "var(--tx2)" }}>({pct}%)</span>}
        </div>
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

const inpS: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "var(--bg2)", color: "var(--tx1)" };
const btnPrimary: React.CSSProperties = { padding: "7px 14px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnGhost:   React.CSSProperties = { padding: "7px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
