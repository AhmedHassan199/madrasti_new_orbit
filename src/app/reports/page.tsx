"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { reportsApi } from "@/lib/modules-api";

const CATS: Record<string, { ar: string; color: string }> = {
  all:        { ar: "الكل",            color: "#6B7280" },
  attendance: { ar: "الحضور والغياب", color: "#2563EB" },
  academic:   { ar: "أكاديمي",         color: "#7C3AED" },
  behavior:   { ar: "السلوك",          color: "#B45309" },
  staff:      { ar: "الكادر",          color: "#059669" },
  general:    { ar: "عام",             color: "#6B7280" },
};

function normReport(raw: any): any {
  return {
    id:        String(raw.id ?? Math.random()),
    ico:       raw.ico ?? raw.icon ?? "📊",
    cat:       raw.cat ?? raw.category ?? "general",
    ar:        raw.ar ?? raw.name_ar ?? raw.title ?? raw.name ?? "—",
    desc:      raw.desc ?? raw.description ?? "",
    formats:   Array.isArray(raw.formats) ? raw.formats : ["PDF"],
    auto:      Boolean(raw.auto ?? raw.is_auto),
    scheduled: raw.scheduled ?? raw.schedule ?? null,
    lastRun:   raw.last_run ?? raw.lastRun ?? null,
    nextRun:   raw.next_run ?? raw.nextRun ?? null,
    pages:     raw.pages ?? 0,
    size:      raw.size ?? "—",
    downloads: raw.downloads ?? raw.download_count ?? 0,
    filters:   Array.isArray(raw.filters) ? raw.filters : [],
    preview:   Array.isArray(raw.preview) ? raw.preview : [],
  };
}

