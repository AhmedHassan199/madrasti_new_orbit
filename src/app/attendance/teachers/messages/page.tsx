"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import SendAttendanceMessagesView from "@/components/attendance/SendAttendanceMessagesView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

/**
 * رسائل البصمات للمعلمين — إرسال SMS للمعلمين المتأخرين/الغائبين.
 * القوالب ترجع من إعدادات الإرسال (TeacherMessagesSetting).
 */
export default function TeacherMessagesPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إرسال رسائل الغياب والتأخير — المعلمين" : "Send Attendance Messages — Teachers"}
      subtitle={lang === "ar" ? "إرسال رسائل SMS للمعلمين المتأخرين أو الغائبين" : "Send SMS to late/absent teachers"}
    >
      <SendAttendanceMessagesView
        type="teacher"
        roleLabel="المعلمين"
        balanceFetcher={attendanceApi.teachers.messagesBalance}
        sendFetcher={attendanceApi.teachers.sendMessages}
      />
    </DashboardLayout>
  );
}
