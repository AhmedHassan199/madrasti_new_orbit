"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { employeesApi } from "@/lib/employees-api";

const ROW_STYLE: React.CSSProperties = { display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--brd)", fontSize: 12 };
const LABEL_STYLE: React.CSSProperties = { color: "var(--tx2)", minWidth: 130, fontWeight: 700 };
const VALUE_STYLE: React.CSSProperties = { color: "var(--tx0)" };

const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)" };

export default function StudentDetailPage() {
  const { id }              = useParams<{ id: string }>();
  const { lang }            = useUi();
  const [student, setStudent] = useState<any>(null);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [comments, setComments]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"info" | "guardians" | "comments" | "academic" | "attendance" | "behavior" | "timeline">("info");
  const [grades, setGrades]       = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [attDetail, setAttDetail] = useState<any>({ summary: { present: 0, late: 0, absent: 0, total: 0, rate: 0 }, log: [] });
  const [timeline, setTimeline]   = useState<any[]>([]);

  // Add guardian / comment state
  const [newGuardian, setNewGuardian] = useState({ name: "", phone: "", relation: "" });
  const [newComment, setNewComment]   = useState({ comment: "" });
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      employeesApi.show(id),
      employeesApi.guardians(id),
      employeesApi.comments(id),
      employeesApi.grades(id).catch(() => ({ data: [] })),
      employeesApi.violations(id).catch(() => ({ data: [] })),
      employeesApi.attendanceDetailed(id).catch(() => ({ data: { summary: { present: 0, late: 0, absent: 0, total: 0, rate: 0 }, log: [] } })),
      employeesApi.timeline(id).catch(() => ({ data: [] })),
    ]).then(([s, g, c, gr, vi, att, tl]: any[]) => {
      setStudent(s.data ?? s);
      setGuardians(g.data ?? g ?? []);
      setComments(c.data ?? c ?? []);
      setGrades(gr.data ?? gr ?? []);
      setViolations(vi.data ?? vi ?? []);
      setAttDetail(att.data ?? att ?? { summary: {}, log: [] });
      setTimeline(tl.data ?? tl ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAddGuardian = () => {
    if (!newGuardian.name) return;
    setSaving(true);
    employeesApi.addGuardian(id!, newGuardian)
      .then(() => employeesApi.guardians(id!))
      .then((g: any) => { setGuardians(g.data ?? g ?? []); setNewGuardian({ name: "", phone: "", relation: "" }); })
      .finally(() => setSaving(false));
  };

  const handleAddComment = () => {
    if (!newComment.comment) return;
    setSaving(true);
    employeesApi.addComment(id!, newComment)
      .then(() => employeesApi.comments(id!))
      .then((c: any) => { setComments(c.data ?? c ?? []); setNewComment({ comment: "" }); })
      .finally(() => setSaving(false));
  };

  const TABS = [
    { key: "info",       ar: "المعلومات",    en: "Info" },
    { key: "academic",   ar: "الأكاديمي",   en: "Academic" },
    { key: "attendance", ar: "الحضور",       en: "Attendance" },
    { key: "behavior",   ar: "السلوك",       en: "Behavior" },
    { key: "timeline",   ar: "الخط الزمني",  en: "Timeline" },
    { key: "guardians",  ar: "أولياء الأمر", en: "Guardians" },
    { key: "comments",   ar: "الملاحظات",    en: "Comments" },
  ];

  return (
    <DashboardLayout title={lang === "ar" ? "بيانات الطالب" : "Student Detail"}>
      {loading ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
      ) : !student ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لم يتم العثور على الطالب" : "Student not found"}</p>
      ) : (
        <>
          {/* Header card */}
          <PageCard>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(232,112,42,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                👨‍🎓
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--tx0)" }}>{student.name}</div>
                <div style={{ fontSize: 12, color: "var(--tx2)" }}>{student.group?.name ?? student.class_name ?? "—"}</div>
              </div>
            </div>
          </PageCard>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`btn ${tab === t.key ? "btn-p" : "btn-g"} btn-sm`}
                onClick={() => setTab(t.key as typeof tab)}
              >
                {lang === "ar" ? t.ar : t.en}
              </button>
            ))}
          </div>

          {/* Info */}
          {tab === "info" && (
            <PageCard title={lang === "ar" ? "المعلومات الأساسية" : "Basic Info"}>
              {[
                { ar: "رقم الهوية",     en: "ID Number",    val: student.national_id },
                { ar: "تاريخ الميلاد",  en: "Birth Date",   val: student.birth_date },
                { ar: "الجنسية",         en: "Nationality",  val: student.nationality },
                { ar: "الجنس",           en: "Gender",       val: student.gender },
                { ar: "رقم الجوال",      en: "Mobile",       val: student.phone },
                { ar: "الفصل",           en: "Group",        val: student.group?.name },
                { ar: "الحالة",          en: "Status",       val: student.status },
                { ar: "تاريخ الالتحاق", en: "Join Date",    val: student.join_date },
              ].map((row, i) => (
                <div key={i} style={ROW_STYLE}>
                  <span style={LABEL_STYLE}>{lang === "ar" ? row.ar : row.en}</span>
                  <span style={VALUE_STYLE}>{row.val ?? "—"}</span>
                </div>
              ))}
            </PageCard>
          )}

          {/* Academic tab */}
          {tab === "academic" && (
            <PageCard title={lang === "ar" ? "الأكاديمي" : "Academic"}>
              {!grades.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد درجات مسجلة بعد" : "No grades yet"}</p>
              ) : (
                <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>
                    <th style={th}>{lang === "ar" ? "المادة" : "Subject"}</th>
                    <th style={th}>{lang === "ar" ? "المعلم" : "Teacher"}</th>
                    <th style={th}>{lang === "ar" ? "الدرجة" : "Grade"}</th>
                    <th style={th}>{lang === "ar" ? "الفصل" : "Term"}</th>
                    <th style={th}>{lang === "ar" ? "التاريخ" : "Date"}</th>
                  </tr></thead>
                  <tbody>
                    {grades.map((g: any) => {
                      const pct = g.max_grade ? Math.round((g.grade / g.max_grade) * 100) : 0;
                      const color = pct >= 80 ? "#059669" : pct >= 60 ? "#B45309" : "#DC2626";
                      return (
                        <tr key={g.id} style={{ borderTop: "1px solid var(--brd)" }}>
                          <td style={{ ...td, fontWeight: 700 }}>{g.subject}</td>
                          <td style={td}>{g.teacher_name ?? "—"}</td>
                          <td style={{ ...td, fontWeight: 800, color }}>{g.grade} / {g.max_grade ?? 100} ({pct}%)</td>
                          <td style={td}>{g.term ?? "—"}</td>
                          <td style={td}>{g.graded_at ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </PageCard>
          )}

          {/* Attendance tab */}
          {tab === "attendance" && (
            <PageCard title={lang === "ar" ? "الحضور والغياب" : "Attendance"}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                {[
                  { l: "حاضر",   v: attDetail.summary?.present ?? 0, c: "#059669" },
                  { l: "متأخر",  v: attDetail.summary?.late ?? 0,    c: "#B45309" },
                  { l: "غائب",   v: attDetail.summary?.absent ?? 0,  c: "#DC2626" },
                  { l: "نسبة %",  v: (attDetail.summary?.rate ?? 0) + "%", c: "#2563EB" },
                ].map((k, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--brd)" }}>
                    <div style={{ fontSize: 10, color: "var(--tx2)" }}>{k.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>
              {!attDetail.log?.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا يوجد سجل" : "No log"}</p>
              ) : (
                <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>
                    <th style={th}>{lang === "ar" ? "التاريخ" : "Date"}</th>
                    <th style={th}>{lang === "ar" ? "الوقت" : "Time"}</th>
                    <th style={th}>{lang === "ar" ? "الحالة" : "Status"}</th>
                  </tr></thead>
                  <tbody>
                    {(attDetail.log as any[]).slice(0, 50).map((r: any) => (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--brd)" }}>
                        <td style={{ ...td, fontFamily: "monospace" }}>{r.punch_date}</td>
                        <td style={{ ...td, fontFamily: "monospace" }}>{r.punch_time ?? "—"}</td>
                        <td style={td}>{r.status === 1 ? "حاضر" : r.status === 2 ? "متأخر" : r.status === 3 ? "غائب" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </PageCard>
          )}

          {/* Behavior tab */}
          {tab === "behavior" && (
            <PageCard title={lang === "ar" ? "السجل السلوكي" : "Behavior"}>
              {!violations.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد مخالفات مسجلة" : "No violations"}</p>
              ) : (
                <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>
                    <th style={th}>{lang === "ar" ? "النوع" : "Kind"}</th>
                    <th style={th}>{lang === "ar" ? "الخطورة" : "Severity"}</th>
                    <th style={th}>{lang === "ar" ? "الوصف" : "Description"}</th>
                    <th style={th}>{lang === "ar" ? "الإجراء" : "Action"}</th>
                    <th style={th}>{lang === "ar" ? "التاريخ" : "Date"}</th>
                  </tr></thead>
                  <tbody>
                    {violations.map((v: any) => (
                      <tr key={v.id} style={{ borderTop: "1px solid var(--brd)" }}>
                        <td style={{ ...td, fontWeight: 700 }}>{v.kind}</td>
                        <td style={td}>{v.severity}</td>
                        <td style={td}>{v.description ?? "—"}</td>
                        <td style={td}>{v.action ?? "—"}</td>
                        <td style={{ ...td, fontFamily: "monospace" }}>{v.incident_date ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </PageCard>
          )}

          {/* Timeline tab */}
          {tab === "timeline" && (
            <PageCard title={lang === "ar" ? "الخط الزمني" : "Timeline"}>
              {!timeline.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا يوجد سجل نشاط" : "No activity"}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {timeline.slice(0, 50).map((e: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: (e.color ?? "#6B7280") + "22", color: e.color ?? "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{e.icon ?? "•"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{e.title}</div>
                        <div style={{ fontSize: 11, color: "var(--tx2)" }}>{e.description}</div>
                        <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{(e.date ?? "").toString().slice(0, 10)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PageCard>
          )}

          {/* Guardians */}
          {tab === "guardians" && (
            <PageCard title={lang === "ar" ? "أولياء الأمر" : "Guardians"}
              actions={
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input className="fi" placeholder={lang === "ar" ? "الاسم" : "Name"} value={newGuardian.name}
                    onChange={(e) => setNewGuardian((p) => ({ ...p, name: e.target.value }))} style={{ width: 120 }} />
                  <input className="fi" placeholder={lang === "ar" ? "الجوال" : "Phone"} value={newGuardian.phone}
                    onChange={(e) => setNewGuardian((p) => ({ ...p, phone: e.target.value }))} style={{ width: 110 }} />
                  <input className="fi" placeholder={lang === "ar" ? "الصلة" : "Relation"} value={newGuardian.relation}
                    onChange={(e) => setNewGuardian((p) => ({ ...p, relation: e.target.value }))} style={{ width: 100 }} />
                  <button className="btn btn-p btn-sm" onClick={handleAddGuardian} disabled={saving}>
                    {lang === "ar" ? "إضافة" : "Add"}
                  </button>
                </div>
              }
            >
              {!guardians.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد بيانات" : "No data"}</p>
              ) : (
                <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={th}>{lang === "ar" ? "الاسم" : "Name"}</th>
                      <th style={th}>{lang === "ar" ? "الجوال" : "Phone"}</th>
                      <th style={th}>{lang === "ar" ? "الصلة" : "Relation"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardians.map((g: any, i) => (
                      <tr key={g.id ?? i} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                        <td style={td}>{g.name}</td>
                        <td style={{ ...td, direction: "ltr" }}>{g.phone ?? "—"}</td>
                        <td style={td}>{g.relation ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </PageCard>
          )}

          {/* Comments */}
          {tab === "comments" && (
            <PageCard title={lang === "ar" ? "الملاحظات" : "Comments"}
              actions={
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="fi" placeholder={lang === "ar" ? "ملاحظة جديدة…" : "New comment…"} value={newComment.comment}
                    onChange={(e) => setNewComment({ comment: e.target.value })} style={{ width: 240 }} />
                  <button className="btn btn-p btn-sm" onClick={handleAddComment} disabled={saving}>
                    {lang === "ar" ? "إضافة" : "Add"}
                  </button>
                </div>
              }
            >
              {!comments.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد بيانات" : "No data"}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {comments.map((c: any, i) => (
                    <div key={c.id ?? i} style={{ background: "var(--bg3)", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                      <div style={{ color: "var(--tx0)" }}>{c.comment ?? c.text ?? c.body}</div>
                      <div style={{ color: "var(--tx2)", fontSize: 10, marginTop: 4 }}>{c.created_at ?? ""} — {c.author ?? c.user?.name ?? ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </PageCard>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
