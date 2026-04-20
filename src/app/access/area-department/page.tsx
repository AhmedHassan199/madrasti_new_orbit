"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { accessApi } from "@/lib/access-api";

export default function AreaDepartmentPage() {
  const { lang } = useUi();

  const [form, setForm] = useState({
    department_name: "",
    region: "",
    sector: "",
    school_manager_name: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r: any = await accessApi.departmentGet();
      const d = r?.data ?? r;
      setForm({
        department_name:     d?.department_name ?? "",
        region:              d?.region ?? "",
        sector:              d?.sector ?? "",
        school_manager_name: d?.school_manager_name ?? "",
      });
    } catch { /* noop */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.department_name || !form.region || !form.sector || !form.school_manager_name) {
      setToast({ ok: false, msg: "كل الحقول مطلوبة" });
      return;
    }
    setSaving(true);
    try {
      await accessApi.departmentSave(form);
      setToast({ ok: true, msg: "تم تحديث بيانات الإدارة بنجاح" });
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" });
    } finally { setSaving(false); }
  }

  return (
    <DashboardLayout
      title={lang === "ar" ? "إعدادات المنطقة والإدارة" : "Area & Department Settings"}
      subtitle={lang === "ar" ? "بيانات الإدارة التعليمية والمنطقة والقطاع ومدير المدرسة" : "Education department info"}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {toast && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
            {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          </div>
        )}

        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 24 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
          ) : (
            <>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>
                🏢 بيانات الإدارة
              </h3>

              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={lbl}>اسم الإدارة التعليمية</label>
                  <input type="text" value={form.department_name} onChange={e => setForm({ ...form, department_name: e.target.value })} style={inp} placeholder="مثال: إدارة تعليم الرياض" />
                </div>
                <div>
                  <label style={lbl}>المنطقة</label>
                  <input type="text" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} style={inp} placeholder="مثال: منطقة الرياض" />
                </div>
                <div>
                  <label style={lbl}>القطاع</label>
                  <input type="text" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} style={inp} placeholder="مثال: قطاع بنين / بنات" />
                </div>
                <div>
                  <label style={lbl}>اسم مدير المدرسة</label>
                  <input type="text" value={form.school_manager_name} onChange={e => setForm({ ...form, school_manager_name: e.target.value })} style={inp} placeholder="الاسم الكامل" />
                </div>
              </div>

              <button onClick={save} disabled={saving} style={{
                width: "100%", padding: "12px 16px", marginTop: 18,
                background: saving ? "var(--bg3)" : "var(--accent)", color: "#fff",
                border: 0, borderRadius: 8, fontSize: 14, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? "جاري الحفظ…" : "💾 حفظ البيانات"}
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid var(--brd)", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "var(--bg2)", color: "var(--tx1)" };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--tx2)", marginBottom: 6, fontWeight: 600 };
