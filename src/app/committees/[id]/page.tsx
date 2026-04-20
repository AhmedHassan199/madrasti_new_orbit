"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { committeesApi } from "@/lib/modules-api";

export default function CommitteeDetailPage() {
  const { id }                    = useParams<{ id: string }>();
  const { lang }                  = useUi();
  const [committee, setCommittee] = useState<any>(null);
  const [members, setMembers]     = useState<any[]>([]);
  const [files, setFiles]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"info" | "members" | "files">("info");

  const [newMember, setNewMember] = useState({ employee_id: "", role: "" });
  const [newFile, setNewFile]     = useState({ name: "", url: "" });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      committeesApi.show(id),
      committeesApi.members(id),
      committeesApi.files(id),
    ]).then(([c, m, f]: any[]) => {
      setCommittee(c.data ?? c);
      setMembers(m.data ?? m ?? []);
      setFiles(f.data ?? f ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAddMember = () => {
    if (!newMember.employee_id) return;
    setSaving(true);
    committeesApi.addMember(id!, newMember)
      .then(() => committeesApi.members(id!))
      .then((m: any) => { setMembers(m.data ?? m ?? []); setNewMember({ employee_id: "", role: "" }); })
      .finally(() => setSaving(false));
  };

  const handleAddFile = () => {
    if (!newFile.name) return;
    setSaving(true);
    committeesApi.addFile(id!, newFile)
      .then(() => committeesApi.files(id!))
      .then((f: any) => { setFiles(f.data ?? f ?? []); setNewFile({ name: "", url: "" }); })
      .finally(() => setSaving(false));
  };

  const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
  const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)" };
  const TABS = [
    { key: "info",    ar: "المعلومات", en: "Info" },
    { key: "members", ar: "الأعضاء",  en: "Members" },
    { key: "files",   ar: "الملفات",  en: "Files" },
  ];

  return (
    <DashboardLayout title={lang === "ar" ? "تفاصيل اللجنة" : "Committee Detail"}>
      {loading ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
      ) : (
        <>
          <PageCard>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(232,112,42,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👥</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--tx0)" }}>{committee?.name}</div>
                {committee?.type && <div style={{ fontSize: 11, color: "#E8702A", fontWeight: 700 }}>{committee.type}</div>}
                {committee?.description && <div style={{ fontSize: 12, color: "var(--tx2)", marginTop: 2 }}>{committee.description}</div>}
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

          {tab === "info" && (
            <PageCard title={lang === "ar" ? "معلومات اللجنة" : "Committee Info"}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[
                  { ar: "عدد الأعضاء", en: "Members", val: members.length },
                  { ar: "عدد الملفات", en: "Files",   val: files.length },
                  { ar: "تاريخ الإنشاء", en: "Created", val: committee?.created_at?.slice(0, 10) ?? "—" },
                ].map((k, i) => (
                  <div key={i} style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--go)" }}>{k.val}</div>
                    <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 4 }}>{lang === "ar" ? k.ar : k.en}</div>
                  </div>
                ))}
              </div>
            </PageCard>
          )}

          {tab === "members" && (
            <PageCard title={lang === "ar" ? "أعضاء اللجنة" : "Committee Members"}
              actions={
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="fi" placeholder={lang === "ar" ? "رقم الموظف" : "Employee ID"} value={newMember.employee_id}
                    onChange={(e) => setNewMember((p) => ({ ...p, employee_id: e.target.value }))} style={{ width: 120 }} />
                  <input className="fi" placeholder={lang === "ar" ? "الدور" : "Role"} value={newMember.role}
                    onChange={(e) => setNewMember((p) => ({ ...p, role: e.target.value }))} style={{ width: 120 }} />
                  <button className="btn btn-p btn-sm" onClick={handleAddMember} disabled={saving}>
                    {lang === "ar" ? "إضافة" : "Add"}
                  </button>
                </div>
              }
            >
              {!members.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا يوجد أعضاء" : "No members"}</p>
              ) : (
                <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={th}>{lang === "ar" ? "العضو" : "Member"}</th>
                      <th style={th}>{lang === "ar" ? "الدور في اللجنة" : "Role"}</th>
                      <th style={th}>{lang === "ar" ? "تاريخ الانضمام" : "Joined"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m: any, i) => (
                      <tr key={m.id ?? i} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                        <td style={{ ...td, fontWeight: 600, color: "var(--tx0)" }}>{m.employee?.name ?? m.name ?? "—"}</td>
                        <td style={td}>{m.role ?? m.pivot?.role ?? "—"}</td>
                        <td style={{ ...td, direction: "ltr" }}>{m.joined_at ?? m.created_at?.slice(0, 10) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </PageCard>
          )}

          {tab === "files" && (
            <PageCard title={lang === "ar" ? "ملفات اللجنة" : "Committee Files"}
              actions={
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="fi" placeholder={lang === "ar" ? "اسم الملف" : "File name"} value={newFile.name}
                    onChange={(e) => setNewFile((p) => ({ ...p, name: e.target.value }))} style={{ width: 160 }} />
                  <input className="fi" placeholder="URL" value={newFile.url}
                    onChange={(e) => setNewFile((p) => ({ ...p, url: e.target.value }))} style={{ width: 200 }} />
                  <button className="btn btn-p btn-sm" onClick={handleAddFile} disabled={saving}>
                    {lang === "ar" ? "إضافة" : "Add"}
                  </button>
                </div>
              }
            >
              {!files.length ? (
                <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لا توجد ملفات" : "No files"}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.map((f: any, i) => (
                    <div key={f.id ?? i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--bg3)", borderRadius: 8 }}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx0)" }}>{f.name ?? f.file_name}</div>
                        <div style={{ fontSize: 10, color: "var(--tx2)" }}>{f.created_at?.slice(0, 10) ?? ""}</div>
                      </div>
                      {f.url && (
                        <a href={f.url} target="_blank" rel="noreferrer" className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>
                          {lang === "ar" ? "تحميل" : "Download"}
                        </a>
                      )}
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
