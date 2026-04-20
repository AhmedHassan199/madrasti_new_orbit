"use client";

import { useState } from "react";

interface Props {
  title: string;
  subtitle: string;
  icon: string;
  color: "green" | "red" | "blue";
  buttonLabel: string;
  confirmMessage: string;
  warnings?: string[];
  action: (data: { from: string; to: string }) => Promise<any>;
}

const COLORS = {
  green: { bg: "#35DC51", hover: "#22C55E", warn: "#FFFBEB", warnBrd: "#FDE68A", warnText: "#92400E" },
  red:   { bg: "#DC2626", hover: "#B91C1C", warn: "#FEF2F2", warnBrd: "#FECACA", warnText: "#991B1B" },
  blue:  { bg: "#2563EB", hover: "#1D4ED8", warn: "#EFF6FF", warnBrd: "#BFDBFE", warnText: "#1E3A8A" },
};

export default function DateRangeActionPage({ title, subtitle, icon, color, buttonLabel, confirmMessage, warnings = [], action }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(weekAgo);
  const [to, setTo]     = useState(today);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const c = COLORS[color];

  async function handleSubmit() {
    if (!from || !to) { setResult({ ok: false, msg: "أدخل التواريخ" }); return; }
    if (from > to)    { setResult({ ok: false, msg: "تاريخ البداية قبل تاريخ النهاية" }); return; }
    if (!confirm(confirmMessage)) return;

    setBusy(true);
    setResult(null);
    try {
      const r: any = await action({ from, to });
      const data = r?.data ?? r;
      setResult({ ok: true, msg: data?.message ?? "تمت العملية بنجاح" });
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message ?? "فشلت العملية" });
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {!!warnings.length && (
        <div style={{ background: c.warn, border: `1px solid ${c.warnBrd}`, borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 12, color: c.warnText, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⚠️ تنبيهات مهمة</div>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{icon}</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tx2)" }}>{subtitle}</p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--tx2)", marginBottom: 6, fontWeight: 600 }}>📅 من تاريخ</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} max={today} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--tx2)", marginBottom: 6, fontWeight: 600 }}>📅 إلى تاريخ</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} max={today} style={inp} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={busy}
          style={{
            width: "100%", marginTop: 20, padding: "12px 16px",
            background: busy ? "var(--bg3)" : c.bg, color: "#fff", border: 0, borderRadius: 8,
            fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "جاري التنفيذ…" : `${icon} ${buttonLabel}`}
        </button>

        {result && (
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 8,
            background: result.ok ? "#ECFDF5" : "#FEF2F2",
            border: `1px solid ${result.ok ? "#A7F3D0" : "#FECACA"}`,
            color: result.ok ? "#065F46" : "#991B1B",
            fontSize: 12, fontWeight: 600, textAlign: "center",
          }}>
            {result.ok ? "✅ " : "⚠️ "}{result.msg}
          </div>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid var(--brd)",
  borderRadius: 8, fontSize: 13, fontFamily: "inherit",
  background: "var(--bg2)", color: "var(--tx1)",
};
