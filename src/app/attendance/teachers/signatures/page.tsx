"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SignaturesView from "@/components/attendance/SignaturesView";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function TeacherSignaturesPage() {
  const { lang } = useUi();
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    attendanceApi.teachers.daily({ is_search: false }).then((r: any) => setGroups(r?.groups ?? [])).catch(() => {});
  }, []);

  return (
    <DashboardLayout
      title={lang === "ar" ? "توقيعات أجهزة البصمة — المعلمين" : "Fingerprint Signatures — Teachers"}
      subtitle={lang === "ar" ? "جميع بصمات المعلمين في نطاق زمني" : "All teacher fingerprint records in range"}
    >
      <SignaturesView
        fetcher={attendanceApi.teachers.signatures}
        groups={groups}
        roleLabel="المعلم"
        classLabel="المجموعة"
      />
    </DashboardLayout>
  );
}
