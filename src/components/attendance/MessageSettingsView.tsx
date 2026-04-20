"use client";

import { useState, useEffect } from "react";

/**
 * Shared settings view for attendance message templates.
 * Mirrors orbit-fingerprint-user/views/pages/{student,Teacher}/messages_setting.blade.php
 *
 * Two tabs:
 *   1. General Settings — on/off toggles
 *   2. Message Settings — textarea templates with variable hints
 */

interface GeneralFlag {
  key: string;
  label: string;
  disabled?: boolean;
}

interface TemplateField {
  key: string;
  label: string;
  defaultText: string;
  variables: string[];
}

interface Props {
  fetcher: () => Promise<any>;
  saver: (data: any) => Promise<any>;
  generalFlags: GeneralFlag[];
  templates: TemplateField[];
}

export default function MessageSettingsView({ fetcher, saver, generalFlags, templates }: Props) {
  const [tab, setTab]       = useState<"general" | "templates">("general");
  const [loading, setLoad]  = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState<Record<string, any>>({});
  const [toast, setToast]   = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoad(true);
    try {
      const r: any = await fetcher();
      const data = r?.data ?? r ?? {};
      const init: Record<string, any> = {};
      for (const f of generalFlags) init[f.key] = Boolean(data[f.key]);
      for (const t of templates)    init[t.key] = data[t.key] ?? "";
      setForm(init);
    } catch {
      const init: Record<string, any> = {};
      for (const f of generalFlags) init[f.key] = false;
      for (const t of templates)    init[t.key] = "";
      setForm(init);
    }
    setLoad(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function save() {
    setSaving(true);
    try {
      // Send all fields — use default template text for empty ones
      const payload: Record<string, any> = { ...form };
      for (const t of templates) {
        if (!payload[t.key] || !String(payload[t.key]).trim()) {
          payload[t.key] = t.defaultText;
        }
      }
      await saver(payload);
      setToast({ ok: true, msg: "تم حفظ الإعدادات بنجاح" });
      await load();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" });
    } finally { setSaving(false); }
  }

  function insertVar(key: string, v: string) {
    setForm((f) => ({ ...f, [key]: (f[key] ?? "") + " " + v }));
  }

  return (
    <>
      {toast && (
        <div style={{
          marginBottom: 12, padding: 10, borderRadius: 6,
          background: toast.ok ? "#ECFDF5" : "#FEF2F2",
          border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`,
          color: toast.ok ? "#065F46" : "#991B1B",
          fontSize: 12, fontWeight: 600,
        }}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit", fontSize: 14 }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1.5px solid var(--brd)" }}>
        {[
          { id: "general"   as const, ar: "الإعدادات العامة",    ico: "⚙️" },
          { id: "templates" as const, ar: "قوالب الرسائل",         ico: "✉️" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              color: tab === t.id ? "#E8702A" : "var(--tx2)",
              borderBottom: tab === t.id ? "3px solid #E8702A" : "3px solid transparent",
              transform: tab === t.id ? "translateY(1.5px)" : "none",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {t.ico} {t.ar}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
      ) : (
        <>
          {tab === "general" && (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: "var(--bg3)", borderBottom: "1px solid var(--brd)", fontSize: 12, fontWeight: 800, color: "var(--tx2)" }}>
                إعدادات الإرسال العامة
              </div>
              {generalFlags.map((f, i) => (
                <div key={f.key} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px",
                  borderBottom: i < generalFlags.length - 1 ? "1px solid var(--brd)" : "none",
                  opacity: f.disabled ? 0.6 : 1,
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--bg3)", color: "var(--tx2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "var(--fm)", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: f.disabled ? "var(--tx2)" : "var(--tx1)" }}>
                    {f.label}
                    {f.disabled && <span style={{ marginInlineStart: 8, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}>قريباً</span>}
                  </div>
                  <Toggle
                    on={!!form[f.key]}
                    disabled={!!f.disabled}
                    onChange={(v) => setForm((fm) => ({ ...fm, [f.key]: v }))}
                  />
                </div>
              ))}
            </div>
          )}

          {tab === "templates" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {templates.map((t) => (
                <div key={t.key} style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>✉️ {t.label}</label>
                    <span style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)" }}>
                      {(form[t.key] ?? "").length} حرف
                    </span>
                  </div>
                  <textarea
                    value={form[t.key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [t.key]: e.target.value }))}
                    placeholder={t.defaultText}
                    rows={3}
                    style={{
                      width: "100%", boxSizing: "border-box", padding: "10px 12px",
                      border: "1px solid var(--brd)", borderRadius: 8,
                      fontSize: 13, fontFamily: "inherit", lineHeight: 1.7,
                      background: "var(--bg2)", color: "var(--tx1)", resize: "vertical",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {t.variables.map(v => (
                      <button
                        key={v} onClick={() => insertVar(t.key, v)}
                        title={`إدراج ${v}`}
                        style={{ padding: "3px 10px", fontSize: 10, background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 6, cursor: "pointer", color: "var(--tx2)", fontFamily: "var(--fm)", fontWeight: 600 }}
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, padding: "6px 10px", background: "#FEF3E8", border: "1px solid rgba(232,112,42,.2)", borderRadius: 6, fontSize: 10.5, color: "#92400E", lineHeight: 1.6 }}>
                    ℹ️ <strong>المتغيرات المتاحة:</strong> {t.variables.join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button
              onClick={save} disabled={saving}
              style={{
                padding: "12px 28px", background: saving ? "var(--bg3)" : "var(--accent)",
                color: "#fff", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "جاري الحفظ…" : "💾 حفظ الإعدادات"}
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 48, height: 26, borderRadius: 13, position: "relative", flexShrink: 0,
        background: on ? "#059669" : "var(--bg3)",
        border: "1.5px solid " + (on ? "#059669" : "var(--brd)"),
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background .2s",
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 2, right: on ? 2 : 24, transition: "right .2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );
}
