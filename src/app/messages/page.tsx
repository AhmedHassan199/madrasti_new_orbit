"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { messagesApi } from "@/lib/modules-api";
import { employeesApi } from "@/lib/employees-api";

/* ════════════════════════════════════════════════
   Messages Module — matches corbit-school-orbit.html
   SMS-only (WhatsApp UI hidden until ready)
════════════════════════════════════════════════ */

const CH_META: Record<string, { ico: string; ar: string; bg: string; c: string; brd: string }> = {
  sms:      { ico: "📱", ar: "SMS",      bg: "#EFF6FF", c: "#2563EB", brd: "#BFDBFE" },
  whatsapp: { ico: "💬", ar: "WhatsApp", bg: "#F0FDF4", c: "#059669", brd: "#A7F3D0" },
};

const ST_META: Record<string, { ar: string; c: string; bg: string; brd: string }> = {
  ok:   { ar: "✓ وصل",   c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  part: { ar: "⚡ جزئي", c: "#B45309", bg: "#FFFBEB", brd: "#FCD34D" },
  fail: { ar: "✗ فشل",   c: "#DC2626", bg: "#FEF2F2", brd: "#FCA5A5" },
};

const SMS_PROVIDERS = [
  { id: "orbit",    ar: "Orbit SMS",  logo: "🟠" },
  { id: "mobily",   ar: "موبايلي",    logo: "📡" },
  { id: "stc",      ar: "STC",        logo: "🔵" },
  { id: "unifonic", ar: "يونيفونيك",  logo: "📨" },
  { id: "msegat",   ar: "مسجات",      logo: "💬" },
  { id: "custom",   ar: "API مخصص",   logo: "⚙️" },
];

const TEMPLATES = [
  { id: "t_abs",    ico: "📋", ar: "إشعار غياب",      text: "السلام عليكم ولي أمر الطالب {{الاسم}}،\nنُعلمكم بغياب ابنكم اليوم {{التاريخ}} عن المدرسة." },
  { id: "t_exam",   ico: "📝", ar: "تذكير اختبار",    text: "🔔 تذكير لأولياء أمور {{الصف}}:\nاختبار {{المادة}} يوم {{اليوم}} {{التاريخ}}." },
  { id: "t_summon", ico: "📞", ar: "استدعاء ولي أمر", text: "نُعلمكم بضرورة حضور ولي أمر الطالب {{الاسم}} إلى المدرسة يوم {{اليوم}} الساعة {{الوقت}}." },
  { id: "t_meet",   ico: "🤝", ar: "دعوة اجتماع",     text: "تدعوكم إدارة المدرسة لحضور اجتماع أولياء الأمور\nيوم {{اليوم}} {{التاريخ}} الساعة {{الوقت}}." },
  { id: "t_report", ico: "📊", ar: "تقرير أسبوعي",    text: "السلام عليكم ولي أمر {{الاسم}}،\nتقرير الأسبوع: الحضور {{نسبة_الحضور}}%." },
  { id: "t_gen",    ico: "💬", ar: "رسالة حرة",       text: "" },
];

const TRIGGER_META: Record<string, { ico: string; ar: string }> = {
  absence:   { ico: "📋", ar: "عند تسجيل غياب" },
  exam:      { ico: "📝", ar: "قبل الاختبار" },
  weekly:    { ico: "📅", ar: "كل أسبوع" },
  summon:    { ico: "📞", ar: "عند استدعاء" },
  grades:    { ico: "📉", ar: "عند تراجع الدرجات" },
  credit:    { ico: "💳", ar: "عند انخفاض الرصيد" },
  newparent: { ico: "👋", ar: "عند إضافة ولي أمر جديد" },
};

const WEEK_DATA = [
  { day: "الأحد",    sent: 0 },
  { day: "الاثنين",  sent: 0 },
  { day: "الثلاثاء", sent: 0 },
  { day: "الأربعاء", sent: 0 },
  { day: "الخميس",   sent: 0 },
];

export default function MessagesPage() {
  const { lang } = useUi();

  /* ═══ TABS + STATE ═══ */
  const [tab, setTab]             = useState<"history" | "scheduled" | "drafts" | "auto" | "archive" | "reports">("history");
  const [balance, setBalance]     = useState<number | null>(null);
  const [history, setHistory]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [groups, setGroups]       = useState<any[]>([]);
  const [autoRules, setAutoRules] = useState<any[]>([]);
  const [scheduledList, setScheduled] = useState<any[]>([]);
  const [draftsList, setDrafts]   = useState<any[]>([]);
  const [selectedMsg, setSelMsg]  = useState<any | null>(null);
  const [archiveSearch, setArchiveSearch] = useState("");

  /* ═══ COMPOSE DRAWER ═══ */
  const [composeOpen, setComposeOpen] = useState(false);
  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [selGroups, setSelGroups]     = useState<number[]>([]);
  const [rawPhones, setRawPhones]     = useState("");
  const [selTemplate, setSelTemplate] = useState<string | null>(null);
  const [msgText, setMsgText]         = useState("");
  const [resolvedCount, setResolved]  = useState<number | null>(null);
  const [schedEnabled, setSchedEnabled] = useState(false);
  const [schedDate, setSchedDate]     = useState("");
  const [schedTime, setSchedTime]     = useState("");
  const [sending, setSending]         = useState(false);
  const [toast, setToast]             = useState<{ ok: boolean; msg: string } | null>(null);

  /* ═══ LOAD ═══ */
  async function load() {
    setLoading(true);
    try {
      const [b, h, sg, tg, ar, sc, dr]: any = await Promise.all([
        messagesApi.balance().catch(() => ({ balance: 0 })),
        messagesApi.history({}).catch(() => ({ data: [] })),
        employeesApi.subGroupsAll({ group_type: "student" }).catch(() => ({ data: [] })),
        employeesApi.groups({ type: "teacher" }).catch(() => ({ data: [] })),
        messagesApi.autoRules({}).catch(() => ({ data: [] })),
        messagesApi.scheduled({}).catch(() => ({ data: [] })),
        messagesApi.drafts({}).catch(() => ({ data: [] })),
      ]);
      setBalance((b?.data?.balance ?? b?.balance) ?? 0);
      const histRaw = Array.isArray(h) ? h : (h?.data ?? []);
      setHistory(normalizeHistory(histRaw));

      // الفصول (sub-groups) للطلاب + مجموعات المعلمين الرئيسية
      const studentSubs = (Array.isArray(sg) ? sg : (sg?.data ?? [])).map((s: any) => ({
        id: s.id, name: s.name, employees_count: s.employees_count ?? 0, kind: "sub_group",
      }));
      const teacherGroups = (Array.isArray(tg) ? tg : (tg?.data ?? [])).map((g: any) => ({
        id: g.id, name: "المعلمين", employees_count: g.employees_count ?? 0, kind: "group",
      }));
      setGroups([...studentSubs, ...teacherGroups]);
      const arRaw = Array.isArray(ar) ? ar : (ar?.data ?? []);
      setAutoRules(arRaw.map((a: any) => ({
        id: a.id, ar: a.trigger ? `رسالة ${TRIGGER_META[a.trigger]?.ar ?? a.trigger}` : (a.name ?? "قاعدة"),
        trigger: a.trigger ?? "absence",
        ch: a.channel ?? "sms",
        on: Boolean(a.enabled), cnt: a.count ?? 0, lastRun: a.last_run ?? "—",
      })));
      setScheduled(Array.isArray(sc) ? sc : (sc?.data ?? []));
      setDrafts(Array.isArray(dr) ? dr : (dr?.data ?? []));
    } catch { /* noop */ }
    finally { setLoading(false); }
  }

  function normalizeHistory(arr: any[]) {
    return arr.map((m: any) => {
      const sent = Number(m.recipients_sent ?? m.sent ?? 0);
      const fail = Number(m.recipients_failed ?? m.failed ?? 0);
      const cnt  = Number(m.recipients_total ?? m.cnt ?? sent + fail);
      const st   = String(m.status ?? "").toLowerCase();
      const status: "ok" | "part" | "fail" =
        st === "fail" || st === "failed" || fail > 0 && sent === 0 ? "fail" :
        fail > 0 ? "part" : "ok";
      return {
        id:       String(m.id ?? crypto.randomUUID()),
        title:    m.title ?? (m.message_body ? m.message_body.slice(0, 60) : "—"),
        body:     m.message_body ?? m.body ?? "",
        ch:       "sms", // force SMS-only for now
        cnt, sent, failed: fail,
        cost:     Number(m.cost ?? 0),
        date:     m.date ?? (m.created_at ? String(m.created_at).slice(0, 10) : ""),
        time:     m.time ?? (m.created_at ? String(m.created_at).slice(11, 16) : ""),
        status,
        auto:     Boolean(m.auto ?? m.type === "auto"),
        template: m.template ?? "",
      };
    });
  }

  useEffect(() => { load(); }, []);

  /* ═══ COMPUTED ═══ */
  const totalSent = useMemo(() => history.reduce((s, h) => s + h.sent, 0), [history]);
  const totalFail = useMemo(() => history.reduce((s, h) => s + h.failed, 0), [history]);
  const delivRate = totalSent + totalFail > 0 ? ((totalSent / (totalSent + totalFail)) * 100).toFixed(1) : "100.0";

  /* ═══ COMPOSE HELPERS ═══ */
  function resetCompose() {
    setStep(1); setSelGroups([]); setRawPhones(""); setSelTemplate(null); setMsgText("");
    setResolved(null); setSchedEnabled(false); setSchedDate(""); setSchedTime("");
  }

  function splitSelected() {
    const groupIds: number[]    = [];
    const subGroupIds: number[] = [];
    selGroups.forEach((id: number) => {
      const g = groups.find((x: any) => x.id === id);
      if (g?.kind === "sub_group") subGroupIds.push(id);
      else groupIds.push(id);
    });
    return { groupIds, subGroupIds };
  }

  async function resolveRecipients() {
    try {
      const phones = rawPhones.split(/[,\n\s;]+/).map(p => p.trim()).filter(Boolean);
      const { groupIds, subGroupIds } = splitSelected();
      const r: any = await messagesApi.resolveRecipients({
        group_ids:     groupIds.length    ? groupIds    : undefined,
        sub_group_ids: subGroupIds.length ? subGroupIds : undefined,
        phone_numbers: phones.length      ? phones      : undefined,
      });
      setResolved((r?.data?.count ?? r?.count) ?? 0);
    } catch { setResolved(0); }
  }

  async function sendNow() {
    if (!msgText.trim()) { setToast({ ok: false, msg: "اكتب نص الرسالة" }); return; }
    if (!selGroups.length && !rawPhones.trim()) { setToast({ ok: false, msg: "اختر مستلمين" }); return; }
    const phones = rawPhones.split(/[,\n\s;]+/).map(p => p.trim()).filter(Boolean);
    if (!confirm(`إرسال الرسالة لـ ${resolvedCount ?? "?"} مستلم؟`)) return;

    setSending(true);
    try {
      const { groupIds, subGroupIds } = splitSelected();
      const r: any = await messagesApi.send({
        message: msgText, type: "manual",
        group_ids:     groupIds.length    ? groupIds    : undefined,
        sub_group_ids: subGroupIds.length ? subGroupIds : undefined,
        phone_numbers: phones.length      ? phones      : undefined,
      });
      const data = r?.data ?? r;
      setToast({ ok: true, msg: data?.message ?? `تم الإرسال (${data?.dispatched ?? 0})` });
      if (typeof data?.balance === "number") setBalance(data.balance);
      setComposeOpen(false); resetCompose(); load();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الإرسال" });
    } finally { setSending(false); }
  }

  async function toggleRule(id: string) {
    setAutoRules(rules => rules.map(r => r.id === id ? { ...r, on: !r.on } : r));
    try { await messagesApi.toggleAutoRule(id); } catch { /* noop */ }
  }

  /* ═══ UI ═══ */
  const balancePct = balance === null ? 100 : Math.min(100, Math.round((balance / 2500) * 100));
  const balColor   = balancePct < 30 ? "#EF4444" : balancePct < 60 ? "#F59E0B" : "#22C55E";
  const balBorder  = balancePct < 30 ? "#FCA5A5" : balancePct < 60 ? "#FCD34D" : "var(--brd)";
  const balBg      = balancePct < 30 ? "#FEF2F2" : balancePct < 60 ? "#FFFBEB" : "var(--bg2)";

  const TABS = [
    { id: "history"  as const, ar: "سجل الإرسال", ico: "📨", badge: 0 },
    { id: "scheduled" as const, ar: "المجدولة",   ico: "⏰", badge: scheduledList.length },
    { id: "drafts"   as const, ar: "المسودات",    ico: "📝", badge: draftsList.length },
    { id: "auto"     as const, ar: "التلقائي",    ico: "🤖", badge: autoRules.filter(r => r.on).length },
    { id: "archive"  as const, ar: "الأرشيف",     ico: "📦", badge: 0 },
    { id: "reports"  as const, ar: "التقارير",    ico: "📊", badge: 0 },
  ];

  return (
    <DashboardLayout title={lang === "ar" ? "مركز الرسائل والإشعارات" : "Messages Center"}>
      {toast && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit", fontSize: 14 }}>×</button>
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>📩 مركز الرسائل والإشعارات</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
            {totalSent.toLocaleString("ar-EG")} رسالة · {delivRate}% معدل الوصول
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <a href="/access/sms-settings" style={{ ...btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>⚙️ إعدادات الإرسال</a>
          <button onClick={() => { setComposeOpen(true); resetCompose(); }} style={btnAccent}>
            ✉️ إرسال رسالة
          </button>
        </div>
      </div>

      {/* PROVIDER STATUS STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {/* SMS card */}
        <div style={{ padding: "12px 14px", border: `1.5px solid ${balBorder}`, borderRadius: 12, background: balBg }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📱</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>SMS · Orbit SMS</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>متصل عبر <strong>API</strong></div>
              </div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: balancePct < 30 ? "#DC2626" : balancePct < 60 ? "#B45309" : "#059669", fontFamily: "var(--fm)" }}>
                {balance === null ? "…" : balance.toLocaleString("ar-EG")}
              </div>
              <div style={{ fontSize: 9, color: "var(--tx2)" }}>رصيد متبقي</div>
            </div>
          </div>
          <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${balancePct}%`, background: balColor, transition: "width .3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: "var(--tx2)" }}>🔄 تحديث تلقائي</span>
            <button onClick={load} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", cursor: "pointer" }}>🔄 تحديث</button>
          </div>
        </div>

        {/* WhatsApp card — DISABLED (per user request) */}
        <div style={{ padding: "12px 14px", border: "1.5px dashed var(--brd)", borderRadius: 12, background: "var(--bg3)", opacity: 0.6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💬</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>WhatsApp</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>غير مُفعّل حالياً</div>
              </div>
            </div>
            <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 6, background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A", fontWeight: 700 }}>قريباً</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--tx2)" }}>
            التكامل مع WhatsApp Business سيُضاف لاحقاً.
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: totalSent.toLocaleString("ar-EG"), ar: "رسائل وصلت",  c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
          { v: totalFail.toLocaleString("ar-EG"), ar: "فشلت",         c: totalFail > 0 ? "#DC2626" : "#059669", bg: totalFail > 0 ? "#FEF2F2" : "#ECFDF5", brd: totalFail > 0 ? "#FCA5A5" : "#A7F3D0" },
          { v: delivRate + "%",                    ar: "معدل الوصول",  c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
          { v: scheduledList.length,               ar: "مجدولة",       c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
          { v: autoRules.filter(r => r.on).length, ar: "قواعد تلقائية", c: "#7C3AED", bg: "#F5F3FF", brd: "#DDD6FE" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.brd}`, borderRadius: 11, padding: "10px 12px" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.ar}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "1.5px solid var(--brd)", marginBottom: 14, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelMsg(null); }}
            style={{
              padding: "10px 14px", border: "none", background: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
              color: tab === t.id ? "#E8702A" : "var(--tx2)",
              borderBottom: tab === t.id ? "2px solid #E8702A" : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {t.ico} {t.ar}
            {t.badge > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: "50%", background: tab === t.id ? "#E8702A" : "#EFF6FF", color: tab === t.id ? "#fff" : "#2563EB", fontSize: 9, fontWeight: 800 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
      ) : (
        <>
          {tab === "history"   && <HistoryTab history={history} selMsg={selectedMsg} setSel={setSelMsg} />}
          {tab === "scheduled" && <SimpleTab items={scheduledList} emptyIco="⏰" emptyText="لا توجد رسائل مجدولة" />}
          {tab === "drafts"    && <SimpleTab items={draftsList}    emptyIco="📝" emptyText="لا توجد مسودات" />}
          {tab === "auto"      && <AutoTab rules={autoRules} toggleRule={toggleRule} />}
          {tab === "archive"   && <ArchiveTab history={history} search={archiveSearch} setSearch={setArchiveSearch} />}
          {tab === "reports"   && <ReportsTab history={history} balance={balance} />}
        </>
      )}

      {/* COMPOSE DRAWER */}
      {composeOpen && (
        <ComposeDrawer
          close={() => setComposeOpen(false)}
          step={step} setStep={setStep}
          groups={groups} selGroups={selGroups} setSelGroups={setSelGroups}
          rawPhones={rawPhones} setRawPhones={setRawPhones}
          selTemplate={selTemplate} setSelTemplate={setSelTemplate}
          msgText={msgText} setMsgText={setMsgText}
          schedEnabled={schedEnabled} setSchedEnabled={setSchedEnabled}
          schedDate={schedDate} setSchedDate={setSchedDate}
          schedTime={schedTime} setSchedTime={setSchedTime}
          resolvedCount={resolvedCount} resolveRecipients={resolveRecipients}
          balance={balance}
          sending={sending} sendNow={sendNow}
        />
      )}
    </DashboardLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════════════════ */

function HistoryTab({ history, selMsg, setSel }: { history: any[]; selMsg: any; setSel: (m: any) => void }) {
  const [view, setView] = useState<"list" | "detail">(selMsg ? "detail" : "list");
  useEffect(() => { setView(selMsg ? "detail" : "list"); }, [selMsg]);

  if (!history.length) {
    return <Empty ico="📨" text="لا توجد رسائل مُرسَلة بعد" />;
  }

  const selected = selMsg ? history.find(h => h.id === selMsg.id) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: 10 }}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {history.map(h => {
          const ch = CH_META[h.ch] ?? CH_META.sms;
          const st = ST_META[h.status] ?? ST_META.ok;
          const rate = h.cnt > 0 ? Math.round(h.sent / h.cnt * 100) : 0;
          return (
            <div
              key={h.id}
              onClick={() => setSel(selMsg?.id === h.id ? null : h)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderBottom: "1px solid var(--brd)", cursor: "pointer",
                background: selMsg?.id === h.id ? "rgba(232,112,42,.06)" : "transparent",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 11, background: ch.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {ch.ico}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {h.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "var(--tx2)" }}>{h.date} · {h.time}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 5, color: st.c, background: st.bg, border: `1px solid ${st.brd}` }}>{st.ar}</span>
                  {h.auto && <span style={{ fontSize: 9, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", padding: "1px 6px", borderRadius: 5, fontWeight: 700 }}>تلقائي</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, maxWidth: 140, height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${rate}%`, background: h.status === "ok" ? "#22C55E" : h.status === "fail" ? "#EF4444" : "#F59E0B" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{h.sent}/{h.cnt}</span>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: ch.bg, color: ch.c, border: `1px solid ${ch.brd}`, flexShrink: 0 }}>
                {ch.ico} {ch.ar}
              </span>
            </div>
          );
        })}
      </div>

      {selected && (
        <MsgDetail msg={selected} onClose={() => setSel(null)} />
      )}
    </div>
  );
}

function MsgDetail({ msg, onClose }: { msg: any; onClose: () => void }) {
  const ch = CH_META[msg.ch] ?? CH_META.sms;
  const st = ST_META[msg.status] ?? ST_META.ok;
  const rate = msg.cnt > 0 ? Math.round(msg.sent / msg.cnt * 100) : 0;
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: 14, borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>تفاصيل الرسالة</div>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--tx2)", fontSize: 18 }}>×</button>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{msg.title}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
          {[
            { v: msg.cnt,    ar: "إجمالي", c: "#2563EB" },
            { v: msg.sent,   ar: "وصلت",   c: "#059669" },
            { v: msg.failed, ar: "فشلت",   c: msg.failed > 0 ? "#DC2626" : "#059669" },
            { v: rate + "%", ar: "نسبة",   c: "#E8702A" },
          ].map((s, i) => (
            <div key={i} style={{ padding: 8, background: "var(--bg3)", borderRadius: 9, textAlign: "center", border: "1px solid var(--brd)" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.c, fontFamily: "var(--fm)" }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "var(--tx2)" }}>{s.ar}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 6 }}>{msg.date} · {msg.time}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: ch.bg, color: ch.c, fontWeight: 700, border: `1px solid ${ch.brd}` }}>{ch.ico} {ch.ar}</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: st.bg, color: st.c, fontWeight: 700, border: `1px solid ${st.brd}` }}>{st.ar}</span>
          {msg.auto && <span style={{ fontSize: 10, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", padding: "2px 8px", borderRadius: 5 }}>🤖 تلقائي</span>}
        </div>
        {msg.body && (
          <div style={{ padding: "11px 13px", background: ch.bg, borderRadius: 10, fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {msg.body.slice(0, 300)}
          </div>
        )}
      </div>
    </div>
  );
}

function SimpleTab({ items, emptyIco, emptyText }: { items: any[]; emptyIco: string; emptyText: string }) {
  if (!items.length) return <Empty ico={emptyIco} text={emptyText} />;
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16 }}>
      {items.map((it, i) => (
        <div key={i} style={{ padding: 12, borderBottom: i < items.length - 1 ? "1px solid var(--brd)" : "none", fontSize: 12 }}>
          {it.title ?? it.message_body ?? "—"}
        </div>
      ))}
    </div>
  );
}

