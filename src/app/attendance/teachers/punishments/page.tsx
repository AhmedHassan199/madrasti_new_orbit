"use client";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { attendanceApi } from "@/lib/attendance-api";
import { useUi } from "@/contexts/UiContext";

export default function TeacherPunishmentsPage() {
  const { lang } = useUi();
  const today = new Date(); const monthAgo = new Date(today.getTime()-30*86400000);
  const [from, setFrom] = useState(monthAgo.toISOString().slice(0,10));
  const [to, setTo] = useState(today.toISOString().slice(0,10));
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = () => { setLoading(true); attendanceApi.teachers.punishments({from,to}).then((r: any) => setRows(Array.isArray(r) ? r : (r?.data ?? []))).finally(()=>setLoading(false)); };

  return (
    <DashboardLayout title={lang==="ar"?"الحسومات":"Punishments"}>
      <PageCard>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div className="fg" style={{marginBottom:0}}><label className="fl">من</label><input type="date" className="fi" value={from} onChange={e=>setFrom(e.target.value)}/></div>
          <div className="fg" style={{marginBottom:0}}><label className="fl">إلى</label><input type="date" className="fi" value={to} onChange={e=>setTo(e.target.value)}/></div>
          <button className="btn btn-p btn-sm" onClick={load} disabled={loading} type="button">{loading?"جاري…":"بحث"}</button>
        </div>
      </PageCard>
      <PageCard>{!rows.length ? <p style={{color:"var(--tx2)",textAlign:"center",padding:20}}>اضغط بحث لعرض الحسومات</p> :
        <div style={{overflowX:"auto"}}><table className="tbl" style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:800}}>
          <thead><tr style={{background:"var(--bg3)"}}>
            {["الاسم","الرقم","أيام التأخير","مدة التأخير","خصم التأخير","القرار","أيام الغياب","خصم الغياب","القرار","أيام عدم التواجد","المدة","القرار"].map((h,i)=>
              <th key={i} style={{padding:"6px 8px",textAlign:"right",color:"var(--tx2)",fontSize:9,whiteSpace:"nowrap"}}>{h}</th>
            )}
          </tr></thead>
          <tbody>{rows.map((r:any,i:number)=><tr key={i} style={{borderTop:"1px solid var(--brd)"}}>
            <td style={{padding:"6px 8px",fontWeight:600}}>{r.name}</td>
            <td style={{padding:"6px 8px",fontFamily:"var(--fm)",direction:"ltr"}}>{r.identity}</td>
            <td style={{padding:"6px 8px",fontFamily:"var(--fm)",textAlign:"center"}}>{r.late_days}</td>
            <td style={{padding:"6px 8px",fontSize:10}}>{r.late_duration}</td>
            <td style={{padding:"6px 8px",fontFamily:"var(--fm)",textAlign:"center"}}>{r.late_cut_days}</td>
            <td style={{padding:"6px 8px",color:"#DC2626",fontSize:10,fontWeight:700}}>{r.late_decision || "—"}</td>
            <td style={{padding:"6px 8px",fontFamily:"var(--fm)",textAlign:"center"}}>{r.absent_days ?? r.absent_cut_days}</td>
            <td style={{padding:"6px 8px",fontFamily:"var(--fm)",textAlign:"center"}}>{r.absent_cut_days}</td>
            <td style={{padding:"6px 8px",color:"#DC2626",fontSize:10,fontWeight:700}}>{r.absent_decision || "—"}</td>
            <td style={{padding:"6px 8px",fontFamily:"var(--fm)",textAlign:"center"}}>{r.unavailable_days}</td>
            <td style={{padding:"6px 8px",fontSize:10}}>{r.unavailable_duration}</td>
            <td style={{padding:"6px 8px",color:"#DC2626",fontSize:10,fontWeight:700}}>{r.unavailable_decision || "—"}</td>
          </tr>)}</tbody>
        </table></div>
      }</PageCard>
    </DashboardLayout>
  );
}
