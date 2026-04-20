"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { subUsersApi } from "@/lib/sub-users-api";
import Link from "next/link";

const BLANK = { name: "", email: "", password: "", role: "teacher" };

export default function SubUsersPage() {
  const { lang }              = useUi();
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ ...BLANK });
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    subUsersApi.list({}).then((r: any) => setData(r.data ?? r)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = () => {
    setSaving(true);
    const op = editId ? subUsersApi.update(editId, form) : subUsersApi.create(form);
    op.then(() => { load(); setShowForm(false); setForm({ ...BLANK }); setEditId(null); })
      .finally(() => setSaving(false));
  };

  const handleDelete = (id: number) => {
    if (!confirm(lang === "ar" ? "هل تريد حذف هذا المستخدم؟" : "Delete this user?")) return;
    subUsersApi.delete(id).then(load);
  };

  const startEdit = (u: any) => {
    setForm({ name: u.name, email: u.email, password: "", role: u.role ?? "teacher" });
    setEditId(u.id);
    setShowForm(true);
  };

  const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
  const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)", verticalAlign: "middle" };

  const ROLES = [
    { v: "teacher",   ar: "معلم",           en: "Teacher" },
    { v: "counselor", ar: "مرشد طلابي",     en: "Counselor" },
    { v: "vice",      ar: "وكيل",           en: "Vice Principal" },
  ];

  return (
    <DashboardLayout title={lang === "ar" ? "المستخدمون الفرعيون" : "Sub-users"}>
      <PageCard
        title={lang === "ar" ? "المستخدمون الفرعيون" : "Sub-users"}
        actions={
          <button className="btn btn-p btn-sm" onClick={() => { setShowForm(true); setForm({ ...BLANK }); setEditId(null); }}>
            + {lang === "ar" ? "مستخدم جديد" : "New User"}
          </button>
        }
      >
        {/* Form */}
        {showForm && (
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "الاسم" : "Name"}</label>
              <input className="fi" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={{ width: 160 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "البريد" : "Email"}</label>
              <input className="fi" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} style={{ width: 180 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "كلمة المرور" : "Password"}</label>
              <input className="fi" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} style={{ width: 140 }} />
            </div>
            <div className="fg">
              <label className="fl">{lang === "ar" ? "الدور" : "Role"}</label>
              <select className="fi" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} style={{ width: 140 }}>
                {ROLES.map((r) => <option key={r.v} value={r.v}>{lang === "ar" ? r.ar : r.en}</option>)}
              </select>
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
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>{lang === "ar" ? "الاسم" : "Name"}</th>
                  <th style={th}>{lang === "ar" ? "البريد" : "Email"}</th>
                  <th style={th}>{lang === "ar" ? "الدور" : "Role"}</th>
                  <th style={th}>{lang === "ar" ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u: any, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                    <td style={td}>{u.id}</td>
                    <td style={{ ...td, fontWeight: 700, color: "var(--tx0)" }}>{u.name}</td>
                    <td style={{ ...td, direction: "ltr" }}>{u.email}</td>
                    <td style={td}>{u.role ?? "—"}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/staff/sub-users/${u.id}/permissions`} className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>
                          {lang === "ar" ? "الصلاحيات" : "Perms"}
                        </Link>
                        <button className="btn btn-g btn-sm" onClick={() => startEdit(u)}>{lang === "ar" ? "تعديل" : "Edit"}</button>
                        <button className="btn btn-sm" style={{ background: "#EF444420", color: "#EF4444", border: "1px solid #EF444440" }} onClick={() => handleDelete(u.id)}>
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
