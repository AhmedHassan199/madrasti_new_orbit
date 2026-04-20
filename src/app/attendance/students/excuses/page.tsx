"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function StudentExcusesPage() {
  const { lang } = useUi();
  const [excuses, setExcuses] = useState<any[]>([]);
  useEffect(() => { attendanceApi.students.excuses().then((r: any) => setExcuses(Array.isArray(r) ? r : (r?.data ?? []))); }, []);

  return (
    <DashboardLayout title={lang === "ar" ? "الأعذار" : "Excuses"}>
      <PageCard title={lang === "ar" ? "أنواع الأعذار المتاحة" : "Available Excuses"}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {excuses.map((e:any) => (
            <div key={e.id} style={{padding:"10px 14px",background:"var(--bg3)",border:"1px solid var(--brd)",borderRadius:10}}>
              <div style={{fontWeight:700,fontSize:13}}>{e.name}</div>
              <div style={{fontSize:10,color:"var(--tx2)",marginTop:4}}>
                {e.acceptance_status ? (lang==="ar"?"مقبول":"Accepted") : (lang==="ar"?"غير مقبول":"Rejected")}
              </div>
            </div>
          ))}
        </div>
      </PageCard>
    </DashboardLayout>
  );
}