function AutoTab({ rules, toggleRule }: { rules: any[]; toggleRule: (id: string) => void }) {
  return (
    <div>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--tx2)" }}>🤖 قواعد الإرسال التلقائي</div>
        </div>
        {rules.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 36, opacity: 0.4 }}>🤖</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>لا توجد قواعد تلقائية</div>
          </div>
        ) : rules.map(rule => {
          const meta = TRIGGER_META[rule.trigger] ?? { ico: "🤖", ar: rule.trigger };
          const ch = CH_META[rule.ch] ?? CH_META.sms;
          return (
            <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
              <div style={{ fontSize: 22 }}>{meta.ico}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{rule.ar}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "var(--tx2)" }}>{meta.ar}</span>
                  <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: ch.bg, color: ch.c, fontWeight: 700 }}>{ch.ico} {ch.ar}</span>
                  {rule.lastRun !== "—" && (
                    <span style={{ fontSize: 10, color: "var(--tx2)" }}>آخر تشغيل: {rule.lastRun}{rule.cnt ? ` (${rule.cnt})` : ""}</span>
                  )}
                </div>
              </div>
              <div
                onClick={() => toggleRule(rule.id)}
                style={{
                  width: 40, height: 22, borderRadius: 11, position: "relative",
                  background: rule.on ? "#E8702A" : "var(--bg3)",
                  border: "1.5px solid " + (rule.on ? "#E8702A" : "var(--brd)"),
                  cursor: "pointer", transition: "background .2s",
                }}
              >
                <div style={{ width: 15, height: 15, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: rule.on ? 2 : 20, transition: "right .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "12px 16px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 11, fontSize: 11.5, color: "#0369A1", lineHeight: 1.5 }}>
        💡 <strong>ملاحظة:</strong> القواعد التلقائية تعمل بناءً على أحداث النظام (تسجيل غياب، استدعاء، إلخ). تأكد من إعداد مزود SMS في <a href="/access/sms-settings" style={{ color: "#E8702A", fontWeight: 800 }}>إعدادات الإرسال</a>.
      </div>
    </div>
  );
}