export default function ReportsPage() {
  useUi();
  const [reports, setReports]       = useState<any[]>([]);
  const [history, setHistory]       = useState<any[]>([]);
  const [scheduled, setScheduled]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");

  /* Drawer */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab]   = useState<"preview" | "config" | "history">("preview");
  const [genBusy, setGenBusy]       = useState(false);

  /* Date range filter for generate */
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportsApi.templates({}),
      reportsApi.history({}),
    ]).then(([t, h]: any[]) => {
      const tArr = t.data ?? t ?? [];
      const hArr = h.data ?? h ?? [];
      setReports((Array.isArray(tArr) ? tArr : []).map(normReport));
      setHistory(Array.isArray(hArr) ? hArr : []);
      /* TODO: fetch scheduled list when endpoint is wired */
      setScheduled([]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    let list = reports.slice();
    if (filter !== "all") list = list.filter(r => r.cat === filter);
    if (search) list = list.filter(r => r.ar.includes(search));
    return list;
  }, [reports, filter, search]);

  const stats = useMemo(() => ({
    total:     reports.length,
    autoCnt:   reports.filter(r => r.auto).length,
    scheduled: scheduled.filter(s => s.active).length,
    dl:        reports.reduce((a, r) => a + r.downloads, 0),
  }), [reports, scheduled]);

  const selected = selectedId ? reports.find(r => r.id === selectedId) ?? null : null;

  async function generate(id: string, format: string) {
    setGenBusy(true);
    try {
      const r: any = await reportsApi.generate({ template_id: Number(id), format, from: dateFrom || undefined, to: dateTo || undefined });
      const created = r.data ?? r;
      setHistory(h => [{ id: created.id, template_id: id, name: reports.find(x => x.id === id)?.ar, format, status: "pending", size: "—", created_at: new Date().toISOString() }, ...h]);
      alert(`✅ جارى إنشاء التقرير بصيغة ${format}`);
      /* Increment downloads locally */
      setReports(p => p.map(r => r.id === id ? { ...r, downloads: r.downloads + 1 } : r));
    } catch { alert("تعذّر الإنشاء"); }
    finally { setGenBusy(false); }
  }

  async function downloadRow(historyId: string | number) {
    try {
      const r: any = await reportsApi.download(historyId);
      const url = r.data?.download_url ?? r.download_url;
      if (url) window.open(url, "_blank");
      else alert("التقرير لم يُجهَّز بعد");
    } catch { alert("تعذّر التحميل"); }
  }

  function openDrawer(id: string) {
    setSelectedId(id);
    setDrawerTab("preview");
    setDrawerOpen(true);
  }

  const catColor = (k: string) => CATS[k]?.color ?? CATS.general.color;

  return (
    <DashboardLayout title="📊 مركز التقارير" subtitle={`${stats.total} تقرير · ${stats.dl} تحميل · ${stats.autoCnt} تلقائى`}>
      <style>{`
        .rpt-card { background: var(--bg1); border: 1.5px solid var(--brd); border-radius: 12px; overflow: hidden; cursor: pointer; box-shadow: var(--card-sh); transition: all .14s; display: flex; flex-direction: column; }
        .rpt-card:hover { border-color: #E8702A; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.08); }
        .rpt-card.sel { border-color: #E8702A; }
        .rpt-tag { font-size: 10px; padding: 2px 8px; border-radius: 5px; font-weight: 700; border: 1px solid; }
      `}</style>

      {/* ══ DETAIL DRAWER ══ */}
      {drawerOpen && selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,.45)" }} onClick={() => setDrawerOpen(false)} />
          <div style={{ width: 480, background: "var(--bg1)", boxShadow: "-4px 0 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--brd)", background: catColor(selected.cat) + "0D" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 13, background: catColor(selected.cat) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{selected.ico}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 5 }}>{selected.ar}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <span className="rpt-tag" style={{ background: catColor(selected.cat) + "18", color: catColor(selected.cat), borderColor: catColor(selected.cat) + "35" }}>{CATS[selected.cat]?.ar ?? "عام"}</span>
                      {selected.auto && (
                        <span className="rpt-tag" style={{ background: "#F5F3FF", color: "#7C3AED", borderColor: "#DDD6FE" }}>🤖 تلقائى {selected.scheduled ? `· ${selected.scheduled}` : ""}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(0,0,0,.08)", cursor: "pointer", fontSize: 15 }}>×</button>
                </div>
                {selected.preview.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 14 }}>
                    {selected.preview.map((p: any, i: number) => (
                      <div key={i} style={{ padding: 7, background: "var(--bg1)", borderRadius: 9, border: "1px solid var(--brd)", textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: p.c }}>{p.v}</div>
                        <div style={{ fontSize: 8, color: "var(--tx2)", marginTop: 1 }}>{p.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", borderBottom: "1px solid var(--brd)" }}>
                {[{ id: "preview", ar: "معاينة" }, { id: "config", ar: "الإعدادات" }, { id: "history", ar: "السجل" }].map((t: any) => (
                  <button key={t.id} onClick={() => setDrawerTab(t.id)} style={{ padding: "9px 14px", border: "none", background: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: drawerTab === t.id ? "#E8702A" : "var(--tx2)", borderBottom: `2px solid ${drawerTab === t.id ? "#E8702A" : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap" }}>{t.ar}</button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {drawerTab === "preview" && (
                <div style={{ padding: "16px 18px" }}>
                  {selected.desc && <p style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.6, padding: "11px 13px", background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--brd)", margin: "0 0 14px" }}>{selected.desc}</p>}
                  {[
                    { ar: "الصيغ المتاحة", v: <>{selected.formats.map((f: string) => <span key={f} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: f === "PDF" ? "#FEF2F2" : f === "Excel" ? "#ECFDF5" : "#EFF6FF", color: f === "PDF" ? "#DC2626" : f === "Excel" ? "#059669" : "#2563EB", fontWeight: 700, marginLeft: 4 }}>{f}</span>)}</> },
                    { ar: "الصفحات",       v: <b>{selected.pages}</b> },
                    { ar: "الحجم",         v: <b>{selected.size}</b> },
                    { ar: "آخر تشغيل",    v: <b>{selected.lastRun || "—"}</b> },
                    { ar: "التالى",        v: <b style={{ color: selected.nextRun ? "#E8702A" : "var(--tx2)" }}>{selected.nextRun || "غير مجدول"}</b> },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg3)", borderRadius: 8, fontSize: 11.5, border: "1px solid var(--brd)", marginBottom: 5 }}>
                      <span style={{ color: "var(--tx2)" }}>{row.ar}</span>
                      <div>{row.v}</div>
                    </div>
                  ))}
                  {selected.filters.length > 0 && (
                    <>
                      <div style={{ margin: "14px 0 8px", fontSize: 11, fontWeight: 700, color: "var(--tx2)" }}>🔍 خيارات التصفية</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                        {selected.filters.map((f: string) => (
                          <span key={f} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "var(--bg3)", border: "1px solid var(--brd)" }}>{f}</span>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ padding: 14, background: "var(--bg3)", borderRadius: 12, border: "1px solid var(--brd)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>⬇️ إنشاء التقرير الآن</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, color: "var(--tx2)", display: "block", marginBottom: 4 }}>من تاريخ</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "var(--fm)", fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "var(--tx2)", display: "block", marginBottom: 4 }}>إلى تاريخ</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "var(--fm)", fontSize: 11 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {selected.formats.map((f: string) => (
                        <button key={f} onClick={() => generate(selected.id, f)} disabled={genBusy}
                          className={`btn ${f === "PDF" ? "btn-p" : "btn-g"} btn-sm`}
                          style={{ flex: 1, justifyContent: "center", fontSize: 11, opacity: genBusy ? 0.6 : 1 }}>⬇️ {f}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "config" && (
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 7 }}>🕐 الجدولة التلقائية</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: "var(--tx2)", display: "block", marginBottom: 4 }}>التكرار</label>
                        <select style={{ width: "100%", padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontSize: 11 }}>
                          <option>يومى</option>
                          <option>أسبوعى</option>
                          <option>شهرى</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: "var(--tx2)", display: "block", marginBottom: 4 }}>الإرسال إلى</label>
                        <select style={{ width: "100%", padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontSize: 11 }}>
                          <option>بريد إلكترونى</option>
                          <option>داخل النظام</option>
                          <option>الاثنين</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>📧 البريد الإلكترونى</label>
                    <input placeholder="example@school.edu.sa" style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 11 }} />
                  </div>
                  {[{ ar: "تفعيل الجدولة التلقائية", on: selected.auto }, { ar: "إرسال نسخة للمدير", on: true }, { ar: "حفظ نسخة فى النظام", on: true }].map((opt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", border: "1.5px solid var(--brd)", borderRadius: 9 }}>
                      <span style={{ fontSize: 12 }}>{opt.ar}</span>
                      <div style={{ width: 40, height: 22, borderRadius: 11, background: opt.on ? "#E8702A" : "var(--brd2)", position: "relative", cursor: "pointer", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: 3, right: opt.on ? 3 : "auto", left: opt.on ? "auto" : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-p btn-sm" style={{ justifyContent: "center" }}>💾 حفظ الإعدادات</button>
                </div>
              )}

              {drawerTab === "history" && (
                <div>
                  {history.filter((h: any) => String(h.template_id) === selected.id).length === 0 ? (
                    <div style={{ padding: 50, textAlign: "center", color: "var(--tx2)" }}>
                      <div style={{ fontSize: 40, opacity: 0.3 }}>🕐</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 10 }}>لا سجلات إنشاء سابقة</div>
                    </div>
                  ) : history.filter((h: any) => String(h.template_id) === selected.id).map((h: any) => (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 16px", borderBottom: "1px solid var(--brd)" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: h.format === "PDF" ? "#FEF2F2" : "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{h.format === "PDF" ? "📄" : "📊"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{(h.created_at ?? "").toString().slice(0, 16).replace("T", " ")}</div>
                        <div style={{ fontSize: 10, color: "var(--tx2)" }}>{h.format} · {h.size ?? "—"} · {h.status ?? "—"}</div>
                      </div>
                      <button onClick={() => downloadRow(h.id)} className="btn btn-g btn-sm" style={{ fontSize: 10, padding: "4px 10px" }}>⬇️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--brd)", display: "flex", gap: 7, flexShrink: 0 }}>
              <button onClick={() => generate(selected.id, "PDF")} disabled={genBusy} className="btn btn-p btn-sm" style={{ flex: 1, justifyContent: "center", opacity: genBusy ? 0.6 : 1 }}>⬇️ تحميل PDF</button>
              {selected.formats.includes("Excel") && (
                <button onClick={() => generate(selected.id, "Excel")} disabled={genBusy} className="btn btn-g btn-sm" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>📊 Excel</button>
              )}
              <button onClick={() => setDrawerOpen(false)} className="btn btn-g" style={{ padding: "0 14px" }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>📊 مركز التقارير</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{reports.length} تقرير · {stats.dl} تحميل · {stats.autoCnt} تلقائى</div>
        </div>
        <button className="btn btn-p">+ تقرير مخصص</button>
      </div>

      {/* ══ STATS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: stats.total,     ar: "تقارير متاحة",   c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
          { v: stats.autoCnt,   ar: "تلقائية",         c: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
          { v: stats.scheduled, ar: "مجدولة نشطة",    c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
          { v: stats.dl,        ar: "إجمالى التحميلات", c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.brd}`, borderRadius: 11, padding: "10px 12px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.ar}</div>
          </div>
        ))}
      </div>

      {/* ══ FILTERS ══ */}
      <div style={{ display: "flex", gap: 7, marginBottom: 13, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <svg style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث فى التقارير..." style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", paddingRight: 30, border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.entries(CATS).map(([id, meta]) => (
            <button key={id} onClick={() => setFilter(id)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${filter === id ? meta.color : "var(--brd)"}`, background: filter === id ? meta.color : "var(--bg1)", color: filter === id ? "#fff" : "var(--tx2)", cursor: "pointer", fontFamily: "inherit" }}>{meta.ar}</button>
          ))}
        </div>
      </div>

      {/* ══ MAIN LAYOUT: grid + sidebar ══ */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--tx2)" }}>جارى التحميل...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12, alignItems: "flex-start" }}>
          {/* Reports grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
            {shown.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", padding: 60, textAlign: "center", background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12 }}>
                <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 10 }}>📊</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx2)" }}>لا توجد تقارير فى هذا التصنيف</div>
              </div>
            ) : shown.map(r => {
              const cm = CATS[r.cat] ?? CATS.general;
              return (
                <div key={r.id} className={`rpt-card ${selectedId === r.id && drawerOpen ? "sel" : ""}`} onClick={() => openDrawer(r.id)}>
                  <div style={{ height: 3, background: cm.color }} />
                  <div style={{ padding: "14px 15px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: cm.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{r.ico}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 5, lineHeight: 1.3 }}>{r.ar}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <span className="rpt-tag" style={{ background: cm.color + "18", color: cm.color, borderColor: cm.color + "35" }}>{cm.ar}</span>
                          {r.auto && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", fontWeight: 700 }}>🤖 تلقائى</span>}
                        </div>
                      </div>
                    </div>
                    {r.desc && <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.5, marginBottom: 10, flex: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.desc}</div>}
                    {r.preview.length >= 2 && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
                        {r.preview.slice(0, 2).map((p: any, i: number) => (
                          <div key={i} style={{ padding: "6px 8px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--brd)" }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: p.c }}>{p.v}</div>
                            <div style={{ fontSize: 9, color: "var(--tx2)" }}>{p.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {r.formats.map((f: string) => (
                          <span key={f} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: f === "PDF" ? "#FEF2F2" : f === "Excel" ? "#ECFDF5" : "#EFF6FF", color: f === "PDF" ? "#DC2626" : f === "Excel" ? "#059669" : "#2563EB", fontWeight: 700, border: `1px solid ${f === "PDF" ? "#FCA5A5" : f === "Excel" ? "#A7F3D0" : "#BFDBFE"}` }}>{f}</span>
                        ))}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--tx2)" }}>⬇️ {r.downloads}</span>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={e => { e.stopPropagation(); generate(r.id, "PDF"); }} disabled={genBusy} className="btn btn-p btn-sm" style={{ flex: 1, justifyContent: "center", fontSize: 11 }}>⬇️ PDF</button>
                      {r.formats.includes("Excel") && (
                        <button onClick={e => { e.stopPropagation(); generate(r.id, "Excel"); }} disabled={genBusy} className="btn btn-sm" style={{ fontSize: 10, padding: "5px 9px", background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>XLS</button>
                      )}
                      <button onClick={e => { e.stopPropagation(); openDrawer(r.id); }} className="btn btn-g btn-sm" style={{ fontSize: 10, padding: "5px 9px" }}>⚙️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Scheduled */}
            <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--tx2)" }}>⏰ المجدولة</div>
                <span style={{ fontSize: 10, color: "var(--tx2)" }}>{scheduled.length}</span>
              </div>
              {scheduled.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)", fontSize: 11 }}>لا تقارير مجدولة</div>
              ) : scheduled.map((s: any) => (
                <div key={s.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.active ? "#22C55E" : "#94A3B8", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                    <div style={{ fontSize: 9, color: "var(--tx2)" }}>{s.freq} · {s.next}</div>
                  </div>
                  <div style={{ width: 32, height: 18, borderRadius: 9, background: s.active ? "#22C55E" : "var(--brd2)", position: "relative", cursor: "pointer", flexShrink: 0 }} onClick={() => setScheduled(p => p.map(x => x.id === s.id ? { ...x, active: !x.active } : x))}>
                    <div style={{ position: "absolute", top: 2, right: s.active ? 2 : "auto", left: s.active ? "auto" : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent history */}
            <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", fontSize: 11, fontWeight: 800, color: "var(--tx2)" }}>🕐 آخر المُنشأة</div>
              {history.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)", fontSize: 11 }}>لم تُنشأ تقارير بعد</div>
              ) : history.slice(0, 5).map((h: any) => (
                <div key={h.id} style={{ padding: "9px 14px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: h.format === "PDF" ? "#FEF2F2" : "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{h.format === "PDF" ? "📄" : "📊"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name ?? reports.find(r => String(r.id) === String(h.template_id))?.ar ?? "تقرير"}</div>
                    <div style={{ fontSize: 9, color: "var(--tx2)" }}>{(h.created_at ?? "").toString().slice(0, 10)} · {h.size ?? "—"}</div>
                  </div>
                  <button onClick={() => downloadRow(h.id)} className="btn btn-g btn-sm" style={{ fontSize: 10, padding: "3px 8px" }}>⬇️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
