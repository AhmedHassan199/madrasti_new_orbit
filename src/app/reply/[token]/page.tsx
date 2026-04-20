"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

/**
 * Public page (no auth) for parents/guardians to reply to a message via a link token.
 * Mirrors orbit-fingerprint-user/resources/views/pages/message_replies/create.blade.php
 */
export default function ReplyPublicPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/smos";
      const res = await fetch(`${base}/reply/${token}`);
      const data = await res.json();
      if (res.status === 404) { setError(data?.message ?? "الرابط غير صالح"); return; }
      if (!res.ok) { setError(data?.message ?? "خطأ في تحميل الرسالة"); return; }
      setMessage(data?.data ?? data);
    } catch (e: any) {
      setError("تعذّر الاتصال بالسيرفر");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) { setError("اكتب الرد أولاً"); return; }

    setSubmitting(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/smos";
      const res = await fetch(`${base}/reply/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply_text: replyText }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.message ?? "فشل إرسال الرد"); return; }
      setSubmitted(true);
    } catch { setError("تعذّر الإرسال"); }
    finally { setSubmitting(false); }
  }

  const hoursPassed = message?.created_at
    ? Math.floor((Date.now() - new Date(message.created_at).getTime()) / 3600000)
    : 0;
  const expired = hoursPassed >= 48;
  const hasReply = message?.reply;

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg,#6A11CB,#2575FC)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'Tajawal','Segoe UI',sans-serif", direction: "rtl",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.96)", borderRadius: 25, padding: 40,
        maxWidth: 600, width: "100%", boxShadow: "0 15px 35px rgba(0,0,0,0.3)",
        animation: "fadeIn 0.6s ease-in-out",
      }}>
        <h2 style={{ textAlign: "center", fontWeight: 800, color: "#333", marginBottom: 25, fontSize: 22 }}>
          💬 الرد على الرسالة
        </h2>

        {loading && (
          <div style={{ textAlign: "center", padding: 20, color: "#666", fontSize: 14 }}>جاري التحميل…</div>
        )}

        {error && !submitted && (
          <div style={{ padding: 14, borderRadius: 15, background: "#FEF2F2", color: "#B91C1C", marginBottom: 16, fontSize: 14, textAlign: "center" }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && message && expired && (
          <div style={{ background: "rgba(220,38,38,0.08)", color: "#B22222", borderRadius: 20, padding: 30, textAlign: "center" }}>
            <div style={{ fontSize: 60, marginBottom: 15, animation: "pulse 1.5s infinite" }}>⌛</div>
            <h3 style={{ margin: 0, fontSize: 22, marginBottom: 10 }}>عذراً… الرابط غير متاح</h3>
            <p style={{ fontSize: 16, margin: 0 }}>لقد مرّت أكثر من 48 ساعة على إرسال الرسالة.</p>
          </div>
        )}

        {!loading && !error && message && !expired && hasReply && (
          <div style={{ background: "#F0F8FF", borderRadius: 20, padding: 30, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
            <h4 style={{ fontWeight: 800, color: "#333", margin: 0 }}>هذه الرسالة لديها رد بالفعل</h4>
          </div>
        )}

        {!loading && !error && message && !expired && !hasReply && !submitted && (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 800, color: "#333", marginBottom: 6 }}>نص الرسالة</label>
              <textarea
                readOnly
                rows={3}
                value={message.message_body ?? message.body ?? ""}
                style={{
                  width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ccc",
                  background: "#F9F9F9", color: "#333", textAlign: "right", resize: "none",
                  fontFamily: "inherit", fontSize: 14, boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 800, color: "#333", marginBottom: 6 }}>الرد</label>
              <textarea
                required
                rows={4}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="اكتب ردّك هنا…"
                style={{
                  width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ccc",
                  background: "#fff", color: "#333", textAlign: "right",
                  fontFamily: "inherit", fontSize: 14, boxSizing: "border-box", resize: "vertical",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", padding: 14, borderRadius: 10,
                background: submitting ? "#9CA3AF" : "linear-gradient(135deg,#6A11CB,#2575FC)",
                color: "#fff", fontWeight: 800, border: 0, cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 15, fontFamily: "inherit",
              }}
            >
              {submitting ? "جاري الإرسال…" : "📤 إرسال الرد"}
            </button>
          </form>
        )}

        {submitted && (
          <div style={{ background: "#F0FDF4", borderRadius: 20, padding: 30, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: 0, fontSize: 20, color: "#065F46" }}>تم استلام ردّك بنجاح</h3>
            <p style={{ marginTop: 8, color: "#047857", fontSize: 14 }}>شكراً لتواصلك مع إدارة المدرسة.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
