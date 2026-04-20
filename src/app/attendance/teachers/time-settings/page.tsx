"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import TimeSettingsView from "@/components/attendance/TimeSettingsView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function TeacherTimeSettingsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إعدادات الوقت — المعلمين" : "Time Settings — Teachers"}
      subtitle={lang === "ar" ? "ضبط الجدول الزمني لحساب الحضور والتأخير والغياب" : "Configure attendance schedule"}
    >
      <TimeSettingsView
        api={{
          timeSettings:       attendanceApi.teachers.timeSettings,
          saveTimeSettings:   attendanceApi.teachers.saveTimeSettings,
          customGroups:       attendanceApi.teachers.customGroups,
          createCustomGroup:  attendanceApi.teachers.createCustomGroup,
          updateCustomGroup:  attendanceApi.teachers.updateCustomGroup,
          deleteCustomGroup:  attendanceApi.teachers.deleteCustomGroup,
        }}
        employeeType="teacher"
        roleLabel="معلم"
      />
    </DashboardLayout>
  );
}
