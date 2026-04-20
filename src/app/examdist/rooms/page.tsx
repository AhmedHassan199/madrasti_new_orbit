"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { examDistApi } from "@/lib/modules-api";

const BLANK = { name: "", capacity: "", floor: "", building: "" };

export default function ExamRoomsPage() {
  const { lang }              = useUi();
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ ...BLANK });
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    examDistApi.rooms({}).then((r: any) => setData(r.data ?? r)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = () => {
    setSaving(true);
    const op = editId ? examDistApi.updateRoom(editId, form) : examDistApi.createRoom(form);
    op.then(() => { load(); setShowForm(false); setForm({ ...BLANK }); setEditId(null); }).finally(() => setSaving(false));
  };

  const handleDelete = (id: number) => {
    if (!confirm(lang === "ar" ? "هل تريد حذف هذه القاعة؟" : "Delete?")) return;
    examDistApi.deleteRoom(id).then(load);
  };

  const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
  const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)", verticalAlign: "middle" };

  return (
    <DashboardLayout title={lang === "ar" ? "قاعات الاختبارات" : "Exam Rooms"}>
      <PageCard
        title={lang === "ar" ? "قاعات الاختبارات" : "Exam Rooms"}
        actions={
          <button className="btn btn-p btn-sm" onClick={() => { setShowForm(true); setForm({ ...BLANK }); setEditId(null); }}>
            + {lang === "ar" ? "قاعة جديدة" : "New Room"}
          </button>
        }
      >
        {showForm && (
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "اسم القاعة" : "Room Name"}</label>
              <input className="fi" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={{ width: 160 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "السعة" : "Capacity"}</label>
              <input className="fi" type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} style={{ width: 100 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "الدور" : "Floor"}</label>
              <input className="fi" value={form.floor} onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))} style={{ width: 100 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "المبنى" : "Building"}</label>
              <input className="fi" value={form.building} onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))} style={{ width: 120 }} />
            </div>
            <button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>{lang === "ar" ? "حفظ" : "Save"}</button>
            <button className="btn btn-g btn-sm" onClick={() => setShowForm(false)}>{lang === "ar" ? "إلغاء" : "Cancel"}</button>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
        ) : !data.length ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد قاعات" : "No rooms"}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>{lang === "ar" ? "اسم القاعة" : "Room Name"}</th>
                  <th style={th}>{lang === "ar" ? "السعة" : "Capacity"}</th>
                  <th style={th}>{lang === "ar" ? "الدور" : "Floor"}</th>
                  <th style={th}>{lang === "ar" ? "المبنى" : "Building"}</th>
                  <th style={th}>{lang === "ar" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                    <td style={td}>{r.id}</td>
                    <td style={{ ...td, fontWeight: 700, color: "var(--tx0)" }}>{r.name}</td>
                    <td style={td}>{r.capacity ?? "—"}</td>
                    <td style={td}>{r.floor ?? "—"}</td>
                    <td style={td}>{r.building ?? "—"}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-g btn-sm" onClick={() => { setForm({ name: r.name, capacity: r.capacity ?? "", floor: r.floor ?? "", building: r.building ?? "" }); setEditId(r.id); setShowForm(true); }}>
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
          </div>
        )}
      </PageCard>
    </DashboardLayout>
  );
}
