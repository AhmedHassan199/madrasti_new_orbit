"use client";

import { useUi } from "@/contexts/UiContext";
import StatusBadge from "./StatusBadge";
import Pagination, { useClientPagination } from "./Pagination";

interface Props {
  groups: { date: string; transactions: any[]; count: number }[];
  emptyMessage_ar?: string;
  emptyMessage_en?: string;
  /** when true (default) split rows by status (حاضر/متأخر/غائب) like reference; false = flat table */
  splitByStatus?: boolean;
}

const STATUS_SECTIONS = [
  { key: 1, ar: "الحاضرون", en: "Present",  ico: "✓", c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  { key: 2, ar: "المتأخرون", en: "Late",    ico: "⏰", c: "#D97706", bg: "#FFFBEB", brd: "#FDE68A" },
  { key: 3, ar: "الغائبون", en: "Absent",   ico: "✕", c: "#DC2626", bg: "#FEF2F2", brd: "#FECACA" },
  { key: 4, ar: "المستأذنون", en: "Excused", ico: "📝", c: "#0891B2", bg: "#ECFEFF", brd: "#A5F3FC" },
];

export default function AttendanceTable({
  groups,
  emptyMessage_ar = "مفيش بيانات في الفترة دي — جرّب تغير الفلاتر",
  emptyMessage_en = "No data in this range — try different filters",
  splitByStatus = true,
}: Props) {
  const { lang } = useUi();

  if (!groups.length) {
    return (
      <div style={{
        padding: 40, textAlign: "center", color: "var(--tx2)",
        background: "var(--bg2)", borderRadius: 12, border: "1px dashed var(--brd)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 6, opacity: 0.4 }}>📭</div>
        {lang === "ar" ? emptyMessage_ar : emptyMessage_en}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groups.map((group) => {
        const byStatus: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };
        for (const t of group.transactions) {
          const s = (byStatus[t.status] ?? (byStatus[t.status] = []));
          s.push(t);
        }

        return (
          <div key={group.date} style={{
            background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", background: "linear-gradient(135deg,#2563EB,#1D4ED8)",
              color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>📅 {group.date}</span>
              <span style={{ fontSize: 11, fontFamily: "var(--fm)", opacity: 0.9 }}>
                {group.count} {lang === "ar" ? "سجل" : "records"}
              </span>
            </div>

            {splitByStatus ? (
              <div style={{ padding: 12 }}>
                {STATUS_SECTIONS.map(sec => {
                  const rows = byStatus[sec.key] ?? [];
                  if (!rows.length) return null;
                  return (
                    <div key={sec.key} style={{ marginBottom: 16 }}>
                      <div style={{
                        padding: "8px 12px", background: sec.bg, color: sec.c, borderRadius: 8,
                        border: `1px solid ${sec.brd}`, fontWeight: 700, fontSize: 12,
                        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
                      }}>
                        <span>{sec.ico} {lang === "ar" ? sec.ar : sec.en}</span>
                        <span style={{ fontFamily: "var(--fm)", fontSize: 11 }}>
                          {rows.length.toLocaleString("ar-EG")}
                        </span>
                      </div>
                      <InnerTable rows={rows} sectionKey={sec.key} lang={lang} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--bg3)", borderBottom: "1px solid var(--brd)" }}>
                      {["الاسم","الرقم","الفصل","الوقت","الحالة","العذر"].map((h,i) => (
                        <th key={i} style={{ padding: "8px 12px", textAlign: lang === "ar" ? "right" : "left", fontWeight: 700, color: "var(--tx2)", fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.transactions.map((t: any) => (
                      <tr key={t.id ?? Math.random()} style={{ borderTop: "1px solid var(--brd)" }}>
                        <td style={{ padding: "8px 12px" }}>{t.employee?.name ?? "—"}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--fm)", direction: "ltr" }}>{t.employee?.identifier ?? "—"}</td>
                        <td style={{ padding: "8px 12px" }}>{t.employee?.sub_group?.name ?? t.employee?.group?.name ?? "—"}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--fm)" }}>{t.punch_time ?? "—"}</td>
                        <td style={{ padding: "8px 12px" }}><StatusBadge status={t.status} lang={lang} /></td>
                        <td style={{ padding: "8px 12px", color: "var(--tx2)" }}>{t.excuse?.name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InnerTable({ rows, sectionKey, lang }: { rows: any[]; sectionKey: number; lang: string }) {
  const showDelay = sectionKey === 2;
  const pg = useClientPagination(rows, 20);
  return (
    <div style={{ border: "1px solid var(--brd)", borderRadius: 6, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--bg3)" }}>
              {[
                lang === "ar" ? "#" : "#",
                lang === "ar" ? "الرقم" : "ID",
                lang === "ar" ? "الاسم" : "Name",
                lang === "ar" ? "الفصل" : "Class",
                lang === "ar" ? "الدخول" : "In",
                lang === "ar" ? "الخروج" : "Out",
                ...(showDelay ? [lang === "ar" ? "التأخير" : "Delay"] : []),
                lang === "ar" ? "العذر" : "Excuse",
              ].map((h, i) => (
                <th key={i} style={{ padding: "6px 10px", textAlign: lang === "ar" ? "right" : "left", fontSize: 10, color: "var(--tx2)", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pg.paginated.map((t: any, i: number) => {
              const exitTime = t.exit_time ?? (Array.isArray(t.children) && t.children.length ? t.children[t.children.length - 1]?.punch_time : null);
              return (
                <tr key={t.id ?? i} style={{ borderTop: "1px solid var(--brd)" }}>
                  <td style={{ padding: "7px 10px", fontFamily: "var(--fm)", color: "var(--tx2)" }}>{pg.start + i + 1}</td>
                  <td style={{ padding: "7px 10px", fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{t.employee?.identifier ?? "—"}</td>
                  <td style={{ padding: "7px 10px", fontWeight: 600 }}>{t.employee?.name ?? "—"}</td>
                  <td style={{ padding: "7px 10px", color: "var(--tx2)" }}>{t.employee?.sub_group?.name ?? t.employee?.group?.name ?? "—"}</td>
                  <td style={{ padding: "7px 10px", fontFamily: "var(--fm)" }}>{t.punch_time ?? "—"}</td>
                  <td style={{ padding: "7px 10px", fontFamily: "var(--fm)", color: "var(--tx2)" }}>{exitTime ?? (t.status === 3 ? "—" : "لم يسجل خروج")}</td>
                  {showDelay && (
                    <td style={{ padding: "7px 10px", fontFamily: "var(--fm)", color: "#D97706", fontWeight: 600 }}>
                      {t.delay_time ? formatDelay(t.delay_time) : "—"}
                    </td>
                  )}
                  <td style={{ padding: "7px 10px", color: "var(--tx2)" }}>{t.excuse?.name ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
        onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
      />
    </div>
  );
}

function formatDelay(mins: any): string {
  const n = typeof mins === "number" ? mins : parseInt(String(mins ?? 0));
  if (!n) return "—";
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h > 0) return `${h} ساعة${m > 0 ? ` ${m} دقيقة` : ""}`;
  return `${m} دقيقة`;
}
