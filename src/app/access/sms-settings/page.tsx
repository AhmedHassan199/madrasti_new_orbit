"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { accessApi } from "@/lib/access-api";

/**
 * إعدادات SMS العامة.
 * 1. المستخدم يدخل الـ Token.
 * 2. بعد الحفظ، يتم استدعاء الـ API:
 *    - /api/v1/get-balance     → الرصيد
 *    - /api/v1/get-sendernames → قائمة أسماء المُرسِلين المُعتمدة
 * 3. الحالة تظهر بوضوح: متصل / فشل الاتصال / لا يوجد token.
 */
export default function SmsSettingsPage() {
  const { lang } = useUi();

  const [senderName, setSenderName] = useState("");
  const [token, setToken]           = useState("");
  const [hasToken, setHasToken]     = useState(false);
  const [senders, setSenders]       = useState<any[]>([]);
  const [balance, setBalance]       = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [toast, setToast]           = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r: any = await accessApi.smsGet();
      const d = r?.data ?? r;
      setSenderName(d?.sms_sender_name ?? "");
      setToken(d?.sms_user_token ?? "");
      setHasToken(!!d?.has_token);
      setSenders(d?.senders ?? []);
      setBalance(d?.balance ?? null);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      const payload: any = { sms_sender_name: senderName };
      if (token && token !== "••••••••") payload.sms_user_token = token;
      await accessApi.smsSave(payload);
      setToast({ ok: true, msg: "تم حفظ الإعدادات — جاري التحقق من الرصيد والمُرسلين…" });
      await load();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" });
    } finally { setSaving(false); }
  }

  /** Test the token without saving — fetches balance + senders live. */
  async function test() {
    if (!token.trim() || token === "••••••••") {
      setTestResult({ valid: false, message: "اكتب Token جديد للفحص" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const r: any = await accessApi.smsTest({ sms_user_token: token });
      const d = r?.data ?? r;
      if (d?.valid) {
        setBalance(d.balance ?? 0);
        setSenders(d.senders ?? []);
        setTestResult({ valid: true, message: d.message });
      } else {
        setBalance(null);
        setSenders([]);
        setTestResult({ valid: false, message: d?.message ?? "التوكن غير صالح" });
      }
    } catch (e: any) {
      setTestResult({ valid: false, message: e?.message ?? "فشل الفحص" });
    } finally { setTesting(false); }
  }

  /* ═══ Connection status ═══
     - no-token     : لم يُدخل token بعد
     - connected    : token موجود + الرصيد جاي + senders فيها قيم
     - authenticated-empty : token مقبول لكن مش في مُرسلين مُعتمدين
     - failed       : token موجود لكن الـ API رفضه (401/خطأ)
  */
  const status = useMemo(() => {
    if (!hasToken) return "no-token" as const;
    if (balance !== null && balance >= 0 && senders.length > 0) return "connected" as const;
    if (balance !== null && balance >= 0) return "authenticated-empty" as const;
    return "failed" as const;
  }, [hasToken, balance, senders.length]);

  const sendersNormalized = useMemo(() =>
    senders.map(s => typeof s === "string" ? s : (s.name ?? s.sender_name ?? s.title ?? "")).filter(Boolean)
  , [senders]);

  return (
    <DashboardLayout
      title={lang === "ar" ? "إعدادات الإرسال العامة" : "General SMS Settings"}
      subtitle={lang === "ar" ? "ضع الـ Token وسيتم جلب اسم المُرسِل والرصيد تلقائياً من مزود SMS" : "SMS provider settings"}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {toast && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
            {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          </div>
        )}

        {/* CONNECTION STATUS BANNER */}
        <div style={{
          marginBottom: 14, padding: "12px 14px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10,
          background:
            status === "connected"            ? "#ECFDF5" :
            status === "authenticated-empty"  ? "#FFFBEB" :
            status === "failed"               ? "#FEF2F2" :
            "var(--bg3)",
          border: "1px solid " + (
            status === "connected"            ? "#A7F3D0" :
            status === "authenticated-empty"  ? "#FDE68A" :
            status === "failed"               ? "#FECACA" :
            "var(--brd)"
          ),
        }}>
          <div style={{ fontSize: 22 }}>
            {status === "connected" ? "🟢" :
             status === "authenticated-empty" ? "🟡" :
             status === "failed" ? "🔴" : "⚪"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color:
              status === "connected"            ? "#065F46" :
              status === "authenticated-empty"  ? "#92400E" :
              status === "failed"               ? "#991B1B" :
              "var(--tx2)"
            }}>
              {status === "connected" && "متصل بمزود SMS"}
              {status === "authenticated-empty" && "التوكن صحيح لكن لا يوجد أسماء مُرسِلين مُعتمدة"}
              {status === "failed" && "فشل الاتصال — التوكن غير صالح أو منتهي"}
              {status === "no-token" && "لم يتم إدخال Token بعد"}
            </div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
              {status === "connected" && `${sendersNormalized.length} اسم مُرسِل · الرصيد: ${balance?.toLocaleString("ar-EG")}`}
              {status === "authenticated-empty" && "تواصل مع مزود الخدمة لاعتماد اسم مُرسِل"}
              {status === "failed" && "تحقق من الـ Token من لوحة مزود SMS"}
              {status === "no-token" && "أدخل الـ Token بالأسفل لبدء الاتصال"}
            </div>
          </div>
          <button onClick={load} disabled={loading} style={{ padding: "6px 10px", fontSize: 11, background: "rgba(255,255,255,.6)", border: "1px solid rgba(0,0,0,.1)", borderRadius: 5, cursor: "pointer", fontWeight: 700 }}>
            🔄 تحديث
          </button>
        </div>

        {/* BALANCE CARD */}
        {status === "connected" && (
          <div style={{ background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", border: "1px solid #A7F3D0", borderRadius: 12, padding: 20, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#065F46", fontWeight: 800, marginBottom: 4 }}>رصيدك الحالي</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#059669", fontFamily: "var(--fm)", lineHeight: 1 }}>
              {balance?.toLocaleString("ar-EG")}
            </div>
            <div style={{ fontSize: 11, color: "#065F46", marginTop: 6 }}>رسالة متبقية</div>
          </div>
        )}

        {/* MAIN FORM */}
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 24 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
          ) : (
            <>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>
                📱 بيانات مزود SMS
              </h3>

              {/* Token Input + Test Button */}
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>
                  🔑 Token (مزود SMS)
                  {hasToken && <span style={{ marginInlineStart: 8, fontSize: 10, color: "#059669", fontWeight: 700 }}>✓ محفوظ</span>}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text" value={token} onChange={e => { setToken(e.target.value); setTestResult(null); }}
                    placeholder={hasToken ? "••••••••  (اكتب فوقه بـ token جديد للفحص)" : "ادخل الـ Token من لوحة مزود SMS"}
                    style={{ ...inp, flex: 1 }}
                    dir="ltr"
                  />
                  <button
                    onClick={test} disabled={testing || !token.trim() || token === "••••••••"}
                    style={{
                      padding: "10px 16px",
                      background: testing ? "var(--bg3)" : "#2563EB",
                      color: "#fff", border: 0, borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: (testing || !token.trim() || token === "••••••••") ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {testing ? "جاري الفحص…" : "🔍 فحص"}
                  </button>
                </div>

                {/* Test result */}
                {testResult && (
                  <div style={{
                    marginTop: 10, padding: 10, borderRadius: 6,
                    background: testResult.valid ? "#ECFDF5" : "#FEF2F2",
                    border: `1px solid ${testResult.valid ? "#A7F3D0" : "#FECACA"}`,
                    color: testResult.valid ? "#065F46" : "#991B1B",
                    fontSize: 12, fontWeight: 600,
                  }}>
                    {testResult.valid ? "✅ " : "⚠️ "}{testResult.message}
                  </div>
                )}

                <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 8, lineHeight: 1.6 }}>
                  💡 اضغط <strong>فحص</strong> للتأكد من الـ Token قبل الحفظ. لو كان صحيحاً، هيتم جلب الرصيد وقائمة المُرسلين المعتمدين تلقائياً.
                </div>
              </div>

              {/* Sender Name — Dropdown from API */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>
                  📡 اسم المُرسِل (Sender Name)
                  {sendersNormalized.length > 0 && (
                    <span style={{ marginInlineStart: 8, fontSize: 10, color: "#2563EB", fontWeight: 700 }}>
                      ({sendersNormalized.length} متاح من API)
                    </span>
                  )}
                </label>
                {sendersNormalized.length > 0 ? (
                  <select value={senderName} onChange={e => setSenderName(e.target.value)} style={inp}>
                    <option value="">— اختر اسم مُرسِل —</option>
                    {sendersNormalized.map((name, i) => (
                      <option key={i} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      type="text" value={senderName} onChange={e => setSenderName(e.target.value)}
                      placeholder={status === "failed" ? "أدخل Token صحيح أولاً" : "School-SA"}
                      style={{ ...inp, opacity: status === "failed" ? 0.6 : 1 }}
                      dir="ltr"
                      disabled={status === "failed"}
                    />
                    <div style={{ fontSize: 10, color: status === "failed" ? "#DC2626" : "var(--tx2)", marginTop: 4 }}>
                      {status === "failed" && "⚠️ لن يمكن جلب قائمة المُرسلين حتى يصبح الـ Token صالحاً"}
                      {status === "authenticated-empty" && "لا يوجد مُرسلين مُعتمدين — أدخل يدوياً أو تواصل مع المزود"}
                      {status === "no-token" && "القائمة ستظهر تلقائياً بعد حفظ Token صحيح"}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 6 }}>
                  ℹ️ اسم المُرسِل يجب أن يكون <strong>مُعتمداً من مزود SMS</strong>. سيظهر للمستقبل كاسم الجهة المُرسِلة للرسالة.
                </div>
              </div>

              {/* Save Button */}
              <button onClick={save} disabled={saving || !token.trim()} style={{
                width: "100%", padding: "12px 16px",
                background: saving || !token.trim() ? "var(--bg3)" : "var(--accent)", color: "#fff",
                border: 0, borderRadius: 8, fontSize: 14, fontWeight: 700,
                cursor: saving || !token.trim() ? "not-allowed" : "pointer",
              }}>
                {saving ? "جاري الحفظ والتحقق…" : "💾 حفظ وتحقق من الاتصال"}
              </button>
            </>
          )}
        </div>

        {/* Help */}
        <div style={{ marginTop: 14, padding: "12px 14px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10, fontSize: 11.5, color: "#0369A1", lineHeight: 1.6 }}>
          💡 <strong>ملاحظة:</strong> اسم المُرسِل والرصيد بيتم جلبهما <strong>من مزود SMS مباشرة</strong> بعد حفظ الـ Token. ما تحتاجش تدخلهم يدوياً — هتلاقي قائمة منسدلة تلقائياً لو الـ Token صحيح.
        </div>
      </div>
    </DashboardLayout>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid var(--brd)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "var(--bg2)", color: "var(--tx1)" };
const lbl: React.CSSProperties = { display: "flex", alignItems: "center", fontSize: 12, color: "var(--tx1)", marginBottom: 6, fontWeight: 700 };
const codeStyle: React.CSSProperties = { padding: "1px 5px", background: "var(--bg3)", borderRadius: 3, fontSize: 10, fontFamily: "var(--fm)", direction: "ltr", display: "inline-block" };
