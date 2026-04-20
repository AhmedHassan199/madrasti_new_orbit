"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { subUsersApi } from "@/lib/sub-users-api";

const PERM_MODULES = [
  { key: "attendance",  ar: "الحضور",              en: "Attendance" },
  { key: "students",    ar: "الطلاب",              en: "Students" },
  { key: "behavior",    ar: "السلوك",              en: "Behavior" },
  { key: "tasks",       ar: "المهام",              en: "Tasks" },
  { key: "messages",    ar: "الرسائل",             en: "Messages" },
  { key: "summons",     ar: "الاستدعاءات",         en: "Summons" },
  { key: "schedule",    ar: "الجدول الدراسي",      en: "Schedule" },
  { key: "committees",  ar: "اللجان",              en: "Committees" },
  { key: "reports",     ar: "التقارير",             en: "Reports" },
  { key: "forms",       ar: "الاستبيانات",         en: "Forms" },
  { key: "portfolio",   ar: "ملف الإنجاز",        en: "Portfolio" },
  { key: "examdist",    ar: "توزيع الاختبارات",   en: "Exam Dist" },
  { key: "atrisk",      ar: "طلاب في الخطر",      en: "At-Risk" },
  { key: "settings",    ar: "الإعدادات",           en: "Settings" },
];

const PERM_ACTIONS = [
  { key: "view",   ar: "عرض",   en: "View" },
  { key: "create", ar: "إضافة", en: "Create" },
  { key: "edit",   ar: "تعديل", en: "Edit" },
  { key: "delete", ar: "حذف",   en: "Delete" },
];

type PermMatrix = Record<string, Record<string, boolean>>;

export default function PermissionsPage() {
  const { id }                = useParams<{ id: string }>();
  const { lang }              = useUi();
  const [user, setUser]       = useState<any>(null);
  const [perms, setPerms]     = useState<PermMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([subUsersApi.show(id), subUsersApi.permissions(id)])
      .then(([u, p]: any[]) => {
        setUser(u.data ?? u);
        const raw = p.data ?? p ?? {};
        // Build full matrix
        const matrix: PermMatrix = {};
        PERM_MODULES.forEach((m) => {
          matrix[m.key] = {};
          PERM_ACTIONS.forEach((a) => {
            matrix[m.key][a.key] = raw[m.key]?.[a.key] ?? false;
          });
        });
        setPerms(matrix);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const toggle = (mod: string, action: string) => {
    setPerms((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod][action] },
    }));
  };

  const toggleAll = (mod: string, val: boolean) => {
    setPerms((prev) => ({
      ...prev,
      [mod]: Object.fromEntries(PERM_ACTIONS.map((a) => [a.key, val])),
    }));
  };

  const handleSave = () => {
    setSaving(true);
    subUsersApi.updatePermissions(id!, perms)
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .finally(() => setSaving(false));
  };

  const CB = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#E8702A" }}
    />
  );

  return (
    <DashboardLayout title={lang === "ar" ? "صلاحيات المستخدم" : "User Permissions"}>
      {loading ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
      ) : (
        <PageCard
          title={`${lang === "ar" ? "صلاحيات" : "Permissions for"}: ${user?.name ?? id}`}
          actions={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saved && <span style={{ fontSize: 11, color: "#22C55E" }}>{lang === "ar" ? "تم الحفظ ✓" : "Saved ✓"}</span>}
              <button className="btn btn-p btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? (lang === "ar" ? "جاري…" : "Saving…") : (lang === "ar" ? "حفظ" : "Save")}
              </button>
            </div>
          }
        >
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" }}>
                    {lang === "ar" ? "الوحدة" : "Module"}
                  </th>
                  <th style={{ padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "center" }}>
                    {lang === "ar" ? "الكل" : "All"}
                  </th>
                  {PERM_ACTIONS.map((a) => (
                    <th key={a.key} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "center" }}>
                      {lang === "ar" ? a.ar : a.en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_MODULES.map((mod, i) => {
                  const allChecked = PERM_ACTIONS.every((a) => perms[mod.key]?.[a.key]);
                  return (
                    <tr key={mod.key} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                      <td style={{ padding: "9px 12px", fontSize: 12, color: "var(--tx0)", borderBottom: "1px solid var(--brd)", fontWeight: 600 }}>
                        {lang === "ar" ? mod.ar : mod.en}
                      </td>
                      <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--brd)", textAlign: "center" }}>
                        <CB checked={allChecked} onChange={() => toggleAll(mod.key, !allChecked)} />
                      </td>
                      {PERM_ACTIONS.map((a) => (
                        <td key={a.key} style={{ padding: "9px 12px", borderBottom: "1px solid var(--brd)", textAlign: "center" }}>
                          <CB checked={perms[mod.key]?.[a.key] ?? false} onChange={() => toggle(mod.key, a.key)} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}
    </DashboardLayout>
  );
}
