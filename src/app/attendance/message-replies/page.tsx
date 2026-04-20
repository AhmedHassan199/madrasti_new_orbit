"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { attendanceApi } from "@/lib/attendance-api";
import Pagination, { useClientPagination } from "@/components/attendance/Pagination";

interface Reply {
  id: number;
  reply_text: string;
  attachment: string | null;
  attachment_url: string | null;
  message_id: number;
  message_body: string | null;
  employee: { id: number; name: string; identifier: string } | null;
  created_at: string | null;
}

export default function MessageRepliesPage() {
  const { lang } = useUi();
  const [rows, setRows] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Reply | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r: any = await attendanceApi.replies.list({});
      setRows(Array.isArray(r) ? r : (r?.data ?? []));
    } catch { setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      (r.employee?.name ?? "").toLowerCase().includes(s) ||
      (r.employee?.identifier ?? "").toLowerCase().includes(s) ||
      (r.reply_text ?? "").toLowerCase().includes(s) ||
      (r.message_body ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    withAttachment: rows.filter(r => r.attachment).length,
    today: rows.filter(r => r.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
  }), [rows]);

  const pg = useClientPagination(filtered, 20);

  return (
    <DashboardLayout
      title={lang === "ar" ? "ردود الرسائل" : "Message Replies"}
      subtitle={lang === "ar" ? "الردود المستلمة على رسائل الحضور من أولياء الأمور" : "Received replies from guardians"}
    >
      {/* ═══ STATS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="إجمالي الردود" value={stats.total} c="#2563EB" bg="#EFF6FF" ico="💬" />
        <StatCard label="بمرفقات" value={stats.withAttachment} c="#7C3AED" bg="#F5F3FF" ico="📎" />
        <StatCard label="اليوم" value={stats.today} c="#059669" bg="#ECFDF5" ico="📅" />
      </div>

      {/* ═══ SEARCH BAR ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          placeholder="ابحث بالاسم، الهوية، نص الرد أو الرسالة…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, background: "var(--bg2)", color: "var(--tx1)" }}
        />
        <span style={{ fontSize: 11, color: "var(--tx2)", whiteSpace: "nowrap" }}>
          {filtered.length} / {rows.length}
        </span>
      </div>

      {/* ═══ TABLE ═══ */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--tx2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>💬</div>
            {rows.length ? "لا نتائج مطابقة" : "لا يوجد ردود حتى الآن"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg3)", borderBottom: "2px solid var(--brd)" }}>
                  <th style={th}>#</th>
                  <th style={th}>صاحب الرد</th>
                  <th style={th}>نص الرسالة</th>
                  <th style={th}>الرد</th>
                  <th style={th}>المرفق</th>
                  <th style={th}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--brd)" }}>
                    <td style={{ ...td, color: "var(--tx2)", fontFamily: "var(--fm)" }}>{pg.start + i + 1}</td>
                    <td style={td}>
                      {r.employee ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.employee.name}</div>
                          <div style={{ fontFamily: "var(--fm)", fontSize: 11, color: "var(--tx2)", direction: "ltr", textAlign: "right" }}>{r.employee.identifier}</div>
                        </div>
                      ) : "—"}
                    </td>
                    <td style={{ ...td, maxWidth: 260 }}>
                      <div style={{ color: "var(--tx2)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.message_body ?? "—"}
                      </div>
                    </td>
                    <td style={{ ...td, maxWidth: 320 }}>
                      <div style={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", maxHeight: 40 }}>
                        {r.reply_text}
                      </div>
                    </td>
                    <td style={td}>
                      {r.attachment_url ? (
                        <a href={r.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", textDecoration: "none" }}>
                          📎 عرض
                        </a>
                      ) : <span style={{ color: "var(--tx2)" }}>—</span>}
                    </td>
                    <td style={{ ...td, fontFamily: "var(--fm)", fontSize: 11, color: "var(--tx2)", whiteSpace: "nowrap" }}>
                      {r.created_at ? r.created_at.slice(0, 16).replace("T", " ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={pg.page} perPage={pg.perPage} total={pg.total} lastPage={pg.lastPage}
              onPageChange={pg.setPage} onPerPageChange={(n) => { pg.setPerPage(n); pg.reset(); }}
            />
          </div>
        )}
      </div>

      {detail && <DetailModal reply={detail} onClose={() => setDetail(null)} />}
    </DashboardLayout>
  );
}

/* ═══════════════════════════════════════ */
function StatCard({ label, value, c, bg, ico }: { label: string; value: number; c: string; bg: string; ico: string }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        {ico}
      </div>
      <div>
        <div style={{ fontSize: 10, color: "var(--tx2)" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "var(--fm)" }}>{value.toLocaleString("ar-EG")}</div>
      </div>
    </div>
  );
}

function DetailModal({ reply, onClose }: { reply: any; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 12, padding: 20, maxWidth: 600, width: "90%", maxHeight: "85vh", overflow: "auto" }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>تفاصيل الرد</h3>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <div><strong>الرد:</strong> {reply.reply_text}</div>
        </div>
        <button onClick={onClose} style={{ marginTop: 16, padding: "7px 14px", background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 6, cursor: "pointer" }}>إغلاق</button>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "right", fontSize: 10, color: "var(--tx2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12, verticalAlign: "top" };
