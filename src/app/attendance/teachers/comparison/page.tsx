"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BiotimeComparisonView from "@/components/attendance/BiotimeComparisonView";
import { useUi } from "@/contexts/UiContext";

export default function TeacherComparisonPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "مقارنة المعلمين مع BioTime" : "Teacher Comparison with BioTime"}
      subtitle={lang === "ar" ? "إضافة أو حذف المعلمين من جهاز البصمة وعرض حالة المزامنة" : "Add/remove teachers from BioTime and view sync status"}
    >
      <BiotimeComparisonView type="teacher" roleLabel="المعلمين" />
    </DashboardLayout>
  );
}
