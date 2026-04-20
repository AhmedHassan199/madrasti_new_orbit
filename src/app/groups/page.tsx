"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import SubGroupsCrudView from "@/components/attendance/SubGroupsCrudView";
import { useUi } from "@/contexts/UiContext";

/**
 * إدارة الفصول (Sub-Groups) — CRUD كامل.
 * الفصل = تقسيم داخل مجموعة أم (مثل "طلاب 3/أ" داخل مجموعة "الصف الثالث").
 */
export default function GroupsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "الفصول" : "Classes"}
      subtitle={lang === "ar" ? "إنشاء وتعديل الفصول داخل المجموعات" : "Manage classes within groups"}
    >
      <SubGroupsCrudView title="الفصول" />
    </DashboardLayout>
  );
}
