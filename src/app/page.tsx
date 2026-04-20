"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUi } from "@/contexts/UiContext";

type RoleKey = "principal" | "vice" | "counselor" | "teacher";

const roles: {
  key: RoleKey;
  ico: string;
  ar: { name: string; sub: string; title: string };
  en: { name: string; sub: string; title: string };
  email: string;
  badge: { ar: string; en: string };
  color: string;
}[] = [
  { key: "principal", ico: "🏫",
    ar: { name: "المدير", sub: "مدير", title: "مدير المدرسة" },
    en: { name: "Principal", sub: "Principal", title: "School Principal" },
    email: "principal@noor-school.sa",
    badge: { ar: "صلاحيات كاملة", en: "Full access" },
    color: "#E8702A" },
  { key: "vice", ico: "📋",
    ar: { name: "الوكيل", sub: "وكيل", title: "وكيل المدرسة" },
    en: { name: "Vice", sub: "Deputy", title: "Vice Principal" },
    email: "vice@noor-school.sa",
    badge: { ar: "11 صفحة", en: "11 pages" },
    color: "#93C5FD" },
  { key: "counselor", ico: "🧠",
    ar: { name: "المرشد", sub: "مرشد", title: "المرشد الطلابي" },
    en: { name: "Counselor", sub: "Counselor", title: "Student Counselor" },
    email: "counselor@noor-school.sa",
    badge: { ar: "8 صفحات", en: "8 pages" },
    color: "#C4B5FD" },
  { key: "teacher", ico: "📚",
    ar: { name: "المعلم", sub: "معلم", title: "المعلم" },
    en: { name: "Teacher", sub: "Teacher", title: "Teacher" },
    email: "teacher@noor-school.sa",
    badge: { ar: "9 صفحات", en: "9 pages" },
    color: "#6EE7B7" },
];

