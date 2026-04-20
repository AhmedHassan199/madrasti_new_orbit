"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { noorApi, integrationsApi } from "@/lib/modules-api";

const STATUS_LABELS: Record<string, string> = {
  online:  "متصل",
  partial: "جزئي",
  offline: "منقطع",
  pending: "غير مُعدّ",
};

const STATUS_COLORS: Record<string, string> = {
  online: "#22C55E",
  partial: "#F59E0B",
  offline: "#EF4444",
  pending: "#94A3B8",
};

export default function NoorPage() {
  const { lang } = useUi();
  const [systems, setSystems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      integrationsApi.list({}).catch(() => null),
      noorApi.logs?.({}).catch(() => null),
    ])
      .then(([iRes, lRes]: any[]) => {
        const sArr = iRes ? (Array.isArray(iRes) ? iRes : (iRes.data ?? iRes.systems ?? [])) : [];
        const lArr = lRes ? (Array.isArray(lRes) ? lRes : (lRes.data ?? [])) : [];
        setSystems(Array.isArray(sArr) ? sArr : []);
        setLogs(Array.isArray(lArr) ? lArr : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [syncBusy, setSyncBusy] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);

  /* Detail tabs + mappings + pending */
  const [detailTab, setDetailTab] = useState<"overview" | "mappings" | "pending" | "settings">("overview");
  const [mappings, setMappings] = useState<any[]>([]);
  const [pending, setPending]   = useState<any[]>([]);
  const [newMap, setNewMap]     = useState<{ source: string; target: string; direction: "push" | "pull" | "both" }>({ source: "", target: "", direction: "both" });

  async function loadMappings(id: number | string) {
    try {
      const r: any = await fetch(`/api/smos/integrations/${id}`, {
        headers: { "Accept": "application/json", "Authorization": `Bearer ${localStorage.getItem("smos_token") ?? ""}` },
      }).then(r => r.json());
      const m = r.data?.field_mappings ?? r.field_mappings ?? [];
      setMappings(Array.isArray(m) ? m : []);
    } catch { setMappings([]); }
  }
  async function loadPending(id: number | string) {
    try {
      const r: any = await integrationsApi.pending(id);
      const arr = r.data ?? r ?? [];
      setPending(Array.isArray(arr) ? arr : []);
    } catch { setPending([]); }
  }
  async function saveMappings(id: number | string) {
    try {
      await integrationsApi.saveMappings(id, mappings);
      alert("✅ تم حفظ التعيينات");
    } catch { alert("تعذّر الحفظ"); }
  }
  function addMapping() {
    if (!newMap.source || !newMap.target) return;
    setMappings(m => [...m, { ...newMap }]);
    setNewMap({ source: "", target: "", direction: "both" });
  }
  function removeMapping(i: number) {
    setMappings(m => m.filter((_, idx) => idx !== i));
  }
  async function resolvePending(sysId: number | string, pId: number | string, action: string) {
    try {
      await integrationsApi.resolvePending(sysId, pId, action);
      await loadPending(sysId);
    } catch { alert("تعذّر الحفظ"); }
  }

  useEffect(() => {
    if (!selectedId) return;
    setDetailTab("overview");
    loadMappings(selectedId);
    loadPending(selectedId);
  }, [selectedId]);

  async function runSync(id: number | string | null) {
    setSyncBusy(true);
    try {
      if (id != null) await integrationsApi.sync(id);
      else await noorApi.sync({});
      alert("تم تشغيل المزامنة");
      const lr: any = await noorApi.logs({});
      const arr = lr.data ?? lr ?? [];
      setLogs(Array.isArray(arr) ? arr : []);
    } catch { alert("تعذّر تشغيل المزامنة"); }
    finally { setSyncBusy(false); }
  }

  async function testConnection(id: number | string) {
    try {
      const r: any = await integrationsApi.test(id);
      alert(`الاتصال: ${r.data?.ok ? "ناجح" : "فشل"} — زمن الاستجابة ${r.data?.latency ?? "—"} ms`);
    } catch { alert("تعذّر الاختبار"); }
  }

  async function fetchWebhook(id: number | string) {
    try {
      const r: any = await integrationsApi.webhook(id);
      setWebhookInfo(r.data ?? r);
    } catch { alert("تعذّر الحصول على Webhook"); }
  }

  const counts = useMemo(() => ({
    online:  systems.filter((s: any) => s.status === "online").length,
    partial: systems.filter((s: any) => s.status === "partial").length,
    offline: systems.filter((s: any) => s.status === "offline").length,
    pending: systems.filter((s: any) => s.status === "pending").length,
  }), [systems]);

  const selected = selectedId ? systems.find((s: any) => String(s.id) === selectedId) : null;

  return (
    <DashboardLayout
      title={lang === "ar" ? "مركز التكامل" : "Integration Center"}
      subtitle={lang === "ar" ? "ربط SMOS بالمنظومة التعليمية والخدمات الخارجية" : "Connect SMOS with educational platforms"}
    >
      {/* Stats summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { l_ar: "متصل",   l_en: "Online",   v: counts.online,  c: "#22C55E", bg: "#ECFDF5" },
          { l_ar: "جزئي",   l_en: "Partial",  v: counts.partial, c: "#F59E0B", bg: "#FFFBEB" },
          { l_ar: "منقطع",  l_en: "Offline",  v: counts.offline, c: "#EF4444", bg: "#FEF2F2" },
          { l_ar: "غير مُعدّ", l_en: "Pending", v: counts.pending, c: "#94A3B8", bg: "var(--bg3)" },
        ].map((card, i) => (
          <div key={i} style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, color: card.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900 }}>●</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--fm)", color: card.c }}>{card.v}</div>
              <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{lang === "ar" ? card.l_ar : card.l_en}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Systems list */}
      <PageCard title={lang === "ar" ? "الأنظمة المتكاملة" : "Integrated Systems"}>
        {loading ? (
          <p style={{ color: "var(--tx2)", textAlign: "center", padding: 20 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
        ) : !systems.length ? (
          <p style={{ color: "var(--tx2)", textAlign: "center", padding: 20 }}>{lang === "ar" ? "لا توجد تكاملات مُعدّة" : "No integrations configured"}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 12 }}>
            {systems.map((s: any) => {
              const statusKey = s.status ?? "pending";
              const color = STATUS_COLORS[statusKey] ?? "#94A3B8";
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(String(s.id))}
                  style={{
                    background: "var(--bg1)",
                    border: "1.5px solid var(--brd)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "all .2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {s.logo ?? s.icon ?? "🔗"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{s.ar ?? s.name ?? s.system_name ?? "—"}</div>
                      <div style={{ fontSize: 10, color: "var(--tx2)" }}>{s.category ?? s.type ?? ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 5, background: `${color}18`, color, fontWeight: 700 }}>
                      ● {STATUS_LABELS[statusKey] ?? statusKey}
                    </span>
                    {s.last_sync_at || s.lastSync ? (
                      <span style={{ color: "var(--tx2)", fontFamily: "var(--fm)" }}>
                        {s.last_sync_at ?? s.lastSync}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageCard>

      {/* Selected system detail */}
      {selected && (
        <PageCard title={selected.ar ?? selected.name ?? "—"}>
          {/* Detail tabs */}
          <div style={{ display: "flex", gap: 2, borderBottom: "1.5px solid var(--brd)", marginBottom: 14 }}>
            {([
              { id: "overview", ar: "نظرة عامة", ico: "📊" },
              { id: "mappings", ar: "تعيين الحقول", ico: "🔗", badge: mappings.length },
              { id: "pending",  ar: "المعلقة",    ico: "⏳", badge: pending.length },
              { id: "settings", ar: "إعدادات",    ico: "⚙️" },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setDetailTab(t.id as any)}
                style={{ padding: "8px 14px", border: "none", background: "none", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: detailTab === t.id ? "#E8702A" : "var(--tx2)", borderBottom: `2px solid ${detailTab === t.id ? "#E8702A" : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                {t.ico} {t.ar}
                {("badge" in t) && (t as any).badge > 0 && (
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: detailTab === t.id ? "#E8702A" : "var(--bg3)", color: detailTab === t.id ? "#fff" : "var(--tx2)" }}>{(t as any).badge}</span>
                )}
              </button>
            ))}
          </div>

          {detailTab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: "10px 14px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 3 }}>{lang === "ar" ? "الحالة" : "Status"}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{STATUS_LABELS[selected.status ?? "pending"]}</div>
                </div>
                <div style={{ padding: "10px 14px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 3 }}>{lang === "ar" ? "آخر مزامنة" : "Last Sync"}</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--fm)" }}>{selected.last_sync_at ?? selected.lastSync ?? "—"}</div>
                </div>
                <div style={{ padding: "10px 14px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 3 }}>{lang === "ar" ? "السجلات" : "Records"}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--fm)" }}>{selected.records ?? selected.records_count ?? 0}</div>
                </div>
                <div style={{ padding: "10px 14px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 3 }}>{lang === "ar" ? "أخطاء" : "Errors"}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--fm)", color: (selected.error_count ?? 0) > 0 ? "#DC2626" : "#059669" }}>
                    {selected.error_count ?? selected.errorCount ?? 0}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => runSync(selected.id)} disabled={syncBusy} className="btn btn-p btn-sm" type="button">
                  🔄 {syncBusy ? "جاري..." : "مزامنة الآن"}
                </button>
                <button onClick={() => testConnection(selected.id)} className="btn btn-g btn-sm" type="button">🔌 اختبار الاتصال</button>
                <button onClick={() => fetchWebhook(selected.id)} className="btn btn-g btn-sm" type="button">🔗 Webhook</button>
                <button onClick={() => setSelectedId(null)} className="btn btn-g btn-sm" type="button">{lang === "ar" ? "إغلاق" : "Close"}</button>
              </div>
              {webhookInfo && (
                <div style={{ marginTop: 12, padding: 12, background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--brd)" }}>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 4 }}>Webhook URL</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, marginBottom: 8, direction: "ltr" }}>{webhookInfo.url}</div>
                  <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 4 }}>Secret</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, direction: "ltr" }}>{webhookInfo.secret}</div>
                </div>
              )}
            </>
          )}

          {detailTab === "mappings" && (
            <div>
              <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 10 }}>اربط حقول نور بالحقول المحلية فى SMOS. اختر الاتجاه: ← استيراد فقط، → تصدير فقط، ↔ كلاهما.</div>
              <div style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 60px", gap: 8, padding: "8px 12px", background: "var(--bg1)", borderBottom: "1px solid var(--brd)", fontSize: 10, fontWeight: 700, color: "var(--tx2)" }}>
                  <div>حقل نور (Source)</div>
                  <div style={{ textAlign: "center" }}>الاتجاه</div>
                  <div>حقل SMOS (Target)</div>
                  <div></div>
                </div>
                {mappings.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>لا تعيينات — أضف من الأسفل</div>}
                {mappings.map((m: any, i: number) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 60px", gap: 8, padding: "8px 12px", borderBottom: i < mappings.length - 1 ? "1px solid var(--brd)" : "none", alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontFamily: "monospace" }}>{m.source ?? m.remote_field ?? "—"}</div>
                    <div style={{ textAlign: "center", fontSize: 14 }}>{m.direction === "pull" ? "←" : m.direction === "push" ? "→" : "↔"}</div>
                    <div style={{ fontSize: 12, fontFamily: "monospace" }}>{m.target ?? m.local_field ?? "—"}</div>
                    <button onClick={() => removeMapping(i)} style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontSize: 10 }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr auto", gap: 8, alignItems: "end", marginBottom: 10 }}>
                <input value={newMap.source} onChange={e => setNewMap(p => ({ ...p, source: e.target.value }))} placeholder="noor_field" style={{ padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "monospace", fontSize: 12 }} />
                <select value={newMap.direction} onChange={e => setNewMap(p => ({ ...p, direction: e.target.value as any }))} style={{ padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12 }}>
                  <option value="both">↔</option>
                  <option value="pull">←</option>
                  <option value="push">→</option>
                </select>
                <input value={newMap.target} onChange={e => setNewMap(p => ({ ...p, target: e.target.value }))} placeholder="smos_field" style={{ padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "monospace", fontSize: 12 }} />
                <button onClick={addMapping} className="btn btn-p btn-sm">+ إضافة</button>
              </div>
              <button onClick={() => saveMappings(selected.id)} className="btn btn-p" style={{ padding: "8px 16px" }}>💾 حفظ التعيينات</button>
            </div>
          )}

          {detailTab === "pending" && (
            <div>
              <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 10 }}>السجلات المعلقة بانتظار حل التعارض أو الموافقة على المزامنة.</div>
              {pending.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>✓ لا توجد سجلات معلقة</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {pending.map((p: any) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 9 }}>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: p.direction === "push" ? "#EFF6FF" : "#F5F3FF", color: p.direction === "push" ? "#2563EB" : "#7C3AED", fontWeight: 700 }}>
                        {p.direction === "push" ? "→ تصدير" : "← استيراد"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{p.record_type} #{p.local_id ?? p.remote_id}</div>
                        {p.conflict_type && <div style={{ fontSize: 10, color: "#DC2626", marginTop: 2 }}>⚠️ {p.conflict_type}</div>}
                      </div>
                      <button onClick={() => resolvePending(selected.id, p.id, "accept")} style={{ padding: "4px 9px", borderRadius: 6, border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#059669", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>✓ قبول</button>
                      <button onClick={() => resolvePending(selected.id, p.id, "reject")} style={{ padding: "4px 9px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>✕ رفض</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {detailTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: 12, background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 9 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 6 }}>النوع</div>
                <div style={{ fontSize: 13, fontFamily: "monospace" }}>{selected.type ?? selected.provider ?? "—"}</div>
              </div>
              <div style={{ padding: 12, background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 9 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 6 }}>الحالة</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: (selected.is_active ?? selected.enabled) ? "#059669" : "#DC2626" }}>
                  {(selected.is_active ?? selected.enabled) ? "● متصل ومُفعَّل" : "● غير مُفعَّل"}
                </div>
              </div>
              <button onClick={() => alert("فتح نموذج تعديل الإعدادات")} className="btn btn-g btn-sm" style={{ alignSelf: "flex-start" }}>✏️ تعديل الإعدادات</button>
            </div>
          )}
        </PageCard>
      )}

      {/* Sync log */}
      <PageCard title={lang === "ar" ? "سجل المزامنة" : "Sync Log"}>
        {!logs.length ? (
          <p style={{ color: "var(--tx2)", textAlign: "center", padding: 20 }}>
            {lang === "ar" ? "لا توجد سجلات" : "No logs"}
          </p>
        ) : (
          <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg3)" }}>
                {[lang === "ar" ? "الوقت" : "Time", lang === "ar" ? "النظام" : "System", lang === "ar" ? "الرسالة" : "Message", lang === "ar" ? "الحالة" : "Status"].map((h, i) => (
                  <th key={i} style={{ padding: "8px 12px", textAlign: lang === "ar" ? "right" : "left", color: "var(--tx2)", fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any, i: number) => (
                <tr key={i} style={{ borderTop: "1px solid var(--brd)" }}>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--fm)", color: "var(--tx2)" }}>
                    {log.time ?? log.created_at ?? "—"}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{log.system ?? log.system_name ?? "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{log.msg ?? log.message ?? log.description ?? "—"}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                      background: log.ok || log.success ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)",
                      color: log.ok || log.success ? "#16A34A" : "#DC2626",
                    }}>
                      {log.ok || log.success ? (lang === "ar" ? "✓ نجاح" : "✓ OK") : (lang === "ar" ? "✗ فشل" : "✗ Failed")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PageCard>
    </DashboardLayout>
  );
}
