"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { portfolioApi } from "@/lib/modules-api";

const DOC_TYPES = [
  { v: "document", ar: "مستند", en: "Document", icon: "📄" },
  { v: "image",    ar: "صورة",  en: "Image",    icon: "🖼️" },
  { v: "video",    ar: "فيديو", en: "Video",    icon: "🎬" },
  { v: "link",     ar: "رابط",  en: "Link",     icon: "🔗" },
];

export default function PortfolioEditorPage() {
  const { id }                  = useParams<{ id: string }>();
  const { lang }                = useUi();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newDoc, setNewDoc]     = useState({ title: "", title_ar: "", type: "document", url: "", description: "" });
  const [saving, setSaving]     = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);

  const loadDocs = () =>
    portfolioApi.documents(id!).then((r: any) => setDocuments(r.data ?? r ?? []));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([portfolioApi.show(id), portfolioApi.documents(id)])
      .then(([p, d]: any[]) => {
        setPortfolio(p.data ?? p);
        setDocuments(d.data ?? d ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddDoc = () => {
    if (!newDoc.url && !newDoc.title) return;
    setSaving(true);
    portfolioApi.addDoc(id!, newDoc)
      .then(loadDocs)
      .then(() => setNewDoc({ title: "", title_ar: "", type: "document", url: "", description: "" }))
      .finally(() => setSaving(false));
  };

  const handleDeleteDoc = (docId: number) => {
    if (!confirm(lang === "ar" ? "هل تريد حذف هذا المستند؟" : "Delete?")) return;
    portfolioApi.deleteDoc(id!, docId).then(loadDocs);
  };

  const handleEditPortfolio = () => {
    if (!editForm) return;
    setEditSaving(true);
    portfolioApi.update(id!, editForm)
      .then(() => portfolioApi.show(id!))
      .then((p: any) => { setPortfolio(p.data ?? p); setEditForm(null); })
      .finally(() => setEditSaving(false));
  };

  const getDocIcon = (type: string) => DOC_TYPES.find((d) => d.v === type)?.icon ?? "📄";

  return (
    <DashboardLayout title={lang === "ar" ? "ملف الإنجاز" : "Portfolio"}>
      {loading ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
      ) : (
        <>
          {/* Header */}
          <PageCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(232,112,42,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏆</div>
                <div>
                  {editForm ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input className="fi" value={editForm.title_ar ?? ""} onChange={(e) => setEditForm((p: any) => ({ ...p, title_ar: e.target.value }))} placeholder={lang === "ar" ? "العنوان (عربي)" : "Title AR"} style={{ width: 160 }} />
                      <input className="fi" value={editForm.title ?? ""} onChange={(e) => setEditForm((p: any) => ({ ...p, title: e.target.value }))} placeholder={lang === "ar" ? "العنوان (إنجليزي)" : "Title EN"} style={{ width: 160 }} />
                      <input className="fi" value={editForm.subject ?? ""} onChange={(e) => setEditForm((p: any) => ({ ...p, subject: e.target.value }))} placeholder={lang === "ar" ? "المادة" : "Subject"} style={{ width: 120 }} />
                      <button className="btn btn-p btn-sm" onClick={handleEditPortfolio} disabled={editSaving}>{lang === "ar" ? "حفظ" : "Save"}</button>
                      <button className="btn btn-g btn-sm" onClick={() => setEditForm(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "var(--tx0)" }}>
                        {lang === "ar" ? (portfolio?.title_ar ?? portfolio?.title) : (portfolio?.title ?? portfolio?.title_ar)}
                      </div>
                      {portfolio?.subject && <div style={{ fontSize: 11, color: "#E8702A", fontWeight: 700 }}>{portfolio.subject}</div>}
                      {portfolio?.academic_year && <div style={{ fontSize: 11, color: "var(--tx2)" }}>{portfolio.academic_year}</div>}
                    </>
                  )}
                </div>
              </div>
              {!editForm && (
                <button className="btn btn-g btn-sm" onClick={() => setEditForm({ title: portfolio?.title ?? "", title_ar: portfolio?.title_ar ?? "", subject: portfolio?.subject ?? "", academic_year: portfolio?.academic_year ?? "" })}>
                  {lang === "ar" ? "تعديل" : "Edit"}
                </button>
              )}
            </div>
          </PageCard>

          {/* Add document */}
          <PageCard title={lang === "ar" ? "إضافة مستند" : "Add Document"}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="fg">
                <label className="fl">{lang === "ar" ? "العنوان (عربي)" : "Title (AR)"}</label>
                <input className="fi" value={newDoc.title_ar} onChange={(e) => setNewDoc((p) => ({ ...p, title_ar: e.target.value }))} style={{ width: 160 }} />
              </div>
              <div className="fg">
                <label className="fl">{lang === "ar" ? "العنوان (إنجليزي)" : "Title (EN)"}</label>
                <input className="fi" value={newDoc.title} onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))} style={{ width: 160 }} />
              </div>
              <div className="fg">
                <label className="fl">{lang === "ar" ? "النوع" : "Type"}</label>
                <select className="fi" value={newDoc.type} onChange={(e) => setNewDoc((p) => ({ ...p, type: e.target.value }))} style={{ width: 120 }}>
                  {DOC_TYPES.map((d) => <option key={d.v} value={d.v}>{d.icon} {lang === "ar" ? d.ar : d.en}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">URL / {lang === "ar" ? "الرابط" : "Link"}</label>
                <input className="fi" value={newDoc.url} onChange={(e) => setNewDoc((p) => ({ ...p, url: e.target.value }))} style={{ width: 220 }} />
              </div>
              <div className="fg">
                <label className="fl">{lang === "ar" ? "الوصف" : "Description"}</label>
                <input className="fi" value={newDoc.description} onChange={(e) => setNewDoc((p) => ({ ...p, description: e.target.value }))} style={{ width: 180 }} />
              </div>
              <button className="btn btn-p btn-sm" onClick={handleAddDoc} disabled={saving}>
                {saving ? (lang === "ar" ? "جاري…" : "Saving…") : ("+ " + (lang === "ar" ? "إضافة" : "Add"))}
              </button>
            </div>
          </PageCard>

          {/* Documents */}
          <PageCard title={lang === "ar" ? "المستندات" : "Documents"}>
            {!documents.length ? (
              <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد مستندات" : "No documents yet"}</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
                {documents.map((doc: any, i) => (
                  <div key={doc.id ?? i} style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 20 }}>{getDocIcon(doc.type)}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--tx0)" }}>
                            {lang === "ar" ? (doc.title_ar ?? doc.title) : (doc.title ?? doc.title_ar)}
                          </div>
                          {doc.description && <div style={{ fontSize: 10, color: "var(--tx2)" }}>{doc.description}</div>}
                        </div>
                      </div>
                      <button className="btn btn-sm" style={{ background: "#EF444420", color: "#EF4444", border: "1px solid #EF444440", padding: "2px 6px" }} onClick={() => handleDeleteDoc(doc.id)}>✕</button>
                    </div>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-g btn-sm" style={{ textDecoration: "none", display: "block", textAlign: "center", fontSize: 11 }}>
                        {lang === "ar" ? "فتح" : "Open"}
                      </a>
                    )}
                    <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 6 }}>{doc.created_at?.slice(0, 10) ?? ""}</div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </>
      )}
    </DashboardLayout>
  );
}
