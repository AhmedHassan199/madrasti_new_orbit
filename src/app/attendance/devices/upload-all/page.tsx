"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import DateRangeActionPage from "@/components/attendance/DateRangeActionPage";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function UploadAllTransactionsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "رفع كل البصمات" : "Upload All Transactions"}
      subtitle={lang === "ar" ? "جدولة سحب بصمات كل الأجهزة يوم-يوم" : "Schedule day-by-day fetch for all devices"}
    >
      <DateRangeActionPage
        title="رفع كل البصمات"
        subtitle="يتم جدولة job منفصل لكل يوم في النطاق"
        icon="⬆️"
        color="green"
        buttonLabel="رفع"
        confirmMessage="تأكيد بدء رفع البصمات للفترة المحددة؟"
        warnings={[
          "العملية تعمل في الخلفية ممكن تاخد دقائق لكل يوم.",
          "محصور لكل 10 دقائق لكل مستخدم.",
          "تأكد من اتصال سيرفر BioTime.",
        ]}
        action={attendanceApi.devices.uploadAll}
      />
    </DashboardLayout>
  );
}
