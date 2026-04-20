"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { portfolioApi } from "@/lib/modules-api";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Types ─── */
type CatStatus = "done" | "partial" | "missing";
type SectionTab = "docs" | "comments" | "upload";
type CommentType = "feedback" | "approve" | "request" | "urgent" | "general";
type FileType = "pdf" | "doc" | "img" | "vid" | "ppt" | "lnk";

interface Doc {
  id: string;
  name: string;
  type: FileType;
  size: string;
  date: string;
  comments: number;
}
interface Comment {
  id: string;
  author: string;
  av: string;
  date: string;
  text: string;
  type: CommentType;
}
interface Category {
  ar: string;
  ico: string;
  color: string;
  req: number;
  status: CatStatus;
  docs: Doc[];
  comments: Comment[];
}

/* ─── Static Data ─── */
const INITIAL_CATS: Record<string, Category> = {};

const FTYPE_META: Record<FileType, { ico: string; bg: string; color: string }> = {
  pdf: { ico: "📄", bg: "#FEF2F2", color: "#DC2626" },
  doc: { ico: "📝", bg: "#EFF6FF", color: "#2563EB" },
  img: { ico: "🖼️", bg: "#F5F3FF", color: "#7C3AED" },
  vid: { ico: "🎬", bg: "#FFF7ED", color: "#EA580C" },
  ppt: { ico: "📊", bg: "#ECFDF5", color: "#059669" },
  lnk: { ico: "🔗", bg: "#FFFBEB", color: "#B45309" },
};

const CTYPE_META: Record<CommentType, { bg: string; brd: string; ico: string; c: string }> = {
  feedback: { bg: "#EFF6FF", brd: "#BFDBFE", ico: "💬", c: "#1D4ED8" },
  approve:  { bg: "#ECFDF5", brd: "#A7F3D0", ico: "✅", c: "#059669" },
  request:  { bg: "#FFFBEB", brd: "#FCD34D", ico: "📌", c: "#B45309" },
  urgent:   { bg: "#FEF2F2", brd: "#FCA5A5", ico: "⚠️", c: "#DC2626" },
  general:  { bg: "var(--bg3)", brd: "var(--brd)", ico: "💬", c: "var(--tx1)" },
};

const STATUS_PILL: Record<CatStatus, { label: string; bg: string; color: string; brd: string }> = {
  done:    { label: "✓ مكتمل",       bg: "#ECFDF5", color: "#059669", brd: "#A7F3D0" },
  partial: { label: "◑ ناقص",        bg: "#FFFBEB", color: "#B45309", brd: "#FCD34D" },
  missing: { label: "✗ يحتاج وثائق", bg: "#FEF2F2", color: "#DC2626", brd: "#FCA5A5" },
};

