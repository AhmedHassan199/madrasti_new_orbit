"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageCard from "@/components/attendance/PageCard";
import { useUi } from "@/contexts/UiContext";
import { examDistApi } from "@/lib/modules-api";

export default function ExamSessionDetailPage() {
  const { id }                = useParams<{ id: string }>();
  const { lang }              = useUi();
  const [session, setSession] = useState<any>(null);
  const [seats, setSeats]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([examDistApi.showSession(id), examDistApi.seats(id)])
      .then(([s, seats]: any[]) => {
        setSession(s.data ?? s);
        setSeats(seats.data ?? seats ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [algo, setAlgo] = useState<"interleave" | "byGrade" | "byClass" | "random">("interleave");
  const [settings, setSettings] = useState({ mixGrades: true, separateClass: true, bufferSeats: 1, maxGradesPerRoom: 2 });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [tab, setTab] = useState<"rooms" | "students" | "report">("rooms");

  /* fetch rooms for this session */
  const [rooms, setRooms] = useState<any[]>([]);
  useEffect(() => {
    examDistApi.rooms({}).then((r: any) => {
      const arr = r.data ?? r ?? [];
      setRooms((Array.isArray(arr) ? arr : []).filter((x: any) => String(x.exam_session_id) === String(id)));
    }).catch(() => {});
  }, [id]);

  const handleDistribute = async () => {
    setDistributing(true);
    try {
      await examDistApi.distribute(id!, { algorithm: algo, ...settings });
      const s: any = await examDistApi.seats(id!);
      setSeats(s.data ?? s ?? []);
      setWizardOpen(false);
    } finally { setDistributing(false); }
  };

  const th: React.CSSProperties = { padding: "8px 12px", fontWeight: 700, fontSize: 11, color: "var(--tx2)", borderBottom: "1px solid var(--brd)", textAlign: "right" };
  const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, color: "var(--tx1)", borderBottom: "1px solid var(--brd)", verticalAlign: "middle" };

  // Group seats by room
  const roomMap: Record<string, any[]> = {};
  seats.forEach((seat: any) => {
    const room = seat.room?.name ?? seat.room_id ?? (lang === "ar" ? "غير محدد" : "Unassigned");
    if (!roomMap[room]) roomMap[room] = [];
    roomMap[room].push(seat);
  });

  return (
    <DashboardLayout title={lang === "ar" ? "تفاصيل جلسة الاختبار" : "Exam Session Detail"}>
      {loading ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "جاري التحميل…" : "Loading…"}</p>
      ) : !session ? (
        <p style={{ color: "var(--tx2)", fontSize: 12 }}>{lang === "ar" ? "لم يتم العثور على الجلسة" : "Session not found"}</p>
      ) : (
        <>
          {/* Session info */}
          <PageCard>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
              {[
                { ar: "اسم الجلسة",    en: "Session",   val: session.name },
                { ar: "المادة",         en: "Subject",   val: session.subject ?? "—" },
                { ar: "التاريخ",        en: "Date",      val: session.exam_date ?? "—" },
                { ar: "المدة",          en: "Duration",  val: session.duration ? `${session.duration} ${lang === "ar" ? "دقيقة" : "min"}` : "—" },
                { ar: "إجمالي الطلاب", en: "Students",  val: seats.length },
              ].map((k, i) => (
                <div key={i} style={{ background: "var(--bg3)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "var(--tx2)", fontWeight: 700, marginBottom: 4 }}>{lang === "ar" ? k.ar : k.en}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx0)" }}>{k.val}</div>
                </div>
              ))}
            </div>
          </PageCard>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, borderBottom: "1.5px solid var(--brd)", marginBottom: 12, marginTop: 10 }}>
            {([
              { id: "rooms",    ar: "القاعات",   ico: "🏛", badge: rooms.length },
              { id: "students", ar: "الطلاب",    ico: "🎓", badge: seats.length },
              { id: "report",   ar: "التقرير",    ico: "📊" },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                style={{ padding: "9px 16px", border: "none", background: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: tab === t.id ? "#E8702A" : "var(--tx2)", borderBottom: `2px solid ${tab === t.id ? "#E8702A" : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                {t.ico} {t.ar}
                {("badge" in t) && (t as any).badge > 0 && (
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: tab === t.id ? "#E8702A" : "var(--bg3)", color: tab === t.id ? "#fff" : "var(--tx2)" }}>{(t as any).badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* ROOMS TAB */}
          {tab === "rooms" && (
            <PageCard>
              {rooms.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
                  <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 10 }}>🏛</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>لا قاعات لهذه الجلسة — أضف من صفحة «القاعات»</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {rooms.map((room: any) => {
                    const roomSeats = seats.filter((s: any) => String(s.room?.id ?? s.room_id) === String(room.id));
                    const pct = room.capacity > 0 ? Math.round(roomSeats.length / room.capacity * 100) : 0;
                    const fullColor = pct >= 90 ? "#DC2626" : pct >= 70 ? "#F59E0B" : "#059669";
                    return (
                      <div key={room.id} style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
                        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--brd)", background: "linear-gradient(135deg,#E8702A22,#C2410C22)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>🏛 {room.name}</div>
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: fullColor + "22", color: fullColor, fontWeight: 700 }}>{pct}%</span>
                          </div>
                          {room.supervisor && <div style={{ fontSize: 10, color: "var(--tx2)" }}>👤 {room.supervisor}</div>}
                          {(room.floor || room.building) && <div style={{ fontSize: 10, color: "var(--tx2)" }}>📍 {[room.building, room.floor].filter(Boolean).join(" · ")}</div>}
                        </div>
                        <div style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: "var(--tx2)" }}>السعة المستغلة</span>
                            <span style={{ fontWeight: 800, color: fullColor, fontFamily: "var(--fm)" }}>{roomSeats.length} / {room.capacity ?? "—"}</span>
                          </div>
                          <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: Math.min(100, pct) + "%", background: fullColor }} />
                          </div>
                          {room.notes && <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 8, fontStyle: "italic" }}>📝 {room.notes}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PageCard>
          )}

          {/* STUDENTS TAB */}
          {tab === "students" && (() => {
            const byGrade: Record<string, any[]> = {};
            seats.forEach((s: any) => {
              const g = s.student?.group?.name ?? s.group_name ?? "—";
              if (!byGrade[g]) byGrade[g] = [];
              byGrade[g].push(s);
            });
            const gradeColors: Record<string, string> = {};
            const palette = ["#3B82F6", "#059669", "#F59E0B", "#DC2626", "#7C3AED", "#0891B2", "#EC4899"];
            Object.keys(byGrade).forEach((g, i) => { gradeColors[g] = palette[i % palette.length]; });
            return (
              <PageCard>
                {seats.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
                    <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 10 }}>🎓</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>لا توزيع — ابدأ التوزيع التلقائى</div>
                  </div>
                ) : Object.entries(byGrade).map(([grade, studs]) => (
                  <div key={grade} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: gradeColors[grade] }} />
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{grade}</span>
                      <span style={{ fontSize: 10, color: "var(--tx2)" }}>· {studs.length} طالب</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                      {studs.sort((a: any, b: any) => (a.seat_number ?? 0) - (b.seat_number ?? 0)).map((s: any) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `1px solid ${gradeColors[grade]}33`, background: gradeColors[grade] + "0A", borderRadius: 9 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 9, background: gradeColors[grade] + "22", color: gradeColors[grade], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, fontFamily: "var(--fm)", flexShrink: 0 }}>{s.seat_number ?? "—"}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.student?.name ?? s.employee?.name ?? "—"}</div>
                            <div style={{ fontSize: 10, color: "var(--tx2)" }}>🏛 {s.room?.name ?? "—"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </PageCard>
            );
          })()}

          {/* REPORT TAB */}
          {tab === "report" && (() => {
            const byGrade: Record<string, number> = {};
            const byRoom: Record<string, { total: number; capacity: number; grades: Set<string> }> = {};
            seats.forEach((s: any) => {
              const g = s.student?.group?.name ?? s.group_name ?? "—";
              byGrade[g] = (byGrade[g] ?? 0) + 1;
              const roomId = String(s.room?.id ?? s.room_id ?? "0");
              if (!byRoom[roomId]) {
                const room = rooms.find((r: any) => String(r.id) === roomId);
                byRoom[roomId] = { total: 0, capacity: room?.capacity ?? 0, grades: new Set() };
              }
              byRoom[roomId].total++;
              byRoom[roomId].grades.add(g);
            });
            const conflicts: any[] = [];
            Object.entries(byRoom).forEach(([rid, r]) => {
              if (r.total > r.capacity) conflicts.push({ kind: "overflow", room: rooms.find((x: any) => String(x.id) === rid)?.name, over: r.total - r.capacity });
              if (r.grades.size > (rooms.find((x: any) => String(x.id) === rid)?.max_grades_per_room ?? 2)) {
                conflicts.push({ kind: "mix", room: rooms.find((x: any) => String(x.id) === rid)?.name, count: r.grades.size });
              }
            });
            const maxG = Math.max(1, ...Object.values(byGrade));
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Distribution by grade */}
                <PageCard title="📊 التوزيع حسب الصف">
                  {Object.keys(byGrade).length === 0 ? <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>لا بيانات</div> :
                    Object.entries(byGrade).sort((a, b) => b[1] - a[1]).map(([g, n]) => (
                      <div key={g} style={{ padding: "8px 16px", borderBottom: "1px solid var(--brd)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700 }}>{g}</span>
                          <span style={{ fontFamily: "var(--fm)", fontWeight: 800, color: "#E8702A" }}>{n}</span>
                        </div>
                        <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: Math.round(n / maxG * 100) + "%", background: "linear-gradient(90deg,#E8702A,#F97316)" }} />
                        </div>
                      </div>
                    ))}
                </PageCard>

                {/* Room utilization */}
                <PageCard title="🏛 استغلال القاعات">
                  {rooms.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: "var(--tx2)", fontSize: 12 }}>لا قاعات</div> :
                    rooms.map((room: any) => {
                      const r = byRoom[String(room.id)] ?? { total: 0, capacity: room.capacity ?? 0, grades: new Set() };
                      const pct = r.capacity > 0 ? Math.round(r.total / r.capacity * 100) : 0;
                      const color = pct >= 90 ? "#DC2626" : pct >= 70 ? "#F59E0B" : "#059669";
                      return (
                        <div key={room.id} style={{ padding: "8px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700 }}>{room.name}</div>
                            <div style={{ fontSize: 10, color: "var(--tx2)" }}>{r.total} / {r.capacity} · {r.grades.size} صفوف</div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--fm)", color }}>{pct}%</span>
                        </div>
                      );
                    })}
                </PageCard>

                {/* Conflicts full row */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <PageCard title="⚠️ التعارضات المُكتشفة">
                    {conflicts.length === 0 ? (
                      <div style={{ padding: 30, textAlign: "center" }}>
                        <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#059669" }}>لا تعارضات — التوزيع نظيف</div>
                      </div>
                    ) : conflicts.map((c: any, i: number) => (
                      <div key={i} style={{ padding: "11px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF2F2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚠️</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                            {c.kind === "overflow" ? `تجاوز سعة القاعة — ${c.room}` : `خلط صفوف — ${c.room}`}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>
                            {c.kind === "overflow" ? `+${c.over} طالب فوق السعة` : `${c.count} صفوف فى قاعة واحدة`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </PageCard>
                </div>
              </div>
            );
          })()}

          {/* Distribute wizard modal */}
          {wizardOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={() => !distributing && setWizardOpen(false)}>
              <div onClick={e => e.stopPropagation()} style={{ width: 500, maxWidth: "95vw", background: "var(--bg1)", borderRadius: 14, border: "1px solid var(--brd)", padding: 22 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>⚡ {lang === "ar" ? "معالج توزيع المقاعد" : "Seat Distribution Wizard"}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>{lang === "ar" ? "الخوارزمية" : "Algorithm"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                  {([
                    { id: "interleave", ico: "🔀", ar: "تشعب (مزج الصفوف)" },
                    { id: "byGrade",    ico: "🎓", ar: "حسب الصف" },
                    { id: "byClass",    ico: "🏫", ar: "حسب الفصل" },
                    { id: "random",     ico: "🎲", ar: "عشوائى" },
                  ] as const).map(a => (
                    <button key={a.id} onClick={() => setAlgo(a.id as any)} style={{ padding: "10px 12px", borderRadius: 9, border: `2px solid ${algo === a.id ? "#E8702A" : "var(--brd)"}`, background: algo === a.id ? "#FEF3E8" : "var(--bg1)", color: algo === a.id ? "#E8702A" : "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, textAlign: "right" }}>
                      {a.ico} {a.ar}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>{lang === "ar" ? "الإعدادات" : "Settings"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)", cursor: "pointer" }}>
                    <span style={{ fontSize: 12 }}>مزج الصفوف فى القاعة الواحدة</span>
                    <input type="checkbox" checked={settings.mixGrades} onChange={e => setSettings(p => ({ ...p, mixGrades: e.target.checked }))} />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: "var(--bg3)", borderRadius: 9, border: "1px solid var(--brd)", cursor: "pointer" }}>
                    <span style={{ fontSize: 12 }}>فصل زملاء الفصل (تجنب الجلوس بجانب بعض)</span>
                    <input type="checkbox" checked={settings.separateClass} onChange={e => setSettings(p => ({ ...p, separateClass: e.target.checked }))} />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: "var(--tx2)", display: "block", marginBottom: 3 }}>مسافة بين المقاعد</label>
                      <input type="number" min={0} max={3} value={settings.bufferSeats} onChange={e => setSettings(p => ({ ...p, bufferSeats: Number(e.target.value) }))} style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "var(--fm)", fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "var(--tx2)", display: "block", marginBottom: 3 }}>أقصى صفوف فى القاعة</label>
                      <input type="number" min={1} max={5} value={settings.maxGradesPerRoom} onChange={e => setSettings(p => ({ ...p, maxGradesPerRoom: Number(e.target.value) }))} style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "var(--fm)", fontSize: 12 }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleDistribute} disabled={distributing} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", cursor: distributing ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: distributing ? 0.6 : 1 }}>⚡ {distributing ? "جارى التوزيع..." : "ابدأ التوزيع"}</button>
                  <button onClick={() => setWizardOpen(false)} disabled={distributing} style={{ padding: "10px 16px", borderRadius: 9, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>إلغاء</button>
                </div>
              </div>
            </div>
          )}

          {/* Distribute + view toggle — rooms tab only */}
          {tab === "rooms" && <PageCard title={lang === "ar" ? "توزيع المقاعد" : "Seat Distribution"}
            actions={
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ display: "flex", gap: 2, background: "var(--bg3)", borderRadius: 7, padding: 2 }}>
                  <button onClick={() => setViewMode("grid")} style={{ padding: "4px 10px", fontSize: 11, border: "none", borderRadius: 5, background: viewMode === "grid" ? "var(--bg1)" : "transparent", color: viewMode === "grid" ? "#E8702A" : "var(--tx2)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>▦ شبكة</button>
                  <button onClick={() => setViewMode("list")} style={{ padding: "4px 10px", fontSize: 11, border: "none", borderRadius: 5, background: viewMode === "list" ? "var(--bg1)" : "transparent", color: viewMode === "list" ? "#E8702A" : "var(--tx2)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>☰ قائمة</button>
                </div>
                <button className="btn btn-p btn-sm" onClick={() => setWizardOpen(true)} disabled={distributing}>⚡ {lang === "ar" ? "توزيع تلقائى" : "Auto-Distribute"}</button>
              </div>
            }
          >
            {!seats.length ? (
              <p style={{ color: "var(--tx2)", fontSize: 12 }}>
                {lang === "ar" ? "لا توجد مقاعد. اضغط «توزيع تلقائى» لبدء التوزيع." : "No seats distributed yet."}
              </p>
            ) : viewMode === "grid" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {Object.entries(roomMap).map(([room, roomSeats]) => {
                  /* Grid: auto-calculate columns (try 5 cols) */
                  const cols = 5;
                  const rows = Math.ceil(roomSeats.length / cols);
                  const sorted = roomSeats.slice().sort((a, b) => (a.seat_number ?? 0) - (b.seat_number ?? 0));
                  /* Color by grade/group */
                  const groupColors: Record<string, string> = {};
                  const palette = ["#3B82F6", "#059669", "#7C3AED", "#E8702A", "#DC2626", "#0891B2", "#EC4899", "#F59E0B"];
                  sorted.forEach(s => {
                    const g = s.student?.group?.name ?? s.group_name ?? "—";
                    if (!groupColors[g]) groupColors[g] = palette[Object.keys(groupColors).length % palette.length];
                  });
                  return (
                    <div key={room} style={{ border: "1.5px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px", background: "var(--bg3)", borderBottom: "1px solid var(--brd)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>🏫 {room} — {roomSeats.length} طالب</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {Object.entries(groupColors).map(([g, c]) => (
                            <span key={g} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: c + "22", color: c, border: `1px solid ${c}33`, fontWeight: 700 }}>{g}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: 14 }}>
                        {/* Teacher desk at the front */}
                        <div style={{ textAlign: "center", fontSize: 10, color: "var(--tx2)", marginBottom: 10 }}>📝 مكتب المراقب</div>
                        {Array.from({ length: rows }, (_, r) => (
                          <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6, marginBottom: 6 }}>
                            {Array.from({ length: cols }, (_, c) => {
                              const idx = r * cols + c;
                              const seat = sorted[idx];
                              if (!seat) return <div key={c} />;
                              const g = seat.student?.group?.name ?? seat.group_name ?? "—";
                              const color = groupColors[g] ?? "#6B7280";
                              return (
                                <div key={c} title={seat.student?.name ?? "—"} style={{ padding: "8px 6px", background: color + "18", border: `1.5px solid ${color}44`, borderRadius: 8, textAlign: "center" }}>
                                  <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--fm)", color }}>{seat.seat_number ?? "—"}</div>
                                  <div style={{ fontSize: 9, color: "var(--tx2)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(seat.student?.name ?? "—").split(" ").slice(0, 2).join(" ")}</div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {Object.entries(roomMap).map(([room, roomSeats]) => (
                  <div key={room}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--tx1)", marginBottom: 8 }}>
                      🏫 {lang === "ar" ? "القاعة:" : "Room:"} {room} — {roomSeats.length} {lang === "ar" ? "طالب" : "students"}
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={th}>{lang === "ar" ? "رقم الجلوس" : "Seat No."}</th>
                            <th style={th}>{lang === "ar" ? "الطالب" : "Student"}</th>
                            <th style={th}>{lang === "ar" ? "رقم الهوية" : "ID No."}</th>
                            <th style={th}>{lang === "ar" ? "الفصل" : "Class"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomSeats.slice().sort((a, b) => (a.seat_number ?? 0) - (b.seat_number ?? 0)).map((seat: any, i) => (
                            <tr key={seat.id ?? i} style={{ background: i % 2 === 0 ? "transparent" : "var(--bg3)" }}>
                              <td style={{ ...td, fontWeight: 900, color: "#E8702A", fontSize: 14 }}>{seat.seat_number ?? "—"}</td>
                              <td style={{ ...td, fontWeight: 600, color: "var(--tx0)" }}>{seat.student?.name ?? seat.employee?.name ?? "—"}</td>
                              <td style={{ ...td, direction: "ltr" }}>{seat.student?.national_id ?? "—"}</td>
                              <td style={td}>{seat.student?.group?.name ?? seat.group_name ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>}
        </>
      )}
    </DashboardLayout>
  );
}
