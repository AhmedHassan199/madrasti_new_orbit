"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SignaturesView from "@/components/attendance/SignaturesView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function StudentSignaturesPage() {
  const { lang } = useUi();
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    attendanceApi.students.daily({ is_search: false }).then((r: any) => setGroups(r?.groups ?? [])).catch(() => {});
  }, []);

  return (
    <DashboardLayout
      title={lang === "ar" ? "توقيعات أجهزة البصمة — الطلاب" : "Fingerprint Signatures — Students"}
      subtitle={lang === "ar" ? "جميع بصمات الطلاب في نطاق زمني" : "All student fingerprint records in range"}
    >
      <SignaturesView
        fetcher={attendanceApi.students.signatures}
        groups={groups}
        roleLabel="الطالب"
        classLabel="الفصل"
      />
    </DashboardLayout>
  );
}
