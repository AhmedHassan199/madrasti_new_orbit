"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import DateRangeActionPage from "@/components/attendance/DateRangeActionPage";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function UpdateTransactionStatusesPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "تحديث حالات البصمات" : "Update Transaction Statuses"}
      subtitle={lang === "ar" ? "إعادة حساب (حاضر/متأخر/غائب) + وقت التأخير لفترة زمنية" : "Recompute status & delay time for a date range"}
    >
      <DateRangeActionPage
        title="تحديث حالات البصمات"
        subtitle="يعيد حساب الحضور والتأخير بناءً على إعدادات الوقت الحالية"
        icon="🔄"
        color="blue"
        buttonLabel="تحديث الحالات"
        confirmMessage="تأكيد بدء تحديث الحالات؟"
        warnings={[
          "العملية تعمل على البصمات اللي بـ punch_state = 1 فقط.",
          "هيتم تحديث status + delay_time بناءً على إعدادات الوقت.",
          "قد تستغرق عدة دقائق حسب حجم البيانات.",
        ]}
        action={attendanceApi.devices.updateStatuses}
      />
    </DashboardLayout>
  );
}
