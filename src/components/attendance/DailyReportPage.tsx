"use client";

import { useState, useEffect } from "react";
import { useUi } from "@/contexts/UiContext";
import AttendanceTable from "./AttendanceTable";
import PageCard from "./PageCard";
import DateFilter from "./DateFilter";
import GroupFilter from "./GroupFilter";
import { ApiError } from "@/lib/api";

type FetcherResponse = {
  data: { date: string; transactions: any[]; count: number }[];
  groups: { id: number; name: string }[];
  meta?: { current_page: number; has_more: boolean; per_page: number };
};

interface Props {
  fetcher: (params: Record<string, any>) => Promise<FetcherResponse>;
  initialDate?: string;
  showGroupFilter?: boolean;
  showStatusFilter?: boolean;
}

export default function DailyReportPage({
  fetcher,
  initialDate,
  showGroupFilter = true,
  showStatusFilter = false,
}: Props) {
  const { lang } = useUi();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(initialDate ?? today);
  const [classSection, setClassSection] = useState<string>("");
  const [employeeName, setEmployeeName] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [data, setData] = useState<FetcherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetcher({
        start_date: date,
        class_section: classSection || undefined,
        employee_name: employeeName || undefined,
        status: showStatusFilter ? status : undefined,
        is_search: true,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (lang === "ar" ? "خطأ في تحميل البيانات" : "Failed to load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageCard>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <DateFilter value={date} onChange={setDate} />

          {showGroupFilter && data?.groups && (
            <GroupFilter value={classSection} onChange={setClassSection} groups={data.groups} />
          )}

          <div className="fg" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label className="fl">{lang === "ar" ? "اسم الطالب" : "Name"}</label>
            <input className="fi" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
          </div>

          {showStatusFilter && (
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">{lang === "ar" ? "الحالة" : "Status"}</label>
              <select className="fi" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">{lang === "ar" ? "الكل" : "All"}</option>
                <option value="1">{lang === "ar" ? "حاضر" : "Present"}</option>
                <option value="2">{lang === "ar" ? "متأخر" : "Late"}</option>
                <option value="3">{lang === "ar" ? "غائب" : "Absent"}</option>
                <option value="4">{lang === "ar" ? "مستأذن" : "Excused"}</option>
              </select>
            </div>
          )}

          <button className="btn btn-p btn-sm" onClick={load} disabled={loading} type="button">
            {loading ? (lang === "ar" ? "جاري التحميل…" : "Loading…") : (lang === "ar" ? "بحث" : "Search")}
          </button>
        </div>
      </PageCard>

      {error && (
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 9, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#DC2626", fontSize: 12 }}>
          {error}
        </div>
      )}

      <AttendanceTable groups={data?.data ?? []} />
    </>
  );
}
