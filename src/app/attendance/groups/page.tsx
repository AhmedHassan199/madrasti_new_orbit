"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import GroupsCrudView from "@/components/attendance/GroupsCrudView";
import { useUi } from "@/contexts/UiContext";

export default function AttendanceGroupsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إدارة المجموعات" : "Groups Management"}
      subtitle={lang === "ar" ? "إنشاء وتعديل وحذف المجموعات الأكاديمية (الصفوف، الأقسام)" : "CRUD for academic groups"}
    >
      <GroupsCrudView title="المجموعات" />
    </DashboardLayout>
  );
}
