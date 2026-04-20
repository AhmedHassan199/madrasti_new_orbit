"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import DateRangeActionPage from "@/components/attendance/DateRangeActionPage";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function RemoveTransactionsPage() {
  const { lang } = useUi();
  return (
    <DashboardLayout
      title={lang === "ar" ? "حذف البصمات" : "Remove Transactions"}
      subtitle={lang === "ar" ? "حذف كل بصمات الأجهزة في فترة زمنية محددة" : "Delete all device punches in a date range"}
    >
      <DateRangeActionPage
        title="حذف البصمات"
        subtitle="هيتم حذف كل البصمات في النطاق المحدد"
        icon="🗑️"
        color="red"
        buttonLabel="حذف البصمات"
        confirmMessage="⚠️ تأكيد حذف البصمات؟ العملية لا يمكن التراجع عنها!"
        warnings={[
          "العملية نهائية ولا يمكن التراجع.",
          "كل البصمات في الأجهزة التابعة لك هتتحذف في النطاق المحدد.",
          "استخدم هذه الصفحة بحذر شديد.",
        ]}
        action={attendanceApi.devices.removeByRange}
      />
    </DashboardLayout>
  );
}