const slides: Record<RoleKey, { ar: { tag: string; title: string; highlight: string; sub: string }; en: { tag: string; title: string; highlight: string; sub: string }; features: { ico: string; bg: string; ar: { title: string; desc: string }; en: { title: string; desc: string } }[] }> = {
  principal: {
    ar: { tag: "🏫 لوحة المدير", title: "رؤية شاملة", highlight: "لأداء المدرسة",
      sub: "إدارة كاملة للمدرسة من لوحة واحدة — تقارير ذكية، تحليلات فورية، وإشراف شامل على الكادر والطلاب." },
    en: { tag: "🏫 Principal Dashboard", title: "Complete overview", highlight: "of school performance",
      sub: "Full school management from a single dashboard — smart reports, instant analytics, and comprehensive oversight." },
    features: [
      { ico: "📊", bg: "rgba(232,112,42,.18)",
        ar: { title: "لوحة تحكم تحليلية", desc: "5 KPIs لحظية + رسوم بيانية للحضور والأداء والمخالفات" },
        en: { title: "Analytics Dashboard", desc: "5 live KPIs + charts for attendance, performance, and incidents" } },
      { ico: "🤖", bg: "rgba(37,99,235,.18)",
        ar: { title: "ذكاء اصطناعي تنبؤي", desc: "كشف مبكر للطلاب في خطر" },
        en: { title: "Predictive AI", desc: "Early detection of at-risk students" } },
      { ico: "🔗", bg: "rgba(124,58,237,.18)",
        ar: { title: "تكامل نور وفارس", desc: "مزامنة تلقائية للبيانات والسجلات مع المنصات الوطنية" },
        en: { title: "Noor & Faris Integration", desc: "Auto-sync of data and records with national platforms" } },
      { ico: "📋", bg: "rgba(5,150,105,.18)",
        ar: { title: "تقارير آلية جاهزة", desc: "تصدير PDF / Excel تلقائي + توزيع دوري على الإدارة" },
        en: { title: "Automated Reports", desc: "Auto PDF/Excel export + scheduled delivery to admin" } },
    ],
  },
  vice: {
    ar: { tag: "📋 لوحة الوكيل", title: "إدارة", highlight: "الشؤون الطلابية",
      sub: "متابعة الحضور وتوزيع الاختبارات وأرقام الجلوس وإدارة الاستدعاءات في مكان واحد." },
    en: { tag: "📋 Vice Dashboard", title: "Student affairs", highlight: "management",
      sub: "Track attendance, distribute exams, manage seat numbers, and handle summons — all in one place." },
    features: [
      { ico: "📅", bg: "rgba(37,99,235,.18)",
        ar: { title: "الحضور والغياب اليومي", desc: "تسجيل لحظي + إشعارات أولياء الأمور تلقائياً" },
        en: { title: "Daily Attendance", desc: "Live check-in + automatic parent notifications" } },
      { ico: "🪑", bg: "rgba(124,58,237,.18)",
        ar: { title: "توزيع الاختبارات وأرقام الجلوس", desc: "توزيع ذكي للقاعات والأرقام مع طباعة فورية" },
        en: { title: "Exam Distribution", desc: "Smart room allocation + instant printing" } },
      { ico: "🗓", bg: "rgba(232,112,42,.18)",
        ar: { title: "الجداول الدراسية", desc: "إنشاء وتوزيع تلقائي مع إدارة التعديلات" },
        en: { title: "Academic Schedules", desc: "Automatic creation and distribution with edit management" } },
      { ico: "📞", bg: "rgba(5,150,105,.18)",
        ar: { title: "إدارة الاستدعاءات", desc: "متابعة حضور أولياء الأمور وتوثيق النتائج" },
        en: { title: "Summons Management", desc: "Track parent attendance and document outcomes" } },
    ],
  },
  counselor: {
    ar: { tag: "🧠 لوحة المرشد", title: "رعاية الطلاب", highlight: "والتدخل المبكر",
      sub: "نظام متكامل لمتابعة الحالات والجلسات الإرشادية مع ذكاء اصطناعي يرصد الطلاب في خطر." },
    en: { tag: "🧠 Counselor Dashboard", title: "Student care", highlight: "and early intervention",
      sub: "Integrated system for case tracking and counseling sessions with AI monitoring at-risk students." },
    features: [
      { ico: "🚨", bg: "rgba(220,38,38,.18)",
        ar: { title: "الطلاب في خطر — AI", desc: "رصد تلقائي + ملفات شاملة + خطط تدخل مخصصة" },
        en: { title: "At-Risk Students — AI", desc: "Auto detection + full profiles + custom intervention plans" } },
      { ico: "🤝", bg: "rgba(124,58,237,.18)",
        ar: { title: "جلسات إرشادية موثّقة", desc: "جدولة + توثيق + سجل زمني لكل طالب" },
        en: { title: "Documented Sessions", desc: "Scheduling + documentation + chronological log per student" } },
      { ico: "📞", bg: "rgba(37,99,235,.18)",
        ar: { title: "استدعاءات أولياء الأمور", desc: "إدارة المواعيد وتتبع الحضور والمتابعة" },
        en: { title: "Parent Summons", desc: "Manage appointments, track attendance, and follow up" } },
      { ico: "📊", bg: "rgba(232,112,42,.18)",
        ar: { title: "تقارير الإرشاد الشهرية", desc: "تقارير شهرية لمتابعة الحالات ومعدل حلها" },
        en: { title: "Monthly Reports", desc: "Monthly reports tracking cases and resolution rates" } },
    ],
  },
  teacher: {
    ar: { tag: "📚 لوحة المعلم", title: "إدارة الفصل", highlight: "بكل سهولة",
      sub: "تسجيل الحضور ورصد الدرجات وإدارة الواجبات وملفات الإنجاز — كل ما تحتاجه في واجهة بسيطة." },
    en: { tag: "📚 Teacher Dashboard", title: "Classroom management", highlight: "made simple",
      sub: "Attendance, grades, assignments, and portfolios — everything you need in a simple interface." },
    features: [
      { ico: "✅", bg: "rgba(5,150,105,.18)",
        ar: { title: "تسجيل الحضور السريع", desc: "تسجيل بضغطة واحدة + إشعار تلقائي لأولياء الأمور" },
        en: { title: "Quick Attendance", desc: "One-click check-in + automatic parent notifications" } },
      { ico: "📝", bg: "rgba(37,99,235,.18)",
        ar: { title: "رصد الدرجات والأداء", desc: "اختبارات + واجبات + مشاريع مع مقارنات بيانية" },
        en: { title: "Grades & Performance", desc: "Exams + assignments + projects with visual comparisons" } },
      { ico: "📁", bg: "rgba(232,112,42,.18)",
        ar: { title: "ملفات إنجاز الطلاب", desc: "توثيق الأعمال والمشاريع بشكل رقمي منظم" },
        en: { title: "Student Portfolios", desc: "Digital documentation of work and projects" } },
      { ico: "💬", bg: "rgba(124,58,237,.18)",
        ar: { title: "التواصل مع الأهل", desc: "رسائل مباشرة + إشعارات + تقارير دورية" },
        en: { title: "Parent Communication", desc: "Direct messaging + notifications + periodic reports" } },
    ],
  },
};

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const { lang, theme, toggleLang, toggleTheme } = useUi();
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<RoleKey>("principal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  // Auto-rotate every 5s
  useEffect(() => {
    const t = setInterval(() => {
      setSelectedRole((prev) => {
        const idx = roles.findIndex((r) => r.key === prev);
        return roles[(idx + 1) % roles.length].key;
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Pre-fill email when role changes (only if empty / still default)
  useEffect(() => {
    const currentRole = roles.find((r) => r.key === selectedRole);
    if (!currentRole) return;
    const allPlaceholders = roles.map((r) => r.email);
    if (email === "" || allPlaceholders.includes(email)) {
      setEmail(currentRole.email);
    }
  }, [selectedRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || (lang === "ar" ? "خطأ غير معروف" : "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg0)" }}>
        <span style={{ color: "var(--tx2)" }}>
          <span className="ar">جاري التحقق…</span>
          <span className="en">Checking…</span>
        </span>
      </div>
    );
  }

  const slide = slides[selectedRole];
  const role = roles.find((r) => r.key === selectedRole)!;
  const slideL = slide[lang];
  const roleL = role[lang];

  return (
    <div className="lp-screen">
      {/* ═══ LEFT PANEL ═══ */}
      <div className="lp-left">
        <div className="lp-ring lp-ring-1" />
        <div className="lp-ring lp-ring-2" />
        <div className="lp-ring lp-ring-3" />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
          <div
            style={{
              width: 46, height: 46, borderRadius: 13,
              background: "linear-gradient(135deg,#E8702A,#C2410C)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(232,112,42,.42)",
              flexShrink: 0,
              animation: "lpFloat 4s ease infinite",
            }}
          >
            <svg width="23" height="23" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke="#fff" strokeWidth="2" opacity=".35" />
              <circle cx="20" cy="20" r="9" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 2" opacity=".65" />
              <circle cx="20" cy="20" r="3.5" fill="#fff" />
              <circle cx="29" cy="11" r="2" fill="#fff" opacity=".8" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: ".3px" }}>
              CORBIT <span style={{ color: "#E8702A" }}>SMOS</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: ".5px", fontFamily: "var(--fm)" }}>
              School Management OS — v2.5
            </div>
          </div>
        </div>

        {/* Role tabs */}
        <div className="lp-role-tabs">
          {roles.map((r) => (
            <button
              key={r.key}
              className={`lp-rtab ${selectedRole === r.key ? "on" : ""}`}
              onClick={() => setSelectedRole(r.key)}
            >
              <span className="lp-rtab-ico">{r.ico}</span>
              <span className="ar">{r.ar.name}</span>
              <span className="en">{r.en.name}</span>
            </button>
          ))}
        </div>

        {/* Slide content (animated on role change) */}
        <div key={selectedRole} className="lp-carousel" style={{ animation: "lpLeft .5s ease" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", color: "rgba(255,255,255,.35)", textTransform: "uppercase", marginBottom: 8 }}>
            {slideL.tag}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 8 }}>
            {slideL.title}
            <br />
            <span style={{ color: role.color }}>{slideL.highlight}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 20, lineHeight: 1.7 }}>
            {slideL.sub}
          </div>

          {slide.features.map((f, i) => {
            const fL = f[lang];
            return (
              <div key={i} className="lp-feat-item" style={{ animationDelay: `${0.05 * (i + 1)}s` }}>
                <div className="lp-feat-ico" style={{ background: f.bg }}>{f.ico}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{fL.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>{fL.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="lp-dots">
          {roles.map((r) => (
            <div
              key={r.key}
              className={`lp-dot ${selectedRole === r.key ? "on" : ""}`}
              style={{ width: selectedRole === r.key ? 28 : 8 }}
              onClick={() => setSelectedRole(r.key)}
            />
          ))}
        </div>

        {/* Bottom stats (decorative brand info only) */}
        <div style={{ position: "relative", zIndex: 3, display: "flex", borderTop: "1px solid rgba(255,255,255,.07)", paddingTop: 16, marginTop: 18 }}>
          {[
            { v: "SMOS", ar: "نظام", en: "System" },
            { v: "Corbit", ar: "شركة", en: "Company" },
            { v: "18", ar: "موديول", en: "Modules" },
            { v: lang === "ar" ? "4 أدوار" : "4 Roles", ar: "صلاحيات", en: "Roles" },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i > 0 ? "1px solid rgba(255,255,255,.07)" : "none" }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#E8702A", fontFamily: "var(--fm)" }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.32)", marginTop: 3 }}>
                {lang === "ar" ? s.ar : s.en}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="lp-right">
        {/* Theme + Lang toggles (top-left) */}
        <div style={{ position: "absolute", top: 18, left: 18, display: "flex", gap: 7, zIndex: 5 }}>
          <button
            className="btn btn-g btn-sm"
            onClick={toggleTheme}
            title={lang === "ar" ? "تغيير المظهر" : "Toggle theme"}
            type="button"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button className="btn btn-g btn-sm" onClick={toggleLang} type="button">
            <span className="ar" style={{ fontSize: 11, fontWeight: 700 }}>EN</span>
            <span className="en" style={{ fontSize: 11, fontWeight: 700 }}>ع</span>
          </button>
        </div>

        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Title */}
          <div style={{ marginBottom: 20, animation: "lpIn .5s ease" }}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: "var(--tx0)" }}>
              <span className="ar">مرحباً بعودتك 👋</span>
              <span className="en">Welcome Back 👋</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--tx2)" }}>
              <span className="ar">اختر دورك وسجّل الدخول</span>
              <span className="en">Select your role and sign in</span>
            </div>
          </div>

          {/* Role cards strip */}
          <div className="lp-role-strip">
            {roles.map((r) => (
              <div
                key={r.key}
                className={`lp-rtab-sm ${selectedRole === r.key ? "on" : ""}`}
                onClick={() => setSelectedRole(r.key)}
              >
                <div className="lp-check">✓</div>
                <div className="lp-rtab-sm-ico">{r.ico}</div>
                <div className="lp-rtab-sm-name">
                  <span className="ar">{r.ar.name}</span>
                  <span className="en">{r.en.name}</span>
                </div>
                <div className="lp-rtab-sm-sub">
                  <span className="ar">{r.ar.sub}</span>
                  <span className="en">{r.en.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Role info bar */}
          <div
            className="lp-role-banner"
            key={`bar-${selectedRole}`}
            style={{
              borderColor: `${role.color}40`,
              background: `${role.color}10`,
            }}
          >
            <span style={{ fontSize: 18 }}>{role.ico}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: role.color }}>
                {roleL.title}
              </div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>{role.email}</div>
            </div>
            <div
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 5,
                background: `${role.color}25`,
                color: role.color,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {lang === "ar" ? role.badge.ar : role.badge.en}
            </div>
          </div>

          {/* Form card */}
          <form onSubmit={handleSubmit} className="lp-card">
            <div className="fg">
              <label className="fl">
                <span className="ar">البريد الإلكتروني</span>
                <span className="en">Email</span>
              </label>
              <input
                className="fi"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@school.sa"
                required
                autoFocus
              />
            </div>

            <div className="fg">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <label className="fl" style={{ margin: 0 }}>
                  <span className="ar">كلمة المرور</span>
                  <span className="en">Password</span>
                </label>
                <span style={{ fontSize: 11, color: "#E8702A", cursor: "pointer", fontWeight: 700 }}>
                  <span className="ar">نسيت كلمة المرور؟</span>
                  <span className="en">Forgot password?</span>
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  className="fi"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{ paddingLeft: 38 }}
                />
                <span
                  onClick={() => setShowPass((s) => !s)}
                  style={{
                    position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                    fontSize: 14, cursor: "pointer", userSelect: "none", color: "var(--tx2)",
                  }}
                >
                  {showPass ? "🙈" : "👁"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", marginBottom: 18, fontSize: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: "#E8702A", width: 14, height: 14 }}
                />
                <span style={{ color: "var(--tx2)" }}>
                  <span className="ar">تذكّرني</span>
                  <span className="en">Remember me</span>
                </span>
              </label>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 9,
                  background: "rgba(239,68,68,.08)",
                  border: "1px solid rgba(239,68,68,.25)",
                  color: "#DC2626",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-p"
              style={{
                width: "100%", padding: 13, fontSize: 14, fontWeight: 800,
                borderRadius: 11, justifyContent: "center", gap: 9,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span className="ar">{submitting ? "جاري الدخول…" : "تسجيل الدخول"}</span>
              <span className="en">{submitting ? "Signing in…" : "Sign In"}</span>
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer" style={{ marginTop: 18 }}>
            <span className="ar">© 2025 CORBIT Technologies · <a>العودة للموقع</a></span>
            <span className="en">© 2025 CORBIT Technologies · <a>Back to site</a></span>
          </div>
        </div>
      </div>
    </div>
  );
}
