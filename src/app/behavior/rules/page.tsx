"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { behaviorApi } from "@/lib/modules-api";

const BLANK = { name: "", name_ar: "", severity: "low", description: "" };

export default function BehaviorRulesPage() {
  const { lang }              = useUi();
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ ...BLANK });
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    behaviorApi.rules({}).then((r: any) => setData(r.data ?? r)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = () => {
    setSaving(true);
    const op = editId ? behaviorApi.updateRule(editId, form) : behaviorApi.createRule(form);
    op.then(() => { load(); setShowForm(false); setForm({ ...BLANK }); setEditId(null); })
      .finally(() => setSaving(false));
  };

  const handleDelete = (id: number) => {
    if (!confirm(lang === "ar" ? "هل تريد حذف هذه القاعدة؟" : "Delete this rule?")) return;
    behaviorApi.deleteRule(id).then(load);
  };

  const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
  const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)", verticalAlign: "middle" };

  const SEVERITIES = [
    { v: "low", ar: "منخفض", en: "Low" },
    { v: "medium", ar: "متوسط", en: "Medium" },
    { v: "high", ar: "مرتفع", en: "High" },
    { v: "critical", ar: "حرج", en: "Critical" },
  ];

  return (
    <DashboardLayout title={lang === "ar" ? "قواعد السلوك" : "Behavior Rules"}>
      <PageCard
        title={lang === "ar" ? "قواعد السلوك" : "Behavior Rules"}
        actions={
          <button className="btn btn-p btn-sm" onClick={() => { setShowForm(true); setForm({ ...BLANK }); setEditId(null); }}>
            + {lang === "ar" ? "قاعدة جديدة" : "New Rule"}
          </button>
        }
      >
        {showForm && (
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "الاسم (عربي)" : "Name (AR)"}</label>
              <input className="fi" value={form.name_ar} onChange={(e) => setForm((p) => ({ ...p, name_ar: e.target.value }))} style={{ width: 160 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "الاسم (إنجليزي)" : "Name (EN)"}</label>
              <input className="fi" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={{ width: 160 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "الخطورة" : "Severity"}</label>
              <select className="fi" value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))} style={{ width: 130 }}>
                {SEVERITIES.map((s) => <option key={s.v} value={s.v}>{lang === "ar" ? s.ar : s.en}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "الوصف" : "Description"}</label>
              <input className="fi" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ width: 220 }} />
            </div>
            <button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>{lang === "ar" ? "حفظ" : "Save"}</button>
            <button className="btn btn-g btn-sm" onClick={() => setShowForm(false)}>{lang === "ar" ? "إلغاء" : "Cancel"}</button>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
        ) : !data.length ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد بيانات" : "No data"}</p>
        ) : (
          <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>{lang === "ar" ? "الاسم" : "Name"}</th>
                <th style={th}>{lang === "ar" ? "الخطورة" : "Severity"}</th>
                <th style={th}>{lang === "ar" ? "الوصف" : "Description"}</th>
                <th style={th}>{lang === "ar" ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                  <td style={td}>{r.id}</td>
                  <td style={{ ...td, fontWeight: 700, color: "var(--tx0)" }}>{lang === "ar" ? (r.name_ar ?? r.name) : (r.name ?? r.name_ar)}</td>
                  <td style={td}>{r.severity ?? "—"}</td>
                  <td style={{ ...td, maxWidth: 200 }}>{r.description ?? "—"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-g btn-sm" onClick={() => { setForm({ name: r.name ?? "", name_ar: r.name_ar ?? "", severity: r.severity ?? "low", description: r.description ?? "" }); setEditId(r.id); setShowForm(true); }}>
                        {lang === "ar" ? "تعديل" : "Edit"}
                      </button>
                      <button className="btn btn-sm" style={{ background: "#EF444420", color: "#EF4444", border: "1px solid #EF444440" }} onClick={() => handleDelete(r.id)}>
                        {lang === "ar" ? "حذف" : "Del"}
                      </button>
                    </div>
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
