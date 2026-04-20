"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";
export default function TeacherUnavailabilitiesPage() {
  const { lang } = useUi();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { attendanceApi.teachers.unavailabilities({}).then((r: any) => setRows(Array.isArray(r) ? r : (r?.data ?? []))); }, []);
  return (
    <DashboardLayout title={lang==="ar"?"عدم التواجد":"Unavailability"}>
      <PageCard>{!rows.length ? <p style={{color:"var(--tx2)",textAlign:"center",padding:20}}>لا توجد بيانات</p> :
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"var(--bg3)"}}>{["المعلم","التاريخ","من","إلى","ملاحظة"].map((h,i)=><th key={i} style={{padding:"8px 12px",textAlign:"right",color:"var(--tx2)",fontSize:10}}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r:any,i:number)=><tr key={i} style={{borderTop:"1px solid var(--brd)"}}>
            <td style={{padding:"8px 12px"}}>{r.transaction?.employee?.name ?? "—"}</td>
            <td style={{padding:"8px 12px",fontFamily:"var(--fm)"}}>{r.date}</td>
            <td style={{padding:"8px 12px",fontFamily:"var(--fm)"}}>{r.time_from}</td>
            <td style={{padding:"8px 12px",fontFamily:"var(--fm)"}}>{r.time_to}</td>
            <td style={{padding:"8px 12px",color:"var(--tx2)"}}>{r.note ?? "—"}</td>
          </tr>)}</tbody>
        </table>
      }</PageCard>
    </DashboardLayout>
  );
}