export default function PortfolioPage() {
  const { lang } = useUi();
  const { role } = useAuth();
  const isAdmin = role === "principal" || role === "vice";
  const [viewMode, setViewMode] = useState<"admin" | "teacher">(isAdmin ? "admin" : "teacher");

  const [cats, setCats] = useState<Record<string, Category>>(INITIAL_CATS);
  const [activeKey, setActiveKey] = useState("lessons");
  const [sectionTab, setSectionTab] = useState<SectionTab>("docs");
  const [uploadDesc, setUploadDesc] = useState("");

  /* ── Admin: all portfolios list ── */
  const [adminList, setAdminList]       = useState<any[]>([]);
  const [adminSearch, setAdminSearch]   = useState("");
  const [adminFilter, setAdminFilter]   = useState<"all" | "done" | "partial" | "missing">("all");

  useEffect(() => {
    if (viewMode !== "admin") return;
    portfolioApi.list({}).then((r: any) => {
      const arr: any[] = r.data ?? r ?? [];
      setAdminList((Array.isArray(arr) ? arr : []).map((p: any) => {
        const totalDocs = Number(p.documents_count ?? p.documents?.length ?? 0);
        const totalReq  = Number(p.required_count ?? p.required_total ?? 20);
        const pct = totalReq > 0 ? Math.round(totalDocs / totalReq * 100) : 0;
        return {
          id: String(p.id),
          name: p.employee?.name ?? p.employee_name ?? p.name ?? "—",
          subject: p.subject ?? p.employee?.subject ?? "—",
          color: p.color ?? "#3B82F6",
          pct: Math.min(100, pct),
          totalDocs, totalReq,
          missing: Math.max(0, totalReq - totalDocs),
          lastUpdate: (p.updated_at ?? "").toString().slice(0, 10),
          feedback: Number(p.feedback_count ?? 0),
          status: p.status ?? "pending",
        };
      }));
    }).catch(() => setAdminList([]));
  }, [viewMode]);

  const adminShown = useMemo(() => {
    let list = adminList.slice();
    if (adminFilter !== "all") {
      list = list.filter(t => {
        if (adminFilter === "done") return t.pct === 100;
        if (adminFilter === "partial") return t.pct > 0 && t.pct < 100;
        if (adminFilter === "missing") return t.missing > 0;
        return true;
      });
    }
    if (adminSearch) list = list.filter(t => t.name.includes(adminSearch) || t.subject.includes(adminSearch));
    return list;
  }, [adminList, adminFilter, adminSearch]);

  const adminStats = useMemo(() => ({
    total:       adminList.length,
    completed:   adminList.filter(t => t.pct === 100).length,
    needsAction: adminList.filter(t => t.missing > 0).length,
    avgPct:      adminList.length ? Math.round(adminList.reduce((a, t) => a + t.pct, 0) / adminList.length) : 0,
    totalDocs:   adminList.reduce((a, t) => a + t.totalDocs, 0),
  }), [adminList]);

  async function sendReminder(id: string) {
    try { await portfolioApi.sendReminder(id); alert("📨 تم إرسال التذكير"); } catch { alert("تعذّر الإرسال"); }
  }
  async function approvePortfolio(id: string) {
    if (!confirm("اعتماد ملف الإنجاز؟")) return;
    try { await portfolioApi.approve(id); alert("✅ تم اعتماد الملف"); } catch { alert("تعذّر الاعتماد"); }
  }

  useEffect(() => {
    portfolioApi.list({}).then((r: any) => {
      const arr: any[] = r.data ?? r ?? [];
      if (!Array.isArray(arr) || arr.length === 0) return;
      const built: Record<string, Category> = {};
      arr.forEach((item: any, idx: number) => {
        const key = item.key ?? item.slug ?? item.category_key ?? `cat_${idx}`;
        const docsRaw: any[] = item.documents ?? item.docs ?? item.files ?? [];
        const commentsRaw: any[] = item.comments ?? item.feedbacks ?? [];
        const docs: Doc[] = docsRaw.map((d: any, di: number) => ({
          id: d.id ?? `d_${idx}_${di}`,
          name: d.name ?? d.title ?? d.file_name ?? "—",
          type: (d.type ?? d.file_type ?? "pdf") as FileType,
          size: d.size ?? d.file_size ?? "—",
          date: d.date ?? d.created_at?.slice(0, 10) ?? "—",
          comments: d.comments ?? d.comments_count ?? 0,
        }));
        const comments: Comment[] = commentsRaw.map((c: any, ci: number) => ({
          id: c.id ?? `c_${idx}_${ci}`,
          author: c.author ?? c.author_name ?? c.user ?? "—",
          av: c.av ?? c.avatar_color ?? "#3B82F6",
          date: c.date ?? c.created_at?.slice(0, 10) ?? "—",
          text: c.text ?? c.body ?? c.comment ?? "—",
          type: (c.type ?? c.comment_type ?? "general") as CommentType,
        }));
        const totalReq: number = item.req ?? item.required_count ?? docs.length;
        const status: CatStatus = docs.length === 0 ? "missing" : docs.length >= totalReq ? "done" : "partial";
        built[key] = {
          ar: item.ar ?? item.name_ar ?? item.title_ar ?? item.name ?? key,
          ico: item.ico ?? item.icon ?? "📁",
          color: item.color ?? "#3B82F6",
          req: totalReq,
          status: item.status ?? status,
          docs,
          comments,
        };
      });
      if (Object.keys(built).length > 0) {
        setCats(built);
        setActiveKey(Object.keys(built)[0]);
      }
    }).catch(() => {});
  }, []);

  const catKeys = Object.keys(cats);
  const actCat: any = cats[activeKey] ?? { ar: "—", ico: "📁", color: "#6B7280", req: 0, status: "pending", docs: [], comments: [] };

  /* ─── Computed Stats ─── */
  const totalDocs = useMemo(() => Object.values(cats).reduce((a, c) => a + c.docs.length, 0), [cats]);
  const doneCats = useMemo(() => Object.values(cats).filter(c => c.status === "done").length, [cats]);
  const totalCats = catKeys.length;
  const pct = Math.round(doneCats / totalCats * 100);
  const pendingComments = useMemo(() =>
    Object.values(cats).reduce((a, c) => a + c.comments.filter(x => x.type === "urgent" || x.type === "request").length, 0),
    [cats]
  );
  const totalComments = useMemo(() => Object.values(cats).reduce((a, c) => a + c.comments.length, 0), [cats]);
  const docsRemaining = useMemo(() => Object.values(cats).reduce((a, c) => a + Math.max(0, c.req - c.docs.length), 0), [cats]);

  /* ─── Actions ─── */
  const [portfolioId, setPortfolioId] = useState<number | string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);

  useEffect(() => {
    // Capture portfolio id from loaded data (first portfolio belongs to current teacher)
    portfolioApi.list({}).then((r: any) => {
      const arr: any[] = r.data ?? r ?? [];
      if (arr.length) setPortfolioId(arr[0].id);
    }).catch(() => {});
  }, []);

  const deleteDoc = async (catKey: string, docId: string) => {
    if (!portfolioId) return;
    if (!confirm("حذف الوثيقة؟")) return;
    try { await portfolioApi.deleteDoc(portfolioId, docId); } catch {}
    setCats(prev => {
      const cat = prev[catKey];
      const newDocs = cat.docs.filter(d => d.id !== docId);
      const newStatus: CatStatus = newDocs.length === 0 ? "missing" : newDocs.length >= cat.req ? "done" : "partial";
      return { ...prev, [catKey]: { ...cat, docs: newDocs, status: newStatus } };
    });
  };

  async function uploadDocument() {
    if (!portfolioId) return alert("لا يوجد ملف إنجاز مرتبط بعد");
    if (!uploadFile) return alert("اختر ملفاً أولاً");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      if (uploadDesc) fd.append("title", uploadDesc);
      fd.append("category", activeKey);
      // Use direct fetch because api() stringifies JSON bodies
      const res = await fetch((window as any).NEXT_PUBLIC_API_URL ? `${(window as any).NEXT_PUBLIC_API_URL}/portfolio/${portfolioId}/documents` : `/api/smos/portfolio/${portfolioId}/documents`, {
        method: "POST", body: fd,
        headers: { "Accept": "application/json", "Authorization": `Bearer ${localStorage.getItem("smos_token") ?? ""}` },
      });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      const doc = data.data ?? data;
      setCats(prev => ({ ...prev, [activeKey]: {
        ...prev[activeKey],
        docs: [{
          id: String(doc.document_id ?? doc.id ?? Date.now()),
          name: doc.title ?? uploadFile.name,
          type: (uploadFile.name.split(".").pop()?.toLowerCase() ?? "pdf") as FileType,
          size: `${Math.round(uploadFile.size / 1024)} KB`,
          date: new Date().toISOString().slice(0, 10),
          comments: 0,
        }, ...prev[activeKey].docs],
        status: "partial",
      } }));
      setUploadFile(null); setUploadDesc("");
      alert("تم رفع الوثيقة");
    } catch { alert("تعذّر الرفع"); }
    finally { setUploading(false); }
  }

  const switchCat = (key: string) => {
    setActiveKey(key);
    setSectionTab("docs");
  };

  /* ─── Progress ring (SVG inline) ─── */
  const ringPct = actCat.req ? Math.min(100, Math.round(actCat.docs.length / actCat.req * 100)) : 0;

  const pill = STATUS_PILL[actCat.status as CatStatus] ?? { label: "—", bg: "var(--bg3)", color: "var(--tx2)", brd: "var(--brd)" };

  /* ══ ADMIN VIEW ══ */
  if (viewMode === "admin") {
    return (
      <DashboardLayout title={lang === "ar" ? "ملفات إنجاز المعلمين" : "Teacher Portfolios"} subtitle={`${adminStats.total} معلم · ${adminStats.completed} مكتملة · ${adminStats.needsAction > 0 ? `${adminStats.needsAction} تحتاج متابعة` : "لا توجد تنبيهات"}`}>
        {/* Mode toggle (admin can switch to teacher view of their own) */}
        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>ملفات إنجاز المعلمين</div>
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={() => setViewMode("teacher")} className="btn btn-g btn-sm">عرض ملفى الشخصى</button>
              <button className="btn btn-g btn-sm">📊 تصدير شامل</button>
            </div>
          </div>
        )}

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          {[
            { v: `${adminStats.avgPct}%`,  ar: "متوسط الاكتمال", c: "#E8702A", bg: "#FEF3E8", brd: "rgba(232,112,42,.2)" },
            { v: adminStats.completed,     ar: "ملفات مكتملة",   c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
            { v: adminStats.needsAction,   ar: "تحتاج متابعة",   c: adminStats.needsAction > 0 ? "#DC2626" : "#059669", bg: adminStats.needsAction > 0 ? "#FEF2F2" : "#ECFDF5", brd: adminStats.needsAction > 0 ? "#FCA5A5" : "#A7F3D0" },
            { v: adminStats.totalDocs,     ar: "وثائق مرفوعة",   c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, border: `1px solid ${s.brd}`, borderRadius: 11, padding: "10px 13px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.ar}</div>
            </div>
          ))}
        </div>

        {/* Filter + search */}
        <div style={{ display: "flex", gap: 9, marginBottom: 13, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <input value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="بحث باسم المعلم أو المادة..." style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1.5px solid var(--brd)", borderRadius: 10, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {[{ id: "all", ar: "الكل" }, { id: "done", ar: "مكتملة" }, { id: "partial", ar: "ناقصة" }, { id: "missing", ar: "تحتاج متابعة" }].map(f => (
              <button key={f.id} onClick={() => setAdminFilter(f.id as any)} style={{ padding: "5px 11px", borderRadius: 20, border: `1.5px solid ${adminFilter === f.id ? "#E8702A" : "var(--brd)"}`, background: adminFilter === f.id ? "#E8702A" : "var(--bg1)", color: adminFilter === f.id ? "#fff" : "var(--tx2)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{f.ar}</button>
            ))}
          </div>
        </div>

        {/* Portfolio grid */}
        {adminShown.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, color: "var(--tx2)" }}>
            <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 10 }}>📁</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>لا توجد ملفات إنجاز مطابقة</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {adminShown.map(t => {
              const pC = t.pct === 100 ? "#22C55E" : t.pct >= 60 ? "#F59E0B" : "#EF4444";
              const R = 22, C = 2 * Math.PI * R;
              return (
                <div key={t.id} style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, boxShadow: "var(--card-sh)", overflow: "hidden", cursor: "pointer", transition: "all .14s" }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8702A"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--brd)"; (e.currentTarget as HTMLElement).style.transform = ""; }}>
                  <div style={{ height: 3, background: pC }} />
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <svg width={54} height={54} viewBox={`0 0 ${R * 2 + 10} ${R * 2 + 10}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
                        <circle cx={R + 5} cy={R + 5} r={R} fill="none" stroke="var(--bg3)" strokeWidth={5} />
                        <circle cx={R + 5} cy={R + 5} r={R} fill="none" stroke={pC} strokeWidth={5} strokeDasharray={`${C * t.pct / 100} ${C * (1 - t.pct / 100)}`} strokeLinecap="round" />
                        <text x={R + 5} y={R + 8} textAnchor="middle" fontSize={11} fontWeight={800} fill={pC} style={{ transform: "rotate(90deg)", transformOrigin: `${R + 5}px ${R + 5}px` }}>{t.pct}%</text>
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: "var(--tx2)" }}>{t.subject}</div>
                        <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>📄 {t.totalDocs}/{t.totalReq} وثيقة</div>
                      </div>
                      {t.feedback > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", flexShrink: 0 }}>{t.feedback}💬</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 10 }}>
                      {t.lastUpdate ? `آخر تحديث: ${t.lastUpdate}` : "لم يُحدَّث بعد"}
                      {t.status === "approved" && <span style={{ marginRight: 8, padding: "1px 6px", borderRadius: 4, background: "#ECFDF5", color: "#059669", fontWeight: 700 }}>✓ معتمد</span>}
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => sendReminder(t.id)} className="btn btn-sm" style={{ flex: 1, padding: "5px 10px", fontSize: 10.5, background: "#FEF3E8", color: "#E8702A", border: "1px solid rgba(232,112,42,.25)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>📨 تذكير</button>
                      <button onClick={() => approvePortfolio(t.id)} className="btn btn-sm" style={{ flex: 1, padding: "5px 10px", fontSize: 10.5, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>✅ اعتماد</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardLayout>
    );
  }

  /* ══ TEACHER VIEW (default) ══ */
  return (
    <DashboardLayout title={lang === "ar" ? "ملف الإنجاز" : "Achievement Portfolio"}>
      {isAdmin && (
        <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setViewMode("admin")} className="btn btn-g btn-sm">👥 عرض كل المعلمين</button>
        </div>
      )}

      {/* ── Hero Header ── */}
      <div style={{ background: "linear-gradient(135deg,#E8702A 0%,#C2410C 100%)", borderRadius: 16, padding: "20px 22px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,.07) 0%, transparent 60%)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", border: "1.5px solid rgba(255,255,255,.3)", flexShrink: 0 }}>م</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 2 }}>—</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.85)" }}>ملف الإنجاز</div>
            </div>
          </div>
          {/* Ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="70" height="70" viewBox="0 0 70 70" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="6" />
              <circle cx="35" cy="35" r="28" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28 * pct / 100} ${2 * Math.PI * 28 * (100 - pct) / 100}`} />
              <text x="35" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" style={{ transform: "rotate(90deg)", transformOrigin: "35px 35px" }}>{pct}%</text>
            </svg>
            <div style={{ color: "#fff" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{doneCats} / {totalCats}</div>
              <div style={{ fontSize: 11, opacity: .85 }}>أقسام مكتملة</div>
              {pendingComments > 0 && (
                <div style={{ fontSize: 10, background: "rgba(255,255,255,.25)", borderRadius: 6, padding: "2px 7px", marginTop: 4, fontWeight: 700 }}>⚠️ {pendingComments} طلبات عاجلة</div>
              )}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 14, height: 6, background: "rgba(255,255,255,.2)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: "#fff", transition: "width .8s" }} />
        </div>
        {/* Mini stats */}
        <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          {[
            { v: totalDocs, ar: "وثيقة مرفوعة" },
            { v: totalComments, ar: "تعليق" },
            { v: doneCats, ar: "قسم منجز" },
            { v: docsRemaining, ar: "وثيقة متبقية" },
          ].map((s, i) => (
            <div key={i} style={{ color: "rgba(255,255,255,.9)" }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{s.v}</span>{" "}
              <span style={{ fontSize: 11, opacity: .8 }}>{s.ar}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {pendingComments > 0 && (
        <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>⚠️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#DC2626" }}>لديك {pendingComments} طلبات تحتاج متابعة فورية</div>
            <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 2 }}>راجع التعليقات في الأقسام المُشار إليها لاستكمال ملف إنجازك</div>
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12, alignItems: "start" }}>

        {/* Left: Section Nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {catKeys.map(key => {
            const cat = cats[key];
            const isAct = activeKey === key;
            const urgentCnt = cat.comments.filter(c => c.type === "urgent" || c.type === "request").length;
            const fillPct = cat.req ? Math.min(100, Math.round(cat.docs.length / cat.req * 100)) : 0;
            const barColor = cat.status === "done" ? "#22C55E" : cat.status === "partial" ? "#F59E0B" : "#EF4444";
            const stBg = cat.status === "done" ? "#ECFDF5" : cat.status === "partial" ? "#FFFBEB" : "#FEF2F2";
            const actBrd = cat.status === "done" ? "#A7F3D0" : cat.status === "partial" ? "#FCD34D" : "#FCA5A5";
            return (
              <button key={key} onClick={() => switchCat(key)} style={{
                display: "block", width: "100%", textAlign: "right",
                padding: "11px 13px",
                background: isAct ? stBg : "var(--bg1)",
                border: `1.5px solid ${isAct ? actBrd : "var(--brd)"}`,
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "all .13s",
                outline: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{cat.ico}</span>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--tx0)" }}>{cat.ar}</div>
                    <div style={{ fontSize: 9.5, color: "var(--tx2)", marginTop: 1 }}>{cat.docs.length}/{cat.req} وثائق</div>
                  </div>
                  {urgentCnt > 0 && (
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#DC2626", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{urgentCnt}</span>
                  )}
                </div>
                <div style={{ height: 3, background: "rgba(0,0,0,.08)", borderRadius: 2, overflow: "hidden", marginTop: 7 }}>
                  <div style={{ height: "100%", borderRadius: 2, width: `${fillPct}%`, background: barColor, transition: "width .5s" }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Section Detail */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>

          {/* Section Header */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--brd)", background: `${actCat.color}0A` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{actCat.ico}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{actCat.ar}</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)" }}>مطلوب: {actCat.req} وثائق · متوفر: {actCat.docs.length}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: pill.bg, color: pill.color, border: `1px solid ${pill.brd}` }}>{pill.label}</span>
                <button onClick={() => setSectionTab("upload")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#E8702A", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ⬆ رفع وثيقة
                </button>
              </div>
            </div>
            {/* Progress */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: "var(--tx2)" }}>اكتمال القسم</span>
                <span style={{ fontWeight: 800, color: actCat.color }}>{ringPct}%</span>
              </div>
              <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${ringPct}%`, background: actCat.color, transition: "width .5s" }} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--brd)", background: "var(--bg1)" }}>
            {([
              { id: "docs" as SectionTab, ar: "الوثائق", ico: "📁", badge: actCat.docs.length },
              { id: "comments" as SectionTab, ar: "التعليقات", ico: "💬", badge: actCat.comments.length },
              { id: "upload" as SectionTab, ar: "رفع جديد", ico: "⬆️", badge: null },
            ]).map(t => (
              <button key={t.id} onClick={() => setSectionTab(t.id)} style={{
                padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, fontWeight: sectionTab === t.id ? 800 : 500,
                color: sectionTab === t.id ? "#E8702A" : "var(--tx2)",
                borderBottom: sectionTab === t.id ? "2px solid #E8702A" : "2px solid transparent",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {t.ico} {t.ar}
                {t.badge !== null && t.badge !== undefined && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 7, background: sectionTab === t.id ? "#E8702A" : "var(--bg3)", color: sectionTab === t.id ? "#fff" : "var(--tx2)", marginRight: 2 }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content: Docs */}
          {sectionTab === "docs" && (
            <div style={{ minHeight: 260 }}>
              {actCat.docs.length === 0 ? (
                <div style={{ padding: 50, textAlign: "center" }}>
                  <div style={{ fontSize: 44, opacity: .25, marginBottom: 12 }}>📂</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>لا توجد وثائق بعد</div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 16 }}>ارفع {actCat.req} وثائق لاستكمال هذا القسم</div>
                  <button onClick={() => setSectionTab("upload")} style={{ padding: "8px 18px", background: "#E8702A", color: "#fff", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>⬆ رفع أول وثيقة</button>
                </div>
              ) : (
                actCat.docs.map((doc, i) => {
                  const ft = FTYPE_META[doc.type] || FTYPE_META.pdf;
                  return (
                    <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < actCat.docs.length - 1 ? "1px solid var(--brd)" : "none" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: ft.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{ft.ico}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: ft.bg, color: ft.color, border: `1px solid ${ft.color}30` }}>{doc.type.toUpperCase()}</span>
                          <span style={{ fontSize: 10, color: "var(--tx2)" }}>📅 {doc.date}</span>
                          <span style={{ fontSize: 10, color: "var(--tx2)" }}>💾 {doc.size}</span>
                          {doc.comments > 0 && <span style={{ fontSize: 10, color: "#2563EB", fontWeight: 700 }}>💬 {doc.comments} تعليق</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                        <button style={{ fontSize: 11, padding: "4px 9px", background: "var(--bg3)", border: "1.5px solid var(--brd)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>⬇️</button>
                        <button onClick={() => deleteDoc(activeKey, doc.id)} style={{ fontSize: 11, padding: "4px 9px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Content: Comments */}
          {sectionTab === "comments" && (
            <div style={{ padding: "14px 18px", minHeight: 260 }}>
              {actCat.comments.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
                  <div style={{ fontSize: 36, opacity: .2, marginBottom: 8 }}>💬</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>لا توجد تعليقات بعد</div>
                </div>
              ) : (
                actCat.comments.map(cm => {
                  const ct = CTYPE_META[cm.type] || CTYPE_META.general;
                  return (
                    <div key={cm.id} style={{ background: ct.bg, border: `1.5px solid ${ct.brd}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: cm.av, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{cm.author.charAt(0)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 800 }}>{cm.author}</div>
                          <div style={{ fontSize: 10, color: "var(--tx2)" }}>{cm.date}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ct.c }}>{ct.ico}</span>
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: ct.c }}>{cm.text}</div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Content: Upload */}
          {sectionTab === "upload" && (
            <div style={{ padding: "18px 20px" }}>
              {/* Drop zone */}
              <label style={{ display: "block", border: "2px dashed var(--brd2)", borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", background: uploadFile ? "#FEF3E8" : "var(--bg3)", transition: "border-color .15s" }}>
                <input type="file" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 5 }}>{uploadFile ? uploadFile.name : "اسحب الملف هنا أو اضغط للاختيار"}</div>
                <div style={{ fontSize: 11, color: "var(--tx2)" }}>PDF · Word · صور · فيديو — الحد 50 MB</div>
              </label>
              {/* Description */}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 }}>وصف الوثيقة (اختياري)</label>
                <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="مثال: خطة الأسبوع الثالث..."
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 11px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", outline: "none" }} />
              </div>
              <button onClick={uploadDocument} disabled={uploading || !uploadFile} style={{ marginTop: 12, width: "100%", padding: "10px", background: "#E8702A", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: (uploading || !uploadFile) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: (uploading || !uploadFile) ? 0.5 : 1 }}>
                ⬆ {uploading ? "جاري الرفع…" : "رفع الوثيقة"}
              </button>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
