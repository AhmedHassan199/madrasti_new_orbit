"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import MessageSettingsView from "@/components/attendance/MessageSettingsView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

/**
 * إعدادات رسائل البصمات — الطلاب
 * منقولة من orbit-fingerprint-user/views/pages/student/attendance_messages_setting.blade.php
 */
export default function StudentMessageSettingsPage() {
  const { lang } = useUi();

  const GENERAL_FLAGS = [
    { key: "send_student_arrival_message",    label: "إبلاغ أولياء الأمور عند وصول الطالب (يتطلب تفعيل رسالة التأخير)" },
    { key: "send_thank_you_message",          label: "إرسال رسالة شكر لكل طالب لم يتأخر خلال الأسبوع", disabled: true },
    { key: "send_student_departure_message",  label: "إبلاغ أولياء الأمور عند مغادرة الطالب" },
    { key: "send_device_offline_message",     label: "إبلاغ أولياء الأمور إذا كانت الأجهزة غير متصلة" },
  ];

  const COMMON_VARS = ["{mem}", "{cat}", "{day}", "{date}"];

  const TEMPLATES = [
    { key: "arrival_message_template",                label: "رسالة وصول الطالب",       defaultText: "ابنك/ابنتك {mem} وصل إلى المدرسة اليوم، {day} {date}",       variables: COMMON_VARS },
    { key: "delay_message_template",                  label: "رسالة التأخير",           defaultText: "ابنك/ابنتك {mem} متاخر عن المدرسة اليوم، {day} {date}",     variables: COMMON_VARS },
    { key: "absence_message_template",                label: "رسالة الغياب",            defaultText: "ابنك/ابنتك {mem} غائب عن المدرسة اليوم، {day} {date}",      variables: COMMON_VARS },
    { key: "permission_message_template",             label: "رسالة الاستئذان",          defaultText: "ابنك/ابنتك {mem} حصل على إذن بمغادرة المدرسة اليوم، {day} {date}", variables: COMMON_VARS },
    { key: "unauthorized_departure_message_template", label: "رسالة الانصراف بدون إذن",  defaultText: "ابنك/ابنتك {mem} غادر المدرسة بدون إذن، {day} {date}",      variables: COMMON_VARS },
    { key: "departure_message_template",              label: "رسالة انصراف الطالب",      defaultText: "ابنك/ابنتك {mem} غادر المدرسة اليوم، {day} {date}",         variables: COMMON_VARS },
  ];

  return (
    <DashboardLayout
      title={lang === "ar" ? "إعدادات رسائل البصمات — الطلاب" : "Message Settings — Students"}
      subtitle={lang === "ar" ? "تفعيل/تعطيل رسائل الحضور وتخصيص قوالب SMS" : "Configure attendance message templates"}
    >
      <MessageSettingsView
        fetcher={attendanceApi.students.messageSettings}
        saver={attendanceApi.students.saveMessageSettings}
        generalFlags={GENERAL_FLAGS}
        templates={TEMPLATES}
      />
    </DashboardLayout>
  );
}
