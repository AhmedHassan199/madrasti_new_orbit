"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import TimeSettingsView from "@/components/attendance/TimeSettingsView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function StudentTimeSettingsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إعدادات الوقت — الطلاب" : "Time Settings — Students"}
      subtitle={lang === "ar" ? "ضبط الجدول الزمني لحساب الحضور والتأخير والغياب" : "Configure attendance schedule"}
    >
      <TimeSettingsView
        api={{
          timeSettings:       attendanceApi.students.timeSettings,
          saveTimeSettings:   attendanceApi.students.saveTimeSettings,
          customGroups:       attendanceApi.students.customGroups,
          createCustomGroup:  attendanceApi.students.createCustomGroup,
          updateCustomGroup:  attendanceApi.students.updateCustomGroup,
          deleteCustomGroup:  attendanceApi.students.deleteCustomGroup,
        }}
        employeeType="student"
        roleLabel="طالب"
      />
    </DashboardLayout>
  );
}
