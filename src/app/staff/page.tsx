"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { employeesApi } from "@/lib/employees-api";

const SUBJECTS = [
  { id: "s1", name: "رياضيات",     ico: "📐", color: "#2563EB" },
  { id: "s2", name: "علوم",        ico: "🔬", color: "#059669" },
  { id: "s3", name: "عربي",        ico: "📖", color: "#E8702A" },
  { id: "s4", name: "إسلامية",     ico: "☪️",  color: "#7C3AED" },
  { id: "s5", name: "إنجليزي",     ico: "🌐", color: "#0891B2" },
  { id: "s6", name: "تربية بدنية", ico: "⚽", color: "#D97706" },
  { id: "s7", name: "حاسب",        ico: "💻", color: "#4F46E5" },
  { id: "s8", name: "فنون",        ico: "🎨", color: "#EC4899" },
  { id: "s9", name: "اجتماعيات",   ico: "🌍", color: "#16A34A" },
];

const CLASSES = ["1/أ","1/ب","1/ج","2/أ","2/ب","3/أ","3/ب","4/أ","4/ب"];
const GRADES  = ["الصف الأول","الصف الثاني","الصف الثالث","الصف الرابع"];

const ROLES: Record<string, { ar: string; color: string }> = {
  principal: { ar: "مدير المدرسة",  color: "#E8702A" },
  vp:        { ar: "وكيل المدرسة",  color: "#2563EB" },
  teacher:   { ar: "معلم",          color: "#059669" },
  counselor: { ar: "مرشد طلابي",   color: "#7C3AED" },
  admin:     { ar: "إداري",         color: "#6B7280" },
};

const PERMISSIONS = [
  { id: "p_att",      group: "الحضور",    ar: "تسجيل الحضور والغياب" },
  { id: "p_att_view", group: "الحضور",    ar: "عرض تقارير الحضور" },
  { id: "p_behavior", group: "السلوك",    ar: "تسجيل المخالفات السلوكية" },
  { id: "p_beh_close",group: "السلوك",    ar: "إغلاق المخالفات" },
  { id: "p_grades",   group: "الأكاديمي", ar: "رصد الدرجات" },
  { id: "p_exams",    group: "الأكاديمي", ar: "إدارة الاختبارات" },
  { id: "p_notify",   group: "التواصل",   ar: "إرسال إشعارات WhatsApp" },
  { id: "p_sms",      group: "التواصل",   ar: "إرسال رسائل SMS" },
  { id: "p_summon",   group: "التواصل",   ar: "إصدار استدعاءات" },
  { id: "p_portfolio",group: "الملفات",   ar: "تعديل ملفات الطلاب" },
  { id: "p_reports",  group: "الإدارة",   ar: "عرض التقارير الإدارية" },
  { id: "p_staff",    group: "الإدارة",   ar: "إدارة الكادر التعليمي" },
  { id: "p_settings", group: "الإدارة",   ar: "تعديل إعدادات النظام" },
  { id: "p_schedule", group: "الجداول",   ar: "تعديل الجدول الدراسي" },
  { id: "p_comm",     group: "اللجان",    ar: "إدارة اللجان المدرسية" },
];

interface StaffHistory { date: string; action: string; by: string; }
interface StaffMember {
  id: string; name: string; role: string; status: string; color: string;
  subjects: string[]; classes: string[];
  phone: string; email: string; nationalId: string;
  joinDate: string; qualif: string; experience: number; attendance: number;
  permissions: string[]; notes: string; history: StaffHistory[];
}

const INITIAL_STAFF: StaffMember[]= [];

const subMap = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));

function attColor(a: number) { return a >= 95 ? "#22C55E" : a >= 85 ? "#F59E0B" : "#EF4444"; }

