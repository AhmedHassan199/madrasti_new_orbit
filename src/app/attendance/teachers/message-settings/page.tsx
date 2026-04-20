"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import MessageSettingsView from "@/components/attendance/MessageSettingsView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

/**
 * إعدادات رسائل البصمات — المعلمين
 * منقولة من orbit-fingerprint-user/views/pages/Teacher/messages_setting.blade.php
 */
export default function TeacherMessageSettingsPage() {
  const { lang } = useUi();

  const GENERAL_FLAGS = [
    { key: "send_thank_you_message",       label: "إرسال رسالة شكر لكل معلم لم يتأخر خلال الأسبوع", disabled: true },
    { key: "send_device_offline_message",  label: "إرسال إشعار إذا كانت الأجهزة غير متصلة" },
  ];

  const TEACHER_VARS = ["{mem}", "{Reply2ShortenerLink}", "{day}", "{date}", "{time}"];

  const TEMPLATES = [
    {
      key: "delay_message_template",
      label: "رسالة التأخير",
      defaultText: "الأستاذ الفاضل {mem} حضوركم اليوم {day} {date} الساعة {time} متأخراً عن الطابور الصباحي. نأمل الحضور المبكر.",
      variables: TEACHER_VARS,
    },
    {
      key: "absence_message_template",
      label: "رسالة الغياب",
      defaultText: "الأستاذ الفاضل {mem} نفيدكم علماً أنكم تغيبتم اليوم {day} بتاريخ {date} {Reply2ShortenerLink}",
      variables: TEACHER_VARS,
    },
    {
      key: "no_presence_message_template",
      label: "رسالة عدم التواجد",
      defaultText: "المعلم / {mem} تبين إنصرافكم مبكراً {day} التاريخ {date} الساعة {time} أرجو توضيح الأسباب بالرد على الرابط التالي {Reply2ShortenerLink}",
      variables: TEACHER_VARS,
    },
  ];

  return (
    <DashboardLayout
      title={lang === "ar" ? "إعدادات رسائل البصمات — المعلمين" : "Message Settings — Teachers"}
      subtitle={lang === "ar" ? "تفعيل/تعطيل رسائل الحضور وتخصيص قوالب SMS للمعلمين" : "Configure teacher attendance messages"}
    >
      <MessageSettingsView
        fetcher={attendanceApi.teachers.messageSettings}
        saver={attendanceApi.teachers.saveMessageSettings}
        generalFlags={GENERAL_FLAGS}
        templates={TEMPLATES}
      />
    </DashboardLayout>
  );
}
