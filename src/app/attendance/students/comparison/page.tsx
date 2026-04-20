"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import BiotimeComparisonView from "@/components/attendance/BiotimeComparisonView";
import { useUi } from "@/contexts/UiContext";

export default function StudentComparisonPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "مقارنة الطلاب مع BioTime" : "Student Comparison with BioTime"}
      subtitle={lang === "ar" ? "إضافة أو حذف الطلاب من جهاز البصمة وعرض حالة المزامنة" : "Add/remove students from BioTime and view sync status"}
    >
      <BiotimeComparisonView type="student" roleLabel="الطلاب" />
    </DashboardLayout>
  );
}