export default function StaffPage() {
  useUi();

  const [staff, setStaff]           = useState<any[]>(INITIAL_STAFF);

  useEffect(() => {
    employeesApi.teachers({ per_page: 50 }).then((r: any) => {
      const arr: any[] = r.data ?? r ?? [];
      if (Array.isArray(arr) && arr.length > 0) {
        setStaff(arr.map((s: any) => ({
          id: String(s.id ?? Math.random()),
          name: s.name ?? s.employee_name ?? s.full_name ?? "—",
          role: s.role ?? s.job_title ?? "teacher",
          status: s.status ?? "active",
          color: s.color ?? "#059669",
          subjects: Array.isArray(s.subjects) ? s.subjects : [],
          classes: Array.isArray(s.classes) ? s.classes : (Array.isArray(s.classrooms) ? s.classrooms : []),
          phone: s.phone ?? s.mobile ?? "—",
          email: s.email ?? "—",
          nationalId: s.national_id ?? s.nationalId ?? "—",
          joinDate: s.join_date ?? s.joinDate ?? s.created_at?.slice(0, 10) ?? "—",
          qualif: s.qualif ?? s.qualification ?? "—",
          experience: s.experience ?? s.years_experience ?? 0,
          attendance: s.attendance ?? s.attendance_rate ?? 0,
          permissions: Array.isArray(s.permissions) ? s.permissions : [],
          notes: s.notes ?? "",
          history: Array.isArray(s.history) ? s.history : [],
        })));
      }
    }).catch(() => {});
  }, []);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [addMode, setAddMode]       = useState(false);
  const [drawerTab, setDrawerTab]   = useState("profile");
  const [editPerms, setEditPerms]   = useState<string[]>([]);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState<Record<string, any>>({
    name: "", role: "teacher", phone: "", email: "", national_id: "",
    qualif: "", experience: 0, status: "active",
  });
  const setF = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function saveNewMember() {
    if (!form.name) return alert("الرجاء إدخال الاسم");
    if (!form.phone) return alert("الرجاء إدخال رقم الجوال");
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        national_id: form.national_id || null,
        type: "teacher",
      };
      const r: any = await employeesApi.create(payload);
      const created = r.data ?? r;
      setStaff(prev => [{
        id: String(created.id ?? Date.now()),
        name: created.name, role: form.role, status: "active", color: "#059669",
        subjects: [], classes: [], phone: created.phone ?? form.phone,
        email: created.email ?? "—", nationalId: created.national_id ?? "—",
        joinDate: created.created_at?.slice(0, 10) ?? "—", qualif: "—",
        experience: 0, attendance: 0, permissions: [], notes: "", history: [],
      }, ...prev]);
      setForm({ name: "", role: "teacher", phone: "", email: "", national_id: "", qualif: "", experience: 0, status: "active" });
      closeDrawer();
    } catch (e: any) {
      alert("تعذّر الحفظ: " + (e?.message ?? "خطأ غير معروف"));
    } finally {
      setSaving(false);
    }
  }

  async function saveMemberProfile() {
    if (!member) return;
    setSaving(true);
    try {
      await employeesApi.update(member.id, {
        name: form.name || member.name,
        phone: form.phone || member.phone,
        email: form.email || member.email,
      });
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, ...form } : s));
    } catch (e: any) {
      alert("تعذّر حفظ التعديلات");
    } finally { setSaving(false); }
  }

  async function deleteMember(id: string) {
    if (!confirm("متأكد من حذف هذا العضو؟")) return;
    try {
      await employeesApi.delete(id);
      setStaff(prev => prev.filter(s => s.id !== id));
      closeDrawer();
    } catch { alert("تعذّر الحذف"); }
  }

  async function savePermissions() {
    if (!member) return;
    setSaving(true);
    try {
      // Permissions are represented as an array of permission keys in employees.permissions
      await employeesApi.update(member.id, { permissions: editPerms });
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, permissions: [...editPerms] } : s));
      alert("تم حفظ الصلاحيات");
    } catch { alert("تعذّر حفظ الصلاحيات"); }
    finally { setSaving(false); }
  }

  async function saveAssignment() {
    if (!member) return;
    setSaving(true);
    try {
      await employeesApi.update(member.id, {
        subjects: member.subjects,
        classes:  member.classes,
      });
      alert("تم حفظ الإسناد");
    } catch { alert("تعذّر حفظ الإسناد"); }
    finally { setSaving(false); }
  }

  const stats = useMemo(() => ({
    total:   staff.length,
    teachers: staff.filter(s => s.role === "teacher").length,
    active:  staff.filter(s => s.status === "active").length,
    leave:   staff.filter(s => s.status === "leave").length,
    avgAtt:  staff.length ? Math.round(staff.reduce((a, s) => a + (s.attendance || 0), 0) / staff.length) : 0,
  }), [staff]);

  const shown = useMemo(() => {
    let list = staff.slice();
    if (filter === "leave")   list = list.filter(s => s.status === "leave");
    else if (filter === "admin")   list = list.filter(s => ["admin","counselor"].includes(s.role));
    else if (filter !== "all") list = list.filter(s => s.role === filter);
    if (search) list = list.filter(s =>
      s.name.includes(search) || s.email.includes(search) || s.phone.includes(search) ||
      (ROLES[s.role]?.ar || "").includes(search) ||
      s.subjects.some((sid: any) => subMap[sid]?.name.includes(search))
    );
    return list;
  }, [staff, filter, search]);

  const member = editId ? staff.find(s => s.id === editId) || null : null;

  function openDrawer(id: string) {
    setEditId(id);
    setAddMode(false);
    setDrawerTab("profile");
    const m = staff.find(s => s.id === id);
    if (m) {
      setEditPerms([...m.permissions]);
      setForm({
        name: m.name, role: m.role, phone: m.phone,
        email: m.email === "—" ? "" : m.email,
        national_id: m.nationalId === "—" ? "" : m.nationalId,
        qualif: m.qualif, experience: m.experience, status: m.status,
      });
    }
    setDrawerOpen(true);
  }
  function openAdd() {
    setEditId(null);
    setAddMode(true);
    setDrawerTab("profile");
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => { setEditId(null); setAddMode(false); }, 280);
  }
  function togglePerm(permId: string) {
    setEditPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  }
  async function toggleStatus(id: string) {
    const cur = staff.find(s => s.id === id);
    if (!cur) return;
    const next = cur.status === "active" ? "leave" : "active";
    setStaff(prev => prev.map(s => s.id === id ? { ...s, status: next } : s));
    try {
      await employeesApi.update(id, { status: next });
    } catch { /* silent revert-on-fail is noisy; keep optimistic for now */ }
  }

  const permGroups = [...new Set(PERMISSIONS.map(p => p.group))];

  return (
    <DashboardLayout title="الكادر التعليمي والإداري" subtitle="إدارة أعضاء الكادر وصلاحياتهم">

      {/* Drawer overlay */}
      {drawerOpen && (
        <div onClick={closeDrawer} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          zIndex: 200, backdropFilter: "blur(2px)",
        }} />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: drawerOpen ? 0 : "-520px",
        width: 500, height: "100vh", background: "var(--bg1)",
        borderLeft: "1.5px solid var(--brd)", boxShadow: "-4px 0 24px rgba(0,0,0,.13)",
        zIndex: 201, display: "flex", flexDirection: "column",
        transition: "right 0.28s cubic-bezier(.4,0,.2,1)",
      }}>
        {addMode ? (
          <>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>إضافة عضو جديد</div>
              <button onClick={closeDrawer} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "var(--bg3)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الاسم الكامل *</label>
                <input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="الاسم الكامل بالعربية" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>المنصب *</label>
                  <select value={form.role} onChange={e => setF("role", e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none" }}>
                    {Object.entries(ROLES).map(([id, r]) => <option key={id} value={id}>{r.ar}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>رقم الجوال *</label>
                  <input type="tel" value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="05xxxxxxxx" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>البريد الإلكتروني</label>
                  <input type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="example@school.edu.sa" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>رقم الهوية</label>
                  <input value={form.national_id} onChange={e => setF("national_id", e.target.value)} placeholder="10 أرقام" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
                </div>
              </div>
              <div style={{ padding: "10px 13px", background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--brd)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5 }}>🔐 الصلاحيات ستُعيَّن تلقائياً حسب المنصب</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>يمكن تعديلها بعد الحفظ من تبويب الصلاحيات</div>
              </div>
            </div>
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--brd)", display: "flex", gap: 7, flexShrink: 0 }}>
              <button onClick={saveNewMember} disabled={saving} style={{ flex: 1, padding: "9px 16px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري الحفظ…" : "حفظ العضو"}</button>
              <button onClick={closeDrawer} style={{ padding: "9px 16px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>إلغاء</button>
            </div>
          </>
        ) : member ? (
          <>
            {/* Member header */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ padding: "18px 20px 14px", background: `${member.color}12`, borderBottom: "1px solid var(--brd)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 14,
                      background: member.color, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, fontWeight: 900, color: "#fff",
                    }}>{member.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{member.name}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 11, padding: "2px 9px", borderRadius: 6, fontWeight: 700,
                          background: `${ROLES[member.role]?.color}18`,
                          color: ROLES[member.role]?.color,
                          border: `1px solid ${ROLES[member.role]?.color}33`,
                        }}>{ROLES[member.role]?.ar || member.role}</span>
                        <span style={{
                          fontSize: 11, padding: "2px 9px", borderRadius: 6, fontWeight: 700,
                          background: member.status === "active" ? "#ECFDF5" : "#FFFBEB",
                          color: member.status === "active" ? "#059669" : "#B45309",
                          border: `1px solid ${member.status === "active" ? "#A7F3D0" : "#FCD34D"}`,
                        }}>{member.status === "active" ? "● نشط" : "⏸ إجازة"}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 4 }}>
                        🎓 {member.qualif} · {member.experience} سنوات خبرة · انضم {member.joinDate}
                      </div>
                    </div>
                  </div>
                  <button onClick={closeDrawer} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(0,0,0,.08)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              </div>
              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--brd)", overflowX: "auto", background: "var(--bg1)" }}>
                {[
                  { id: "profile",     ar: "الملف الشخصي",  ico: "👤" },
                  { id: "assign",      ar: "المواد والفصول", ico: "📚" },
                  { id: "permissions", ar: "الصلاحيات",      ico: "🔐" },
                  { id: "history",     ar: "السجل",           ico: "📋" },
                ].map(t => (
                  <button key={t.id} onClick={() => setDrawerTab(t.id)} style={{
                    padding: "9px 14px", border: "none", background: "none",
                    fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                    color: drawerTab === t.id ? "#E8702A" : "var(--tx2)",
                    borderBottom: `2px solid ${drawerTab === t.id ? "#E8702A" : "transparent"}`,
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}>{t.ico} {t.ar}</button>
                ))}
              </div>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {drawerTab === "profile" && (
                <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 13 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الاسم الكامل</label>
                    <input defaultValue={member.name} onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>المنصب</label>
                      <select defaultValue={member.role} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none" }}>
                        {Object.entries(ROLES).map(([id, r]) => <option key={id} value={id}>{r.ar}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>الحالة</label>
                      <select defaultValue={member.status} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none" }}>
                        <option value="active">نشط</option>
                        <option value="leave">في إجازة</option>
                        <option value="inactive">غير نشط</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>رقم الجوال</label>
                      <input defaultValue={member.phone} type="tel" onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>البريد الإلكتروني</label>
                      <input defaultValue={member.email} type="email" onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>المؤهل العلمي</label>
                      <input defaultValue={member.qualif} onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>سنوات الخبرة</label>
                      <input defaultValue={member.experience} type="number" min={0} max={40} onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
                    </div>
                  </div>
                  {member.notes && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>ملاحظات</label>
                      <textarea defaultValue={member.notes} onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", resize: "vertical", minHeight: 65, outline: "none" }} />
                    </div>
                  )}
                  {/* Quick stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {[
                      { v: `${member.attendance}%`, l: "نسبة الحضور",  bg: "#FEF3E8", c: "#E8702A" },
                      { v: String(member.classes.length), l: "فصل مُسنَد",      bg: "#EFF6FF", c: "#2563EB" },
                      { v: String(member.permissions.length), l: "صلاحية",           bg: "#ECFDF5", c: "#059669" },
                    ].map(st => (
                      <div key={st.l} style={{ padding: "11px 13px", borderRadius: 10, background: st.bg, textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: st.c }}>{st.v}</div>
                        <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{st.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {drawerTab === "assign" && (
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>المواد الدراسية المُسنَدة</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                      {SUBJECTS.map(s => {
                        const on = member.subjects.includes(s.id);
                        return (
                          <div key={s.id} style={{
                            padding: "10px 8px", border: `2px solid ${on ? s.color : "var(--brd)"}`,
                            borderRadius: 10, textAlign: "center", cursor: "pointer",
                            background: on ? `${s.color}15` : "var(--bg1)",
                          }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.ico}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: on ? s.color : "var(--tx1)" }}>{s.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ height: 1, background: "var(--brd)" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>الفصول المُسنَدة</div>
                    {GRADES.map((grade, gi) => {
                      const clsInGrade = CLASSES.filter(c => c.startsWith((gi + 1) + "/"));
                      return (
                        <div key={grade} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 6 }}>{grade}</div>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {clsInGrade.map(cls => {
                              const on = member.classes.includes(cls);
                              return (
                                <div key={cls} style={{
                                  padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                                  border: `1.5px solid ${on ? "#E8702A" : "var(--brd)"}`,
                                  background: on ? "#FEF3E8" : "var(--bg1)",
                                  color: on ? "#E8702A" : "var(--tx2)",
                                  cursor: "pointer",
                                }}>{cls}</div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {drawerTab === "permissions" && (
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ padding: "10px 13px", background: "#FEF3E8", border: "1px solid rgba(232,112,42,.25)", borderRadius: 10, marginBottom: 14, fontSize: 12 }}>
                    🔐 صلاحيات <strong>{member.name}</strong> كـ <strong>{ROLES[member.role]?.ar}</strong> · يمكنك تخصيصها بشكل فردي
                  </div>
                  {permGroups.map(group => {
                    const groupPerms = PERMISSIONS.filter(p => p.group === group);
                    return (
                      <div key={group} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--tx2)", marginBottom: 6, paddingBottom: 5, borderBottom: "1px solid var(--brd)" }}>
                          {group}
                        </div>
                        <div style={{ border: "1.5px solid var(--brd)", borderRadius: 10, overflow: "hidden" }}>
                          {groupPerms.map((p, i) => {
                            const on = editPerms.includes(p.id);
                            return (
                              <div key={p.id} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "11px 14px",
                                borderBottom: i < groupPerms.length - 1 ? "1px solid var(--brd)" : "none",
                              }}>
                                <div>
                                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.ar}</div>
                                  <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 1 }}>ID: {p.id}</div>
                                </div>
                                {/* Toggle switch */}
                                <div
                                  onClick={() => togglePerm(p.id)}
                                  style={{
                                    width: 40, height: 22, borderRadius: 11, cursor: "pointer",
                                    background: on ? "#E8702A" : "var(--brd2)",
                                    position: "relative", transition: "background .2s", flexShrink: 0,
                                  }}
                                >
                                  <div style={{
                                    position: "absolute", top: 3,
                                    right: on ? 3 : "auto", left: on ? "auto" : 3,
                                    width: 16, height: 16, borderRadius: "50%",
                                    background: "#fff", transition: "all .2s",
                                  }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {drawerTab === "history" && (
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx2)", marginBottom: 12 }}>
                    {member.history.length} إجراء مسجل
                  </div>
                  {member.history.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--tx2)" }}>
                      <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>📋</div>
                      <span>لا يوجد سجل بعد</span>
                    </div>
                  ) : (
                    <div style={{ border: "1.5px solid var(--brd)", borderRadius: 11, overflow: "hidden" }}>
                      {member.history.map((h: any, i: number) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                          borderBottom: i < member.history.length - 1 ? "1px solid var(--brd)" : "none",
                        }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📌</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{h.action}</div>
                            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>بواسطة: {h.by}</div>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--tx2)", fontFamily: "var(--fm)", flexShrink: 0 }}>{h.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer footer */}
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--brd)", display: "flex", gap: 7, flexShrink: 0 }}>
              {drawerTab === "profile" ? (
                <>
                  <button onClick={saveMemberProfile} disabled={saving} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري..." : "حفظ التعديلات"}</button>
                  <button onClick={() => toggleStatus(member.id)} style={{
                    padding: "9px 14px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                    background: member.status === "active" ? "#FFFBEB" : "#ECFDF5",
                    color: member.status === "active" ? "#B45309" : "#059669",
                    border: `1px solid ${member.status === "active" ? "#FCD34D" : "#A7F3D0"}`,
                  }}>{member.status === "active" ? "⏸ إجازة" : "✓ تفعيل"}</button>
                  <button onClick={() => deleteMember(member.id)} style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>🗑</button>
                </>
              ) : drawerTab === "assign" ? (
                <button onClick={saveAssignment} disabled={saving} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري..." : "حفظ الإسناد"}</button>
              ) : drawerTab === "permissions" ? (
                <>
                  <button onClick={savePermissions} disabled={saving} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري..." : "حفظ الصلاحيات"}</button>
                  <button onClick={() => setEditPerms([...(member?.permissions ?? [])])} style={{ padding: "9px 14px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>استعادة افتراضي</button>
                </>
              ) : (
                <button onClick={closeDrawer} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>إغلاق</button>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>الكادر التعليمي والإداري</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
            {stats.total} عضو · {stats.active} نشط
            {stats.leave > 0 && <span style={{ color: "#B45309", fontWeight: 700 }}> · {stats.leave} في إجازة</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button style={{ padding: "8px 14px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>📊 تصدير</button>
          <button onClick={openAdd} style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            إضافة عضو
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: stats.total,   ar: "إجمالي الكادر", c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
          { v: stats.teachers,ar: "معلمون",         c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
          { v: stats.active,  ar: "نشطون",          c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
          { v: stats.leave,   ar: "في إجازة",       c: stats.leave > 0 ? "#B45309" : "#059669", bg: stats.leave > 0 ? "#FFFBEB" : "#ECFDF5", brd: stats.leave > 0 ? "#FCD34D" : "#A7F3D0" },
          { v: `${stats.avgAtt}%`, ar: "متوسط الحضور", c: stats.avgAtt >= 95 ? "#059669" : "#B45309", bg: stats.avgAtt >= 95 ? "#ECFDF5" : "#FFFBEB", brd: stats.avgAtt >= 95 ? "#A7F3D0" : "#FCD34D" },
        ].map(s => (
          <div key={s.ar} style={{ background: s.bg, border: `1px solid ${s.brd}`, borderRadius: 11, padding: "10px 13px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.ar}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 9, marginBottom: 13, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => { e.currentTarget.style.borderColor = "#E8702A"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--brd)"; }}
            placeholder="بحث بالاسم أو المادة أو رقم الهاتف..."
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", paddingRight: 33, border: "1.5px solid var(--brd)", borderRadius: 10, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[
            { id: "all",     ar: "الكل" },
            { id: "teacher", ar: "معلمون" },
            { id: "admin",   ar: "إداريون" },
            { id: "leave",   ar: "في إجازة" },
          ].map(f => {
            const on = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1.5px solid ${on ? "#E8702A" : "var(--brd)"}`,
                background: on ? "#E8702A" : "var(--bg1)",
                color: on ? "#fff" : "var(--tx2)",
                cursor: "pointer", fontFamily: "inherit",
              }}>{f.ar}</button>
            );
          })}
        </div>
      </div>

      {/* Staff list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {shown.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center", color: "var(--tx2)", background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14 }}>
            <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>لا يوجد كادر في هذا التصنيف</div>
          </div>
        ) : shown.map(m => {
          const role = ROLES[m.role];
          const subs = m.subjects.map((sid: any) => subMap[sid]).filter(Boolean);
          const ac = attColor(m.attendance);
          const isSel = editId === m.id && drawerOpen;
          return (
            <div
              key={m.id}
              onClick={() => openDrawer(m.id)}
              style={{
                background: "var(--bg1)",
                border: `1.5px solid ${isSel ? "#E8702A" : "var(--brd)"}`,
                borderRadius: 13, boxShadow: "var(--card-sh)",
                cursor: "pointer", overflow: "hidden", display: "flex",
              }}
            >
              {/* Left accent */}
              <div style={{ width: 4, background: m.color, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  {/* Left: avatar + info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 11,
                      background: m.color, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0,
                    }}>{m.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 2 }}>{m.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                          background: `${role?.color}18`, color: role?.color, border: `1px solid ${role?.color}33`,
                        }}>{role?.ar || m.role}</span>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                          background: m.status === "active" ? "#ECFDF5" : "#FFFBEB",
                          color: m.status === "active" ? "#059669" : "#B45309",
                          border: `1px solid ${m.status === "active" ? "#A7F3D0" : "#FCD34D"}`,
                        }}>{m.status === "active" ? "● نشط" : "⏸ إجازة"}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span>📱 {m.phone}</span>
                        <span>✉️ {m.email}</span>
                        {m.experience > 0 && <span>🎓 {m.experience} سنوات خبرة</span>}
                      </div>
                    </div>
                  </div>
                  {/* Right: subjects + classes + attendance */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {subs.length > 0
                        ? subs.map((s: any) => (
                          <span key={s!.id} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, fontWeight: 700, background: `${s!.color}18`, color: s!.color, border: `1px solid ${s!.color}33` }}>
                            {s!.ico} {s!.name}
                          </span>
                        ))
                        : <span style={{ fontSize: 10, color: "var(--tx2)", fontStyle: "italic" }}>بدون مادة</span>
                      }
                    </div>
                    {m.classes.length > 0 && (
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {m.classes.slice(0, 5).map((cls: any) => (
                          <span key={cls} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "var(--bg3)", color: "var(--tx2)", border: "1px solid var(--brd)" }}>{cls}</span>
                        ))}
                        {m.classes.length > 5 && <span style={{ fontSize: 10, color: "var(--tx2)" }}>+{m.classes.length - 5}</span>}
                      </div>
                    )}
                    <div style={{ minWidth: 80 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                        <span style={{ color: "var(--tx2)" }}>الحضور</span>
                        <span style={{ fontWeight: 800, color: ac }}>{m.attendance}%</span>
                      </div>
                      <div style={{ height: 5, background: "var(--brd2)", borderRadius: 3, overflow: "hidden", width: 80 }}>
                        <div style={{ height: "100%", background: ac, borderRadius: 3, width: `${m.attendance}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
