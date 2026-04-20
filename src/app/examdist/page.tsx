"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { examDistApi } from "@/lib/modules-api";
import Link from "next/link";

const BLANK = { name: "", exam_date: "", subject: "", duration: "", notes: "" };

export default function ExamDistPage() {
  const { lang }              = useUi();
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ ...BLANK });
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    examDistApi.sessions({}).then((r: any) => setData(r.data ?? r)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = () => {
    setSaving(true);
    examDistApi.createSession(form)
      .then(() => { load(); setShowForm(false); setForm({ ...BLANK }); })
      .finally(() => setSaving(false));
  };

  const handleDelete = (id: number) => {
    if (!confirm(lang === "ar" ? "هل تريد الحذف؟" : "Delete?")) return;
    examDistApi.deleteSession(id).then(load);
  };

  const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
  const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)", verticalAlign: "middle" };

  return (
    <DashboardLayout title={lang === "ar" ? "توزيع الاختبارات" : "Exam Distribution"}>
      <PageCard
        title={lang === "ar" ? "جلسات الاختبارات" : "Exam Sessions"}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/examdist/rooms" className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>
              {lang === "ar" ? "القاعات" : "Rooms"}
            </Link>
            <Link href="/seatnums" className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>
              {lang === "ar" ? "أرقام الجلوس" : "Seat Numbers"}
            </Link>
            <button className="btn btn-p btn-sm" onClick={() => { setShowForm(true); setForm({ ...BLANK }); }}>
              + {lang === "ar" ? "جلسة جديدة" : "New Session"}
            </button>
          </div>
        }
      >
        {showForm && (
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "اسم الجلسة" : "Session Name"}</label>
              <input className="fi" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={{ width: 180 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "المادة" : "Subject"}</label>
              <input className="fi" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} style={{ width: 140 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "تاريخ الاختبار" : "Exam Date"}</label>
              <input className="fi" type="date" value={form.exam_date} onChange={(e) => setForm((p) => ({ ...p, exam_date: e.target.value }))} style={{ width: 140 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "المدة (دقيقة)" : "Duration (min)"}</label>
              <input className="fi" type="number" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} style={{ width: 110 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "ملاحظات" : "Notes"}</label>
              <input className="fi" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} style={{ width: 180 }} />
            </div>
            <button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>{lang === "ar" ? "حفظ" : "Save"}</button>
            <button className="btn btn-g btn-sm" onClick={() => setShowForm(false)}>{lang === "ar" ? "إلغاء" : "Cancel"}</button>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
        ) : !data.length ? (
          <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد جلسات" : "No sessions"}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>{lang === "ar" ? "اسم الجلسة" : "Session"}</th>
                  <th style={th}>{lang === "ar" ? "المادة" : "Subject"}</th>
                  <th style={th}>{lang === "ar" ? "التاريخ" : "Date"}</th>
                  <th style={th}>{lang === "ar" ? "المدة" : "Duration"}</th>
                  <th style={th}>{lang === "ar" ? "الطلاب" : "Students"}</th>
                  <th style={th}>{lang === "ar" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s: any, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                    <td style={td}>{s.id}</td>
                    <td style={{ ...td, fontWeight: 700, color: "var(--tx0)" }}>{s.name}</td>
                    <td style={td}>{s.subject ?? "—"}</td>
                    <td style={{ ...td, direction: "ltr" }}>{s.exam_date ?? "—"}</td>
                    <td style={td}>{s.duration ? `${s.duration} ${lang === "ar" ? "د" : "min"}` : "—"}</td>
                    <td style={td}>{s.students_count ?? "—"}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/examdist/${s.id}`} className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>
                          {lang === "ar" ? "عرض" : "View"}
                        </Link>
                        <button className="btn btn-sm" style={{ background: "#EF444420", color: "#EF4444", border: "1px solid #EF444440" }} onClick={() => handleDelete(s.id)}>
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
