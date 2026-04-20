"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import SendAttendanceMessagesView from "@/components/attendance/SendAttendanceMessagesView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

/**
 * رسائل البصمات للطلاب — إرسال رسائل SMS لأولياء أمور الطلاب بناءً على حالة البصمة
 * (متأخر / غائب / مستأذن). الرصيد وقوالب الرسائل من إعدادات المستخدم.
 */
export default function StudentMessagesPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "إرسال رسائل الغياب والتأخير — الطلاب" : "Send Attendance Messages — Students"}
      subtitle={lang === "ar" ? "إرسال رسائل SMS لأولياء أمور الطلاب المتأخرين/الغائبين/المستأذنين" : "Send SMS to parents of late/absent/excused students"}
    >
      <SendAttendanceMessagesView
        type="student"
        roleLabel="الطلاب"
        balanceFetcher={attendanceApi.students.messagesBalance}
        sendFetcher={attendanceApi.students.sendMessages}
      />
    </DashboardLayout>
  );
}
