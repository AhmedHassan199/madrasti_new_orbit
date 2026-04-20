"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { formsApi } from "@/lib/modules-api";

const Q_TYPES = [
  { v: "text",      ar: "نص حر",        en: "Free Text" },
  { v: "radio",     ar: "اختيار واحد",   en: "Single Choice" },
  { v: "checkbox",  ar: "اختيار متعدد", en: "Multiple Choice" },
  { v: "rating",    ar: "تقييم",        en: "Rating" },
  { v: "date",      ar: "تاريخ",        en: "Date" },
];

export default function FormDetailPage() {
  const { id }                = useParams<{ id: string }>();
  const { lang }              = useUi();
  const [formData, setFormData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"questions" | "responses">("questions");
  const [newQ, setNewQ]       = useState({ text: "", text_ar: "", type: "text", options: "" });
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      formsApi.show(id),
      formsApi.questions(id),
      formsApi.responses(id),
    ]).then(([f, q, r]: any[]) => {
      setFormData(f.data ?? f);
      setQuestions(q.data ?? q ?? []);
      setResponses(r.data ?? r ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAddQuestion = () => {
    if (!newQ.text_ar && !newQ.text) return;
    setSaving(true);
    const payload = { ...newQ, options: newQ.options ? newQ.options.split("\n").filter(Boolean) : [] };
    formsApi.addQuestion(id!, payload)
      .then(() => formsApi.questions(id!))
      .then((q: any) => { setQuestions(q.data ?? q ?? []); setNewQ({ text: "", text_ar: "", type: "text", options: "" }); })
      .finally(() => setSaving(false));
  };

  const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
  const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)" };

  const TABS = [
    { key: "questions",  ar: "الأسئلة",  en: "Questions" },
    { key: "responses",  ar: "الردود",   en: "Responses" },
  ];

  return (
    <DashboardLayout title={lang === "ar" ? "تفاصيل الاستبيان" : "Form Detail"}>
      {loading ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
      ) : (
        <>
          <PageCard>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📝</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--tx0)" }}>
                  {lang === "ar" ? (formData?.title_ar ?? formData?.title) : (formData?.title ?? formData?.title_ar)}
                </div>
                <div style={{ fontSize: 11, color: "var(--tx2)" }}>{formData?.description ?? ""}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--tx2)", marginTop: 4 }}>
                  <span>❓ {questions.length} {lang === "ar" ? "سؤال" : "questions"}</span>
                  <span>📊 {responses.length} {lang === "ar" ? "رد" : "responses"}</span>
                </div>
              </div>
            </div>
          </PageCard>

          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {TABS.map((t) => (
              <button key={t.key} className={`btn btn-sm ${tab === t.key ? "btn-p" : "btn-g"}`} onClick={() => setTab(t.key as typeof tab)}>
                {lang === "ar" ? t.ar : t.en}
              </button>
            ))}
          </div>

          {tab === "questions" && (
            <PageCard
              title={lang === "ar" ? "الأسئلة" : "Questions"}
              actions={
                <button className="btn btn-p btn-sm" onClick={handleAddQuestion} disabled={saving}>
                  {saving ? (lang === "ar" ? "جاري…" : "Saving…") : ("+ " + (lang === "ar" ? "إضافة سؤال" : "Add Question"))}
                </button>
              }
            >
              {/* Add question form */}
              <div style={{ background: "var(--bg3)", borderRadius: 10, padding: 12, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="fg">
                  <label className="fl">{lang === "ar" ? "السؤال (عربي)" : "Question (AR)"}</label>
                  <input className="fi" value={newQ.text_ar} onChange={(e) => setNewQ((p) => ({ ...p, text_ar: e.target.value }))} style={{ width: 200 }} />
                </div>
                <div className="fg">
                  <label className="fl">{lang === "ar" ? "السؤال (إنجليزي)" : "Question (EN)"}</label>
                  <input className="fi" value={newQ.text} onChange={(e) => setNewQ((p) => ({ ...p, text: e.target.value }))} style={{ width: 200 }} />
                </div>
                <div className="fg">
                  <label className="fl">{lang === "ar" ? "النوع" : "Type"}</label>
                  <select className="fi" value={newQ.type} onChange={(e) => setNewQ((p) => ({ ...p, type: e.target.value }))} style={{ width: 130 }}>
                    {Q_TYPES.map((qt) => <option key={qt.v} value={qt.v}>{lang === "ar" ? qt.ar : qt.en}</option>)}
                  </select>
                </div>
                {(newQ.type === "radio" || newQ.type === "checkbox") && (
                  <div className="fg">
                    <label className="fl">{lang === "ar" ? "الخيارات (سطر لكل خيار)" : "Options (one per line)"}</label>
                    <textarea className="fi" value={newQ.options} rows={3}
                      onChange={(e) => setNewQ((p) => ({ ...p, options: e.target.value }))} style={{ width: 200, resize: "vertical" }} />
                  </div>
                )}
              </div>

              {/* Questions list */}
              {!questions.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد أسئلة" : "No questions yet"}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {questions.map((q: any, i) => (
                    <div key={q.id ?? i} style={{ background: "var(--bg3)", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#E8702A", minWidth: 24 }}>{i + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx0)" }}>
                            {lang === "ar" ? (q.text_ar ?? q.text) : (q.text ?? q.text_ar)}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>
                            {Q_TYPES.find((t) => t.v === q.type)?.[lang === "ar" ? "ar" : "en"] ?? q.type}
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                              {(q.options as string[]).map((opt, oi) => (
                                <span key={oi} style={{ fontSize: 10, padding: "2px 8px", background: "var(--bg1)", border: "1px solid var(--brd)", borderRadius: 20, color: "var(--tx1)" }}>
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PageCard>
          )}

          {tab === "responses" && (
            <PageCard title={lang === "ar" ? "الردود" : "Responses"}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={async () => {
                  try {
                    const r: any = await formsApi.responseStats(id!);
                    const s = r.data ?? r;
                    alert(`إجمالي الردود: ${s.total_responses}\nأسئلة: ${s.per_question?.length ?? 0}`);
                  } catch { alert("تعذّر جلب الإحصائيات"); }
                }} className="btn btn-g btn-sm">📊 الإحصائيات</button>
                <a href={`/api/smos/forms/${id}/responses/export`} target="_blank" rel="noreferrer" className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>📥 تصدير CSV</a>
              </div>
              {!responses.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد ردود" : "No responses yet"}</p>
              ) : (
                <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      <th style={th}>{lang === "ar" ? "المُجيب" : "Respondent"}</th>
                      <th style={th}>{lang === "ar" ? "تاريخ الرد" : "Submitted At"}</th>
                      <th style={th}>{lang === "ar" ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r: any, i) => (
                      <tr key={r.id ?? i} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                        <td style={td}>{r.id ?? i + 1}</td>
                        <td style={{ ...td, fontWeight: 600, color: "var(--tx0)" }}>{r.respondent?.name ?? r.user?.name ?? r.employee?.name ?? "مجهول"}</td>
                        <td style={{ ...td, direction: "ltr" }}>{r.submitted_at ?? r.created_at?.slice(0, 16) ?? "—"}</td>
                        <td style={td}>
                          <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "#22C55E20", color: "#22C55E" }}>
                            {lang === "ar" ? "مكتمل" : "Completed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </PageCard>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
