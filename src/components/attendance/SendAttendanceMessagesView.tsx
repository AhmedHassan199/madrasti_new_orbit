"use client";

import { useState, useEffect, useMemo } from "react";
import { attendanceApi } from "@/lib/attendance-api";
import Pagination, { useClientPagination } from "./Pagination";

interface Props {
  type: "student" | "teacher";
  roleLabel: string;
  balanceFetcher: () => Promise<any>;
  sendFetcher: (data: { transaction_ids: number[]; body?: string }) => Promise<any>;
}

const STATUS_META: Record<number, { ar: string; c: string; bg: string }> = {
  2: { ar: "متأخر",  c: "#D97706", bg: "#FFFBEB" },
  3: { ar: "غائب",   c: "#DC2626", bg: "#FEF2F2" },
  4: { ar: "مستأذن", c: "#0891B2", bg: "#ECFEFF" },
};

export default function SendAttendanceMessagesView({ type, roleLabel, balanceFetcher, sendFetcher }: Props) {
  /* Transactions list (late/absent/excused with no message yet) */
  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [balance, setBalance]     = useState<number | null>(null);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState<"all" | "2" | "3" | "4">("all");
  const [dateFilter, setDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [customBody, setBody]     = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [busy, setBusy]           = useState(false);
  const [toast, setToast]         = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      // Use daily endpoint, but filter to statuses that need messaging
      const api = type === "student" ? attendanceApi.students.daily : attendanceApi.teachers.daily;
      const params: any = { is_search: true };
      if (dateFilter) params.start_date = dateFilter;
      const r: any = await api(params);
      // Response shape from grouped(): { data: [groups], filters, meta }
      // api() returns full object when multiple keys, or unwraps to 'data' when only one.
      const groups = Array.isArray(r) ? r : (r?.data ?? []);
      const all: any[] = [];
      groups.forEach((grp: any) => {
        (grp?.transactions ?? []).forEach((t: any) => {
          if ([2, 3, 4].includes(t.status)) all.push(t);
        });
      });
      setRows(all);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  async function loadBalance() {
    try {
      const r: any = await balanceFetcher();
      setBalance(r?.data?.balance ?? r?.balance ?? 0);
    } catch { setBalance(0); }
  }

  useEffect(() => { load(); loadBalance(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== "all") list = list.filter(r => String(r.status) === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        (r.employee?.name ?? "").toLowerCase().includes(s) ||
        (r.employee?.identifier ?? "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [rows, search, statusFilter]);

  const pg = useClientPagination(filtered, 30);

  const counts = useMemo(() => ({
    total: rows.length,
    late:  rows.filter(r => r.status === 2).length,
    absent: rows.filter(r => r.status === 3).length,
    excused: rows.filter(r => r.status === 4).length,
  }), [rows]);

  function toggle(id: number) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === pg.paginated.length) setSelected(new Set());
    else setSelected(new Set(pg.paginated.map(r => r.id).filter(Boolean)));
  }

  async function send() {
    const ids = Array.from(selected);
    if (!ids.length) { setToast({ ok: false, msg: `اختر ${roleLabel} واحد على الأقل` }); return; }
    if (balance !== null && balance < ids.length) {
      setToast({ ok: false, msg: `الرصيد غير كافي (متاح ${balance}، مطلوب ${ids.length})` });
      return;
    }
    if (!confirm(`إرسال ${ids.length} رسالة؟`)) return;
    setBusy(true);
    try {
      const r: any = await sendFetcher({
        transaction_ids: ids,
        body: useCustom && customBody.trim() ? customBody : undefined,
      });
      const data = r?.data ?? r;
      setToast({
        ok: data?.success !== false,
        msg: data?.message ?? "تم الإرسال",
      });
      setSelected(new Set());
      if (typeof data?.balance === "number") setBalance(data.balance);
      else loadBalance();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الإرسال" });
    } finally { setBusy(false); }
  }

  return (
    <>
      {/* BALANCE + STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{
          background: balance !== null && balance < 100 ? "linear-gradient(135deg,#FEE2E2,#FECACA)" : "linear-gradient(135deg,#ECFDF5,#A7F3D0)",
          border: "1px solid " + (balance !== null && balance < 100 ? "#FCA5A5" : "#6EE7B7"),
          borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💰</div>
          <div>
            <div style={{ fontSize: 10, color: balance !== null && balance < 100 ? "#991B1B" : "#065F46", fontWeight: 700 }}>رصيد الرسائل</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: balance !== null && balance < 100 ? "#DC2626" : "#059669", fontFamily: "var(--fm)" }}>
              {balance === null ? "…" : balance.toLocaleString("ar-EG")}
            </div>
          </div>
          <button onClick={loadBalance} style={{ marginInlineStart: "auto", padding: "4px 8px", fontSize: 10, background: "rgba(255,255,255,.5)", border: 0, borderRadius: 4, cursor: "pointer" }}>🔄</button>
        </div>
        <Stat label="الإجمالي" value={counts.total} c="#2563EB" bg="#EFF6FF" />
        <Stat label="متأخر"    value={counts.late}   c="#D97706" bg="#FFFBEB" />
        <Stat label="غائب"     value={counts.absent} c="#DC2626" bg="#FEF2F2" />
        <Stat label="مستأذن"   value={counts.excused} c="#0891B2" bg="#ECFEFF" />
      </div>

      {/* TOOLBAR */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <input
            type="text" placeholder={`ابحث في ${roleLabel}…`} value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
          />
          <input type="date" value={dateFilter} onChange={e => setDate(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }} />
          <select value={statusFilter} onChange={e => setStatus(e.target.value as any)}
            style={{ padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, background: "var(--bg2)", color: "var(--tx1)" }}>
            <option value="all">كل الحالات</option>
            <option value="2">متأخر</option>
            <option value="3">غائب</option>
            <option value="4">مستأذن</option>
          </select>
          <button onClick={load} disabled={loading} style={btnGhost}>🔍 بحث</button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} />
            استخدم نص مخصّص بدل القوالب الجاهزة (من إعدادات الإرسال)
          </label>
          {useCustom && (
            <textarea
              value={customBody} onChange={e => setBody(e.target.value)}
              placeholder="اكتب نص الرسالة. يمكنك استخدام {mem} {day} {date} {time}"
              rows={3}
              style={{ width: "100%", marginTop: 6, padding: 10, border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: "var(--bg2)", color: "var(--tx1)", resize: "vertical" }}
            />
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={send} disabled={busy || !selected.size} style={btnGreen}>
            {busy ? "جاري الإرسال…" : `✉️ إرسال (${selected.size})`}
          </button>
          {selected.size > 0 && (
            <span style={{ fontSize: 11, color: "var(--tx2)" }}>
              التكلفة المتوقعة: <strong style={{ fontFamily: "var(--fm)", color: "#D97706" }}>{selected.size}</strong> رسالة
            </span>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit", fontSize: 14 }}>×</button>
        </div>
      )}

      {/* TABLE */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>✉️</div>
            لا توجد بصمات تحتاج إرسال رسالة
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                    <th style={{ ...th, width: 40 }}>
                      <input type="checkbox" checked={pg.paginated.length > 0 && pg.paginated.every(r => selected.has(r.id))} onChange={toggleAll} />
                    </th>
                    <th style={th}>#</th>
                    <th style={th}>الاسم</th>
                    <th style={th}>الهوية</th>
                    <th style={th}>الهاتف</th>
                    <th style={th}>التاريخ</th>
                    <th style={th}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.paginated.map((r, i) => {
                    const isSel = r.id && selected.has(r.id);
                    const meta = STATUS_META[r.status];
                    return (
                      <tr key={r.id ?? i} style={{ borderBottom: "1px solid var(--brd)", background: isSel ? "rgba(232,112,42,.06)" : undefined }}>
                        <td style={td}>
                          {r.id ? <input type="checkbox" checked={isSel} onChange={() => toggle(r.id)} /> : "—"}
                        </td>
                        <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{r.employee?.name ?? "—"}</td>
                        <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right" }}>{r.employee?.identifier ?? "—"}</td>
                        <td style={{ ...td, fontFamily: "var(--fm)", direction: "ltr", textAlign: "right", color: r.employee?.phone ? "var(--tx1)" : "#DC2626" }}>
                          {r.employee?.phone ?? "بدون"}
                        </td>
                        <td style={{ ...td, fontFamily: "var(--fm)" }}>{r.punch_date}</td>
                        <td style={td}>
                          {meta && (
                            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, color: meta.c, background: meta.bg }}>
                              {meta.ar}
                            </span>
                          )}
                        </td>
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
          </>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, c, bg }: { label: string; value: number; c: string; bg: string }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: "var(--tx2)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: c, fontFamily: "var(--fm)", padding: "2px 8px", background: bg, display: "inline-block", borderRadius: 4, marginTop: 2 }}>
        {value.toLocaleString("ar-EG")}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12 };
const btnGreen: React.CSSProperties = { padding: "10px 18px", background: "#059669", color: "#fff", border: 0, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "var(--bg3)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
