"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { examDistApi } from "@/lib/modules-api";

/* Grade → color palette */
const GRADE_COLORS = ["#3B82F6", "#059669", "#F59E0B", "#DC2626", "#7C3AED", "#0891B2", "#EC4899", "#10B981"];

function gradeKeyFromCls(cls: string): string {
  /* "3/أ" → "الصف الثالث" */
  const num = parseInt(String(cls).match(/\d+/)?.[0] ?? "0", 10);
  const ar = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع"][num] ?? String(num);
  return `الصف ${ar}`;
}

interface Seat {
  id: string;
  seatNo: number;
  name: string;
  cls: string;
  nationalId: string;
  roomId: string;
  roomName: string;
  supervisor: string;
  gradeKey: string;
  gradeColor: string;
}

export default function SeatNumbersPage() {
  const { lang } = useUi();
  const [loading, setLoading] = useState(true);
  const [seats, setSeats]     = useState<Seat[]>([]);
  const [examTitle, setExamTitle] = useState("");

  const [search, setSearch]   = useState("");
  const [selRoom, setSelRoom] = useState("all");
  const [selCls, setSelCls]   = useState("all");
  const [view, setView]       = useState<"cards" | "list">("cards");

  /* Fetch all sessions then all seats */
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const r: any = await examDistApi.sessions({});
        const sessions = r.data ?? r ?? [];
        if (!Array.isArray(sessions) || sessions.length === 0) {
          setSeats([]);
          return;
        }

        /* Use most recent session title */
        setExamTitle(sessions[0]?.title ?? sessions[0]?.name ?? "اختبارات نهاية الفصل");

        /* Fetch seats for all sessions + aggregate */
        const allSeats: any[] = [];
        for (const s of sessions) {
          try {
            const sr: any = await examDistApi.seats(s.id);
            const arr = sr.data ?? sr ?? [];
            if (Array.isArray(arr)) allSeats.push(...arr);
          } catch { /* silent */ }
        }

        /* Assign a color per grade key deterministically */
        const gradeColorMap: Record<string, string> = {};
        const mapped: Seat[] = allSeats.map((raw: any, i: number) => {
          const cls  = raw.student?.group?.name ?? raw.group_name ?? raw.cls ?? "—";
          const gradeKey = gradeKeyFromCls(cls);
          if (!gradeColorMap[gradeKey]) {
            gradeColorMap[gradeKey] = GRADE_COLORS[Object.keys(gradeColorMap).length % GRADE_COLORS.length];
          }
          return {
            id:          String(raw.id ?? i),
            seatNo:      Number(raw.seat_number ?? i + 1),
            name:        raw.student?.name ?? raw.employee?.name ?? raw.name ?? "—",
            cls,
            nationalId:  raw.student?.national_id ?? raw.employee?.national_id ?? "",
            roomId:      String(raw.room?.id ?? raw.room_id ?? "0"),
            roomName:    raw.room?.name ?? raw.room_name ?? "قاعة —",
            supervisor:  raw.room?.supervisor ?? raw.supervisor ?? "—",
            gradeKey,
            gradeColor:  gradeColorMap[gradeKey],
          };
        });
        setSeats(mapped);
      } catch {
        setSeats([]);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  /* Derived */
  const rooms = useMemo(() => {
    const map = new Map<string, { id: string; name: string; supervisor: string }>();
    seats.forEach(s => { if (!map.has(s.roomId)) map.set(s.roomId, { id: s.roomId, name: s.roomName, supervisor: s.supervisor }); });
    return [...map.values()];
  }, [seats]);
  const classes = useMemo(() => [...new Set(seats.map(s => s.cls))].sort(), [seats]);

  const shown = useMemo(() => {
    let list = seats.slice();
    if (selRoom !== "all") list = list.filter(s => s.roomId === selRoom);
    if (selCls  !== "all") list = list.filter(s => s.cls === selCls);
    if (search) list = list.filter(s => s.name.includes(search) || String(s.seatNo).includes(search));
    return list.sort((a, b) => a.seatNo - b.seatNo);
  }, [seats, selRoom, selCls, search]);

  /* Group shown by room */
  const byRoom = useMemo(() => {
    const out: Record<string, { id: string; name: string; supervisor: string; students: Seat[] }> = {};
    shown.forEach(s => {
      if (!out[s.roomId]) out[s.roomId] = { id: s.roomId, name: s.roomName, supervisor: s.supervisor, students: [] };
      out[s.roomId].students.push(s);
    });
    return out;
  }, [shown]);

  function printAll() { window.print(); }
  function printRoom(roomId: string) {
    const prev = selRoom;
    setSelRoom(roomId);
    setTimeout(() => {
      window.print();
      setTimeout(() => setSelRoom(prev), 500);
    }, 200);
  }
  function exportExcel() {
    const rows = ["رقم الجلوس,اسم الطالب,الفصل,الصف,القاعة,المراقب,رقم الهوية"];
    shown.forEach(s => {
      rows.push([s.seatNo, s.name, s.cls, s.gradeKey, s.roomName, s.supervisor, s.nationalId].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `seat-numbers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout title="أرقام الجلوس" subtitle={examTitle || "اختبارات نهاية الفصل"}>
      <style>{`
        @media print { .no-print { display: none !important; } }
        .sn-seat-card { width: 106px; padding: 11px 8px; border: 1.5px solid; border-radius: 11px; text-align: center; cursor: pointer; transition: all .15s; }
        .sn-seat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0,0,0,.1); }
        .sn-num { font-size: 28px; font-weight: 900; font-family: var(--fm); line-height: 1; margin-bottom: 6px; }
        .sn-name { font-size: 10.5px; font-weight: 700; line-height: 1.35; margin-bottom: 6px; min-height: 28px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .sn-cls-chip { font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 10px; display: inline-block; }
        .sn-row { display: grid; grid-template-columns: 56px 1fr 80px 90px 90px; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--brd); align-items: center; }
        .sn-row:last-child { border-bottom: none; }
        .sn-room-header { padding: 12px 14px; border-bottom: 1px solid var(--brd); background: var(--bg3); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
      `}</style>

      {/* ══ HEADER ══ */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>🪑 أرقام الجلوس</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>{examTitle || "اختبارات نهاية الفصل"}</div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button onClick={exportExcel} className="btn btn-g btn-sm">📤 تصدير Excel</button>
          <button onClick={printAll} className="btn btn-p btn-sm">🖨️ طباعة الكل</button>
        </div>
      </div>

      {/* ══ STATS ══ */}
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { v: seats.length,    l: "إجمالي الطلاب", c: "#E8702A", bg: "#FEF3E8", br: "rgba(232,112,42,.2)" },
          { v: rooms.length,    l: "القاعات",       c: "#2563EB", bg: "#EFF6FF", br: "#BFDBFE" },
          { v: classes.length,  l: "الفصول",         c: "#7C3AED", bg: "#F5F3FF", br: "#DDD6FE" },
          { v: shown.length,    l: "معروض",          c: "#059669", bg: "#ECFDF5", br: "#A7F3D0" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.br}`, borderRadius: 11, padding: "10px 13px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fm)", color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ══ FILTERS ══ */}
      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 13, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 280 }}>
          <svg style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="اسم الطالب أو رقم الجلوس..."
            style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", paddingRight: 30, border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
        </div>

        <select value={selRoom} onChange={e => setSelRoom(e.target.value)} style={{ padding: "7px 11px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
          <option value="all">كل القاعات</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <select value={selCls} onChange={e => setSelCls(e.target.value)} style={{ padding: "7px 11px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
          <option value="all">كل الفصول</option>
          {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
        </select>

        {/* View toggle */}
        <div style={{ display: "flex", border: "1.5px solid var(--brd)", borderRadius: 9, overflow: "hidden", flexShrink: 0 }}>
          <button onClick={() => setView("cards")} title="بطاقات" style={{ padding: "7px 13px", border: "none", background: view === "cards" ? "#E8702A" : "var(--bg1)", color: view === "cards" ? "#fff" : "var(--tx2)", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>⊞</button>
          <button onClick={() => setView("list")} title="قائمة" style={{ padding: "7px 13px", border: "none", background: view === "list" ? "#E8702A" : "var(--bg1)", color: view === "list" ? "#fff" : "var(--tx2)", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>☰</button>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل...</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, boxShadow: "var(--card-sh)" }}>
          <div style={{ fontSize: 48, opacity: 0.25, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx2)" }}>
            {seats.length === 0 ? "لا توجد مقاعد موزعة بعد — ابدأ التوزيع من صفحة اختبارات" : "لا توجد نتائج مطابقة"}
          </div>
        </div>
      ) : view === "cards" ? (
        /* ── CARDS VIEW ── */
        <>
          {Object.entries(byRoom).map(([roomId, room]) => {
            const clsInRoom = [...new Set(room.students.map(s => s.cls))].sort();
            return (
              <div key={roomId} style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)", marginBottom: 14 }}>
                <div className="sn-room-header no-print">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#E8702A,#C2410C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", flexShrink: 0 }}>🪑</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{room.name}</div>
                      <div style={{ fontSize: 10, color: "var(--tx2)" }}>{room.supervisor} · {room.students.length} طالب</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {clsInRoom.map(cl => {
                      const firstStu = room.students.find(s => s.cls === cl)!;
                      const cnt = room.students.filter(s => s.cls === cl).length;
                      return (
                        <span key={cl} style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: firstStu.gradeColor + "18", color: firstStu.gradeColor, border: `1px solid ${firstStu.gradeColor}35`, fontWeight: 700 }}>
                          فصل {cl} · {cnt}
                        </span>
                      );
                    })}
                    <button onClick={() => printRoom(roomId)} className="btn btn-g btn-sm" style={{ fontSize: 10 }}>🖨️ طباعة القاعة</button>
                  </div>
                </div>

                {/* Seat cards grid */}
                <div style={{ padding: 14, display: "flex", flexWrap: "wrap", gap: 9 }}>
                  {room.students.map(s => (
                    <div key={s.id} className="sn-seat-card" style={{ background: s.gradeColor + "15", borderColor: s.gradeColor + "45" }} title={`${s.name} · ${s.cls}`}>
                      <div className="sn-num" style={{ color: s.gradeColor }}>{s.seatNo}</div>
                      <div className="sn-name" style={{ color: "var(--tx0)" }}>{s.name}</div>
                      <div className="sn-cls-chip" style={{ background: s.gradeColor + "45", color: s.gradeColor }}>{s.cls}</div>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="no-print" style={{ padding: "8px 14px", borderTop: "1px solid var(--brd)", background: "var(--bg3)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {clsInRoom.map(cl => {
                    const s = room.students.find(x => x.cls === cl)!;
                    return (
                      <span key={cl} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: s.gradeColor, display: "inline-block", flexShrink: 0 }} />
                        فصل {cl} — {s.gradeKey}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        /* ── LIST VIEW ── */
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 80px 90px 90px", gap: 10, padding: "9px 14px", background: "var(--bg3)", borderBottom: "1px solid var(--brd)", fontSize: 11, fontWeight: 800, color: "var(--tx2)" }}>
            <div>الرقم</div>
            <div>الطالب</div>
            <div>الفصل</div>
            <div>القاعة</div>
            <div></div>
          </div>
          {shown.map(s => (
            <div key={s.id} className="sn-row">
              <div style={{ width: 42, height: 42, borderRadius: 10, background: s.gradeColor + "15", border: `2px solid ${s.gradeColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: s.gradeColor, flexShrink: 0, fontFamily: "var(--fm)" }}>{s.seatNo}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>{s.supervisor}</div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: s.gradeColor + "15", color: s.gradeColor, border: `1px solid ${s.gradeColor}35`, fontWeight: 700, flexShrink: 0, textAlign: "center" }}>{s.cls}</span>
              <span style={{ fontSize: 11, color: "var(--tx2)", flexShrink: 0 }}>{s.roomName}</span>
              <button className="btn btn-g btn-sm no-print" style={{ fontSize: 10, flexShrink: 0 }} title={`${s.name} · رقم ${s.seatNo}`}>🪪</button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