function ArchiveTab({ history, search, setSearch }: { history: any[]; search: string; setSearch: (s: string) => void }) {
  const filtered = search.trim()
    ? history.filter(h => (h.title + " " + h.body).toLowerCase().includes(search.toLowerCase()))
    : history;

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--tx2)" }}>📦 الأرشيف الكامل</div>
        <div style={{ display: "flex", gap: 7 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في الأرشيف..."
            style={{ padding: "5px 10px", border: "1px solid var(--brd)", borderRadius: 7, background: "var(--bg2)", fontFamily: "inherit", fontSize: 11, color: "var(--tx1)", outline: "none" }}
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <Empty ico="📦" text="لا توجد نتائج" />
      ) : filtered.map(h => {
        const ch = CH_META[h.ch] ?? CH_META.sms;
        const st = ST_META[h.status] ?? ST_META.ok;
        return (
          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--brd)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{ch.ico}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>{h.date} · {h.sent}/{h.cnt} · {ch.ar}</div>
            </div>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: st.bg, color: st.c, fontWeight: 700 }}>{st.ar}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReportsTab({ history, balance }: { history: any[]; balance: number | null }) {
  const byChannel = { sms: 0, whatsapp: 0 } as Record<string, number>;
  history.forEach(h => { byChannel[h.ch] = (byChannel[h.ch] || 0) + h.sent; });
  const totalCh = Object.values(byChannel).reduce((a, b) => a + b, 0) || 1;

  const maxW = Math.max(...WEEK_DATA.map(d => d.sent)) || 1;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {/* Channel distribution */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--tx2)", marginBottom: 14 }}>📊 توزيع الإرسال بالقناة</div>
        {Object.entries(byChannel).map(([ch, cnt]) => {
          const meta = CH_META[ch] ?? CH_META.sms;
          const pct = Math.round(cnt / totalCh * 100);
          const barC = ch === "sms" ? "#2563EB" : "#22C55E";
          return (
            <div key={ch} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                <span>{meta.ico} {meta.ar}</span>
                <span style={{ color: barC, fontFamily: "var(--fm)" }}>{cnt.toLocaleString("ar-EG")} ({pct}%)</span>
              </div>
              <div style={{ height: 10, background: "var(--bg3)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: barC, borderRadius: 5 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly volume */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--tx2)", marginBottom: 14 }}>📅 الإرسال الأسبوعي</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {WEEK_DATA.map((d, i) => {
            const h = Math.round((d.sent / maxW) * 72);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: "#E8702A", fontFamily: "var(--fm)" }}>{d.sent > 0 ? d.sent : ""}</div>
                <div style={{ width: "100%", borderRadius: "4px 4px 0 0", background: d.sent > 0 ? "#E8702A" : "var(--bg3)", height: Math.max(h, 4) }} />
                <div style={{ fontSize: 9, color: "var(--tx2)" }}>{d.day}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit usage */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--tx2)", marginBottom: 14 }}>💰 استهلاك الرصيد</div>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#E8702A", fontFamily: "var(--fm)" }}>
            {balance === null ? "…" : balance.toLocaleString("ar-EG")}
          </div>
          <div style={{ fontSize: 11, color: "var(--tx2)" }}>رصيد SMS متبقي</div>
        </div>
      </div>

      {/* Top performing */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--tx2)", marginBottom: 12 }}>🏆 أعلى معدلات الوصول</div>
        {history.filter(h => h.status === "ok" && h.cnt > 0).slice(0, 5).map(h => {
          const pct = Math.round(h.sent / h.cnt * 100);
          return (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</div>
                <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden", marginTop: 3 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#22C55E" }} />
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#059669", fontFamily: "var(--fm)" }}>{pct}%</span>
            </div>
          );
        })}
        {!history.filter(h => h.status === "ok").length && <div style={{ fontSize: 11, color: "var(--tx2)", textAlign: "center", padding: 20 }}>لا توجد بيانات</div>}
      </div>
    </div>
  );
}

