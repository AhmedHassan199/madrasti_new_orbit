"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import GroupsCrudView from "@/components/attendance/GroupsCrudView";
import { useUi } from "@/contexts/UiContext";

/** مجموعات الطلاب — filtered by type=student */
export default function StudentGroupsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "مجموعات الطلاب" : "Student Groups"}
      subtitle={lang === "ar" ? "إنشاء وتعديل مجموعات (صفوف) الطلاب" : "CRUD for student groups"}
    >
      <GroupsCrudView type="student" title="مجموعات الطلاب" />
    </DashboardLayout>
  );
}
