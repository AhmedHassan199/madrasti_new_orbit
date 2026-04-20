"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { attendanceApi } from "@/lib/attendance-api";

export default function UploadMyTransactionsPage() {
  const { lang } = useUi();

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(weekAgo);
  const [to, setTo]     = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit() {
    if (!from || !to) {
      setResult({ ok: false, msg: "من فضلك أدخل التواريخ" });
      return;
    }
    if (from > to) {
      setResult({ ok: false, msg: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" });
      return;
    }
    if (!confirm("هل أنت متأكد من سحب البصمات لجميع موظفيك في هذه الفترة؟")) return;

    setSubmitting(true);
    setResult(null);
    try {
      const r: any = await attendanceApi.devices.uploadMy({ from, to });
      const data = r?.data ?? r;
      setResult({
        ok: true,
        msg: data?.message ?? `تم جدولة سحب بصمات ${data?.employees_count ?? ""} موظف.`,
      });
    } catch (e: any) {
      const msg = e?.message ?? e?.data?.message ?? "فشل في سحب البصمات";
      setResult({ ok: false, msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      title={lang === "ar" ? "سحب بصماتي" : "Pull My Transactions"}
      subtitle={lang === "ar" ? "جلب بصمات جميع موظفيك من BioTime في فترة زمنية محددة" : "Fetch fingerprints for all your employees from BioTime"}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* INFO PANEL */}
        <div style={{
          background: "#FFFBEB",
          border: "1px solid #FDE68A",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          fontSize: 12,
          color: "#92400E",
          lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>ℹ️</span> ملاحظات مهمة
          </div>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            <li>العملية تعمل في الخلفية — قد تستغرق عدة دقائق حسب عدد الموظفين.</li>
            <li>لا يمكن تكرار السحب لنفس المستخدم أكثر من مرة كل 10 دقائق.</li>
            <li>سيتم تحديث البصمات الموجودة وإضافة الجديدة تلقائياً.</li>
            <li>تأكد أن سيرفر BioTime متصل ومُعدّ صحيحاً.</li>
          </ul>
        </div>

        {/* FORM CARD */}
        <div style={{
          background: "var(--bg2)",
          border: "1px solid var(--brd)",
          borderRadius: 12,
          padding: 24,
        }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>سحب بصمات الموظفين</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tx2)" }}>
              اختر الفترة الزمنية لجلب البصمات من جهاز BioTime
            </p>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <Field label="من تاريخ">
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                max={today}
                style={inp}
              />
            </Field>
            <Field label="إلى تاريخ">
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                max={today}
                style={inp}
              />
            </Field>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "12px 16px",
              background: submitting ? "var(--bg3)" : "#35DC51",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "0.2s",
            }}
          >
            {submitting ? "جاري السحب…" : "👤 سحب البصمات"}
          </button>

          {result && (
            <div style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: result.ok ? "#ECFDF5" : "#FEF2F2",
              border: `1px solid ${result.ok ? "#A7F3D0" : "#FECACA"}`,
              color: result.ok ? "#065F46" : "#991B1B",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
            }}>
              {result.ok ? "✅ " : "⚠️ "}{result.msg}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--tx2)", marginBottom: 6, fontWeight: 600 }}>📅 {label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--brd)",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  background: "var(--bg2)",
  color: "var(--tx1)",
};