function Empty({ ico, text }: { ico: string; text: string }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 60, textAlign: "center", color: "var(--tx2)" }}>
      <div style={{ fontSize: 44, opacity: 0.3 }}>{ico}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{text}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSE DRAWER
═══════════════════════════════════════════════════════════ */
function ComposeDrawer(p: any) {
  const { close, step, setStep, groups, selGroups, setSelGroups, rawPhones, setRawPhones,
    selTemplate, setSelTemplate, msgText, setMsgText,
    schedEnabled, setSchedEnabled, schedDate, setSchedDate, schedTime, setSchedTime,
    resolvedCount, resolveRecipients, balance, sending, sendNow } = p;

  // Render via portal so any parent transform/overflow doesn't clip the drawer.
  if (typeof document === "undefined") return null;

  return createPortal((
    <>
      <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998 }} />
      <div style={{
        position: "fixed", top: 0, bottom: 0, insetInlineEnd: 0,
        width: 520, maxWidth: "95vw",
        background: "var(--bg2)",
        boxShadow: "-4px 0 24px rgba(0,0,0,.15)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",   // header · body · footer
        overflow: "hidden",
        zIndex: 9999,
      }}>
        {/* HEADER */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--brd)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>📩 إنشاء رسالة جديدة</div>
            <button onClick={close} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "var(--bg3)", cursor: "pointer", fontSize: 15 }}>×</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {[{ n: 1, ar: "المستلمون" }, { n: 2, ar: "الرسالة" }, { n: 3, ar: "مراجعة" }].map((s, i) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                  background: step > s.n ? "#E8702A" : step === s.n ? "#FEF3E8" : "var(--bg3)",
                  color: step > s.n ? "#fff" : step === s.n ? "#E8702A" : "var(--tx2)",
                  border: "2px solid " + (step >= s.n ? "#E8702A" : "var(--brd)"),
                }}>{step > s.n ? "✓" : s.n}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: step === s.n ? "#E8702A" : step > s.n ? "var(--tx1)" : "var(--tx2)" }}>{s.ar}</span>
                {i < 2 && <div style={{ flex: 1, height: 2, background: step > s.n + 1 ? "#E8702A" : "var(--brd)", borderRadius: 1, maxWidth: 30 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div style={{ minHeight: 0, overflowY: "auto", padding: "16px 20px" }}>
          {step === 1 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)", marginBottom: 10 }}>اختر المجموعات المستهدفة</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {groups.length === 0 && <div style={{ fontSize: 11, color: "var(--tx2)", padding: 8 }}>لا توجد مجموعات</div>}
                {groups.map((g: any) => {
                  const sel = selGroups.includes(g.id);
                  return (
                    <div key={g.id} onClick={() => setSelGroups((sg: number[]) => sel ? sg.filter((x: number) => x !== g.id) : [...sg, g.id])}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", border: `1.5px solid ${sel ? "#E8702A" : "var(--brd)"}`, borderRadius: 10, background: sel ? "#FEF3E8" : "var(--bg2)", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ fontSize: 18 }}>🏫</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: sel ? "#E8702A" : "var(--tx1)" }}>{g.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: sel ? "#E8702A" : "var(--tx2)", fontFamily: "var(--fm)" }}>{g.employees_count ?? 0}</span>
                        <div style={{ width: 18, height: 18, borderRadius: 5, background: sel ? "#E8702A" : "var(--bg3)", border: "2px solid " + (sel ? "#E8702A" : "var(--brd)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {sel && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)", marginTop: 14, marginBottom: 6 }}>
                أو أضف أرقام يدوياً (افصل بفاصلة أو سطر)
              </div>
              <textarea
                value={rawPhones} onChange={(e: any) => setRawPhones(e.target.value)}
                placeholder="+966501234567, +966509876543" rows={2}
                style={{ width: "100%", boxSizing: "border-box", padding: 10, border: "1px solid var(--brd)", borderRadius: 8, fontSize: 12, fontFamily: "var(--fm)", direction: "ltr", background: "var(--bg2)", color: "var(--tx1)" }}
              />

              <button onClick={resolveRecipients} style={{ marginTop: 8, padding: "6px 14px", fontSize: 11, background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
                🔍 احسب عدد المستلمين
              </button>
              {resolvedCount !== null && (
                <div style={{ marginTop: 10, padding: "10px 14px", background: "#FEF3E8", borderRadius: 10, border: "1px solid rgba(232,112,42,.2)", fontSize: 12.5, color: "#E8702A", fontWeight: 700 }}>
                  ✓ إجمالي المستلمين الفريدين: {(resolvedCount as number).toLocaleString("ar-EG")}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>قالب الرسالة</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {TEMPLATES.map(t => {
                    const sel = selTemplate === t.id;
                    return (
                      <div key={t.id} onClick={() => { setSelTemplate(t.id); setMsgText(t.text); }}
                        style={{ padding: "10px 12px", border: `1.5px solid ${sel ? "#E8702A" : "var(--brd)"}`, borderRadius: 10, cursor: "pointer", background: sel ? "#FEF3E8" : "var(--bg2)", textAlign: "center" }}>
                        <div style={{ fontSize: 15, marginBottom: 3 }}>{t.ico}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: sel ? "#E8702A" : "var(--tx1)" }}>{t.ar}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)", marginBottom: 6 }}>نص الرسالة</div>
                <textarea
                  value={msgText} onChange={(e: any) => setMsgText(e.target.value)}
                  rows={6}
                  placeholder="اكتب نص الرسالة هنا...&#10;استخدم {{الاسم}} {{التاريخ}} {{الصف}} كمتغيرات"
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid var(--brd)", borderRadius: 10, background: "var(--bg2)", fontFamily: "inherit", fontSize: 13, color: "var(--tx1)", resize: "vertical", lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["{{الاسم}}", "{{التاريخ}}", "{{الصف}}", "{{المادة}}"].map(v => (
                      <button key={v} onClick={() => setMsgText((t: string) => t + v)}
                        style={{ fontSize: 9, padding: "2px 7px", border: "1px solid var(--brd)", borderRadius: 5, background: "var(--bg3)", cursor: "pointer", color: "var(--tx2)" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{msgText.length} حرف</span>
                </div>
              </div>

              {/* Schedule */}
              <div style={{ marginTop: 14, padding: 12, border: "1px solid var(--brd)", borderRadius: 10, background: "var(--bg2)" }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>⏰ جدولة الإرسال</span>
                  <input type="checkbox" checked={schedEnabled} onChange={(e: any) => setSchedEnabled(e.target.checked)} />
                </label>
                {schedEnabled && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <input type="date" value={schedDate} onChange={(e: any) => setSchedDate(e.target.value)} style={{ padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 8, fontSize: 12, background: "var(--bg2)", color: "var(--tx1)" }} />
                    <input type="time" value={schedTime} onChange={(e: any) => setSchedTime(e.target.value)} style={{ padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 8, fontSize: 12, background: "var(--bg2)", color: "var(--tx1)" }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>مراجعة الإرسال</div>
              <div style={{ padding: "14px 16px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    { label: "المستلمون", val: resolvedCount !== null ? `${(resolvedCount as number).toLocaleString("ar-EG")} مستلم` : "—", c: "#E8702A" },
                    { label: "القناة",    val: "📱 SMS", c: "#2563EB" },
                    { label: "التكلفة التقديرية", val: resolvedCount !== null ? `${((resolvedCount as number) * 0.12).toFixed(2)} ر.س` : "—", c: "#B45309" },
                    { label: "الرصيد الحالي", val: balance !== null ? `${balance.toLocaleString("ar-EG")}` : "—", c: "#059669" },
                    ...(schedEnabled ? [{ label: "موعد الإرسال", val: `⏰ ${schedDate} ${schedTime}`, c: "#7C3AED" }] : []),
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "var(--tx2)" }}>{r.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: r.c, fontFamily: "var(--fm)" }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {msgText && (
                <div style={{ padding: "13px 16px", background: "#EFF6FF", borderRadius: 14, border: "1px solid #BFDBFE", fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {msgText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--brd)", background: "var(--bg2)", boxShadow: "0 -2px 8px rgba(0,0,0,.05)", display: "flex", gap: 8, alignItems: "center" }}>
          {step > 1 && (
            <button onClick={() => setStep((step - 1) as any)} style={{ padding: "10px 16px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>← رجوع</button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button onClick={() => { if (step === 1) resolveRecipients(); setStep((step + 1) as any); }}
              style={{ padding: "10px 24px", background: "#E8702A", color: "#fff", border: 0, borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 6px rgba(232,112,42,.35)" }}>
              التالي ←
            </button>
          ) : (
            <button onClick={sendNow} disabled={sending}
              style={{ padding: "10px 24px", border: 0, borderRadius: 8, background: sending ? "var(--bg3)" : "#059669", color: "#fff", fontSize: 13, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer", boxShadow: "0 2px 6px rgba(5,150,105,.35)" }}>
              {sending ? "جاري…" : (schedEnabled ? "⏰ جدولة" : "▶ إرسال الآن")}
            </button>
          )}
        </div>
      </div>
    </>
  ), document.body);
}

const btnGhost: React.CSSProperties  = { padding: "8px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnAccent: React.CSSProperties = { padding: "8px 16px", background: "#E8702A", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" };
