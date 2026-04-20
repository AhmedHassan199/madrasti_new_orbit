"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { settingsApi } from "@/lib/modules-api";
import { subUsersApi } from "@/lib/sub-users-api";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Types ─────────────────────────────────────────────────────────── */
type SettTab = "profile" | "school" | "users" | "notifications" | "security" | "appearance" | "backup" | "billing";

/* ─── Static Data ───────────────────────────────────────────────────── */
const NAV: { id: SettTab; ico: string; ar: string }[] = [
  { id: "profile",       ico: "👤", ar: "حسابي الشخصي" },
  { id: "school",        ico: "🏫", ar: "بيانات المدرسة" },
  { id: "users",         ico: "👥", ar: "المستخدمون والصلاحيات" },
  { id: "notifications", ico: "🔔", ar: "الإشعارات والتنبيهات" },
  { id: "security",      ico: "🔒", ar: "الأمان" },
  { id: "appearance",    ico: "🎨", ar: "المظهر والواجهة" },
  { id: "backup",        ico: "💾", ar: "النسخ الاحتياطي" },
  { id: "billing",       ico: "💳", ar: "الاشتراك والفاتورة" },
];

const _BACKUP_HISTORY_SEED: any[] = [];
const _ACTIVITY_LOG_SEED: any[]   = [];

const ROLE_COLOR: Record<string, string> = {
  مدير: "#DC2626", وكيل: "#B45309", مرشدة: "#7C3AED", معلم: "#2563EB", سكرتيرة: "#059669",
};
const STATUS_COLOR: Record<string, string> = { online: "#22C55E", away: "#F59E0B", offline: "#94A3B8" };

/* ─── Reusable ──────────────────────────────────────────────────────── */
function fi(extra?: React.CSSProperties): React.CSSProperties {
  return { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none", ...extra };
}
function label(): React.CSSProperties {
  return { fontSize: 11, fontWeight: 700, color: "var(--tx2)", display: "block", marginBottom: 5 };
}

function Sw({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#E8702A" : "var(--bg3)", border: "1.5px solid " + (on ? "#E8702A" : "var(--brd2)"), position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: on ? 2 : 16, transition: "right .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { lang } = useUi();
  const { user } = useAuth();
  const [tab, setTab]           = useState<SettTab>("profile");
  const [userSearch, setUserSearch] = useState("");
  const [USERS, setUsers]       = useState<any[]>([]);
  const [school, setSchool]     = useState<any>({});

  const [backupHistory, setBackupHistory] = useState<any[]>(_BACKUP_HISTORY_SEED);
  const [activityLog,   setActivityLog]   = useState<any[]>(_ACTIVITY_LOG_SEED);
  const [prefs,         setPrefs]         = useState<any>({ theme: "light", accent: "#E8702A", font_size: "md", lang: "ar" });
  const [backupBusy,    setBackupBusy]    = useState(false);
  const [logoBusy,      setLogoBusy]      = useState(false);

  useEffect(() => {
    subUsersApi.list({}).then((r: any) => setUsers(r.data ?? r ?? [])).catch(() => setUsers([]));
    settingsApi.school().then((r: any) => setSchool(r.data ?? r ?? {})).catch(() => setSchool({}));
    settingsApi.activity({ limit: 20 }).then((r: any) => setActivityLog(r.data ?? r ?? [])).catch(() => {});
    settingsApi.backup().then((r: any) => setBackupHistory(r.data ?? r ?? [])).catch(() => {});
    settingsApi.preferences().then((r: any) => setPrefs(r.data ?? r ?? {})).catch(() => {});
  }, []);

  async function savePrefs(patch: any) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try { await settingsApi.savePreferences(next); } catch {}
  }

  async function triggerBackup() {
    setBackupBusy(true);
    try {
      const r: any = await settingsApi.createBackup();
      const created = r.data ?? r;
      setBackupHistory(h => [created, ...h]);
      alert("تم إنشاء طلب النسخة الاحتياطية");
    } catch { alert("تعذّر إنشاء النسخة"); }
    finally { setBackupBusy(false); }
  }

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    try {
      const r: any = await settingsApi.uploadLogo(file);
      const path = r.data?.logo_path ?? r.logo_path;
      if (path) setSchool((s: any) => ({ ...s, settings: { ...(s.settings ?? {}), logo_path: path } }));
      alert("تم رفع الشعار");
    } catch { alert("تعذّر الرفع"); }
    finally { setLogoBusy(false); }
  }

  /* notification toggles */
  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>({
    n0: true,  n1: true,  n2: true,  n3: false,
    n4: true,  n5: true,  n6: true,  n7: true,  n8: false,
    n9: true,  n10: true, n11: true, n12: false, n13: true,
    quiet: false,
  });
  const toggleNotif = (k: string) => setNotifToggles(p => ({ ...p, [k]: !p[k] }));

  /* appearance toggles */
  const [appToggles, setAppToggles] = useState({ animations: true, english: false, compact: false, collapse: false });
  const toggleApp = (k: keyof typeof appToggles) => setAppToggles(p => ({ ...p, [k]: !p[k] }));
  const [themeIdx, setThemeIdx]   = useState(0);
  const [accent, setAccent]       = useState("#E8702A");

  /* security toggles */
  const [twoFa, setTwoFa]   = useState(false);
  const [otpSms, setOtpSms] = useState(true);

  /* backup toggles */
  const [encBackup, setEncBackup]  = useState(true);
  const [notifBackup, setNotifBackup] = useState(false);
  const [autoBackup, setAutoBackup]   = useState(true);

  /* Section heading */
  const SecHead = ({ children }: { children: React.ReactNode }) => (
    <div style={{ padding: "10px 14px", background: "var(--bg3)", fontSize: 11, fontWeight: 800, color: "var(--tx2)", borderBottom: "1px solid var(--brd)" }}>{children}</div>
  );
  const SRow = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>{children}</div>
  );
  const SecBlock = ({ children }: { children: React.ReactNode }) => (
    <div style={{ border: "1.5px solid var(--brd)", borderRadius: 11, overflow: "hidden" }}>{children}</div>
  );

  /* ══ PROFILE ══ */
  const renderProfile = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>👤 الملف الشخصي</div>
      </div>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: "var(--bg3)", borderRadius: 12, border: "1px solid var(--brd)", marginBottom: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#E8702A,#C2410C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", flexShrink: 0 }}>أح</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>ـ</div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 8 }}>مدير المدرسة · منذ 2020</div>
            <button style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg1)", color: "var(--tx1)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📷 تغيير الصورة</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[
            { lbl: "الاسم الكامل",       def: "ـ", ro: false },
            { lbl: "رقم الجوال",          def: "",             ro: false },
            { lbl: "البريد الإلكتروني",   def: "principal@school.sa",   ro: false },
            { lbl: "الرقم الوظيفي",       def: "4100001",                ro: true  },
            { lbl: "المسمى الوظيفي",      def: "مدير مدرسة",            ro: false },
            { lbl: "إدارة التعليم",       def: "إدارة تعليم الرياض",     ro: true  },
          ].map((f, i) => (
            <div key={i}>
              <label style={label()}>{f.lbl}</label>
              <input defaultValue={f.def} readOnly={f.ro} style={fi(f.ro ? { background: "var(--bg3)", color: "var(--tx2)" } : undefined)} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label()}>نبذة شخصية</label>
          <textarea placeholder="اكتب نبذة مختصرة..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid var(--brd)", borderRadius: 9, background: "var(--bg1)", fontFamily: "inherit", fontSize: 13, color: "var(--tx0)", resize: "none", height: 70, outline: "none" }} />
        </div>
      </div>
      {/* Activity log */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx2)", marginBottom: 8 }}>🕐 آخر النشاطات</div>
        <div style={{ background: "var(--bg3)", borderRadius: 11, border: "1px solid var(--brd)", overflow: "hidden", marginBottom: 16 }}>
          {activityLog.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)", fontSize: 11 }}>لا يوجد نشاط مسجل بعد</div>}
          {activityLog.map((l: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid var(--brd)", fontSize: 11 }}>
              <span style={{ color: "var(--tx2)", minWidth: 110, fontFamily: "monospace" }}>{(l.created_at ?? l.time ?? "").toString().slice(0, 16).replace("T", " ")}</span>
              <span style={{ fontWeight: 700, minWidth: 80 }}>{l.action ?? l.user ?? "—"}</span>
              <span style={{ flex: 1, color: "var(--tx1)" }}>{l.description ?? "—"}</span>
              <span style={{ color: "var(--tx2)", fontFamily: "monospace", fontSize: 10 }}>{l.ip ?? ""}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 7 }}>
        <button style={{ flex: 1, justifyContent: "center", padding: "9px 14px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 حفظ التعديلات</button>
      </div>
    </div>
  );

  /* ══ SCHOOL ══ */
  const renderSchool = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>🏫 بيانات المدرسة</div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[
            { lbl: "اسم المدرسة",   def: "مدرسة النور الابتدائية", type: "text" },
            { lbl: "الرقم الوزاري", def: "4100001",                 type: "text" },
            { lbl: "البريد الرسمي", def: "info@alnoor-school.sa",  type: "email" },
            { lbl: "الهاتف",        def: "0112345678",              type: "text" },
            { lbl: "عدد الطلاب",    def: "1248",                    type: "number" },
            { lbl: "عدد الكادر",    def: "24",                      type: "number" },
          ].map((f, i) => (
            <div key={i}>
              <label style={label()}>{f.lbl}</label>
              <input defaultValue={f.def} type={f.type} style={fi()} />
            </div>
          ))}
          {[
            { lbl: "إدارة التعليم",    opts: ["الرياض", "مكة المكرمة", "المدينة المنورة", "جدة"] },
            { lbl: "المرحلة الدراسية", opts: ["ابتدائية", "متوسطة", "ثانوية"] },
            { lbl: "المنطقة الزمنية",  opts: ["Asia/Riyadh (GMT+3)", "Asia/Dubai (GMT+4)"] },
            { lbl: "السنة الدراسية",   opts: ["1446/1447 هـ", "1445/1446 هـ"] },
            { lbl: "تنسيق التاريخ",    opts: ["هجري (1446/02/23)", "ميلادي (2025-02-23)", "الاثنان"] },
            { lbl: "الموسم الدراسي",   opts: ["الفصل الثاني", "الفصل الأول", "الفصل الثالث"] },
          ].map((f, i) => (
            <div key={"s" + i}>
              <label style={label()}>{f.lbl}</label>
              <select style={{ ...fi(), cursor: "pointer" }}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label()}>العنوان</label>
          <input defaultValue="الرياض - حي العليا - شارع التخصصي" style={fi()} />
        </div>
        {/* Logo upload */}
        <label style={{ display: "block", padding: 14, border: "2px dashed var(--brd2)", borderRadius: 11, textAlign: "center", background: logoBusy ? "#FEF3E8" : "var(--bg3)", marginBottom: 16, cursor: "pointer" }}>
          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} style={{ display: "none" }} />
          <div style={{ fontSize: 28, marginBottom: 5 }}>🏫</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{logoBusy ? "جاري الرفع…" : "رفع شعار المدرسة"}</div>
          <div style={{ fontSize: 10, color: "var(--tx2)" }}>PNG أو SVG · 512×512 بكسل كحد أدنى</div>
        </label>
        <button style={{ width: "100%", justifyContent: "center", padding: "9px 14px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 حفظ البيانات</button>
      </div>
    </div>
  );

  /* ══ USERS ══ */
  const renderUsers = () => {
    const filtered = USERS.filter(u => !userSearch || u.name.includes(userSearch) || u.role.includes(userSearch));
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>👥 المستخدمون والصلاحيات</div>
          <div style={{ display: "flex", gap: 7 }}>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="بحث..." style={{ padding: "6px 9px", border: "1.5px solid var(--brd)", borderRadius: 8, background: "var(--bg1)", fontFamily: "inherit", fontSize: 11, color: "var(--tx0)", outline: "none", width: 160 }} />
            <button style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#E8702A", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ مستخدم</button>
          </div>
        </div>
        {filtered.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${ROLE_COLOR[u.role] || "#6B7280"},${ROLE_COLOR[u.role] || "#6B7280"}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{u.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800 }}>{u.name}</span>
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 5, background: (ROLE_COLOR[u.role] || "#6B7280") + "18", color: ROLE_COLOR[u.role] || "#6B7280", fontWeight: 700, border: "1px solid " + (ROLE_COLOR[u.role] || "#6B7280") + "30" }}>{u.role}</span>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLOR[u.status] ?? "#9CA3AF", flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>{u.email} · آخر دخول: {u.last}</div>
            </div>
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              <button style={{ padding: "4px 10px", borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>✏️ تعديل</button>
              {u.id !== "u1" && <button style={{ padding: "4px 9px", borderRadius: 7, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>✕</button>}
            </div>
          </div>
        ))}
        <div style={{ padding: "12px 16px", background: "var(--bg3)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx2)", marginBottom: 7 }}>مستويات الصلاحيات</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {[
              { ar: "مدير — صلاحيات كاملة", c: "#DC2626" },
              { ar: "وكيل — صلاحيات عالية", c: "#B45309" },
              { ar: "مرشد/ة — متوسطة",       c: "#7C3AED" },
              { ar: "معلم — أساسية",           c: "#2563EB" },
            ].map((r, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: r.c + "18", color: r.c, border: "1px solid " + r.c + "30", fontWeight: 600 }}>{r.ar}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ══ NOTIFICATIONS ══ */
  const renderNotifications = () => {
    const SECTIONS = [
      { ar: "قنوات الإشعار", keys: ["n0", "n1", "n2", "n3"], labels: ["إشعارات داخلية (في النظام)", "رسائل SMS", "رسائل WhatsApp", "بريد إلكتروني يومي"] },
      { ar: "تنبيهات الطلاب", keys: ["n4", "n5", "n6", "n7", "n8"], labels: ["غياب متكرر (3 أيام فأكثر)", "تراجع أكاديمي ملحوظ", "مخالفة سلوكية خطيرة", "دخول منطقة الخطر", "تحسّن ملحوظ في الأداء"] },
      { ar: "تنبيهات النظام", keys: ["n9", "n10", "n11", "n12", "n13"], labels: ["رصيد SMS أقل من 200", "فشل عملية مزامنة", "انتهاء صلاحية رمز API", "نسخة احتياطية ناجحة", "تسجيل دخول من جهاز جديد"] },
    ];
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>🔔 الإشعارات والتنبيهات</div>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {SECTIONS.map((sec, si) => (
            <SecBlock key={si}>
              <SecHead>{sec.ar}</SecHead>
              {sec.keys.map((k, ki) => (
                <SRow key={k}>
                  <span style={{ fontSize: 12.5 }}>{sec.labels[ki]}</span>
                  <Sw on={!!notifToggles[k]} onToggle={() => toggleNotif(k)} />
                </SRow>
              ))}
            </SecBlock>
          ))}
          {/* Quiet hours */}
          <SecBlock>
            <SecHead>ساعات الهدوء</SecHead>
            <SRow>
              <div>
                <div style={{ fontSize: 12.5 }}>تفعيل ساعات الهدوء</div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>لا إشعارات خلال هذه الفترة</div>
              </div>
              <Sw on={!!notifToggles["quiet"]} onToggle={() => toggleNotif("quiet")} />
            </SRow>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--brd)" }}>
              <span style={{ fontSize: 12, color: "var(--tx2)" }}>من</span>
              <input type="time" defaultValue="22:00" style={{ padding: "6px 8px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none", width: 100 }} />
              <span style={{ fontSize: 12, color: "var(--tx2)" }}>إلى</span>
              <input type="time" defaultValue="07:00" style={{ padding: "6px 8px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none", width: 100 }} />
            </div>
          </SecBlock>
          <button style={{ justifyContent: "center", padding: "9px 14px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 حفظ الإعدادات</button>
        </div>
      </div>
    );
  };

  /* ══ SECURITY ══ */
  const renderSecurity = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>🔒 الأمان</div>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Password */}
        <SecBlock>
          <SecHead>تغيير كلمة المرور</SecHead>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
            {["كلمة المرور الحالية", "كلمة المرور الجديدة", "تأكيد كلمة المرور"].map((lbl, i) => (
              <div key={i}>
                <label style={label()}>{lbl}</label>
                <input type="password" placeholder="••••••••" style={fi()} />
              </div>
            ))}
            {/* strength bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= 2 ? "#22C55E" : "var(--bg3)" }} />
              ))}
              <span style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>قوية</span>
            </div>
            <button style={{ justifyContent: "center", padding: "8px 14px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>تغيير كلمة المرور</button>
          </div>
        </SecBlock>
        {/* 2FA */}
        <SecBlock>
          <SecHead>المصادقة الثنائية (2FA)</SecHead>
          <SRow>
            <div>
              <div style={{ fontSize: 12.5 }}>تفعيل المصادقة الثنائية</div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>حماية إضافية عند تسجيل الدخول</div>
            </div>
            <Sw on={twoFa} onToggle={() => setTwoFa(p => !p)} />
          </SRow>
          <SRow>
            <div>
              <div style={{ fontSize: 12.5 }}>تسجيل الدخول عبر OTP (SMS)</div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>رمز عبر الجوال 0501234***</div>
            </div>
            <Sw on={otpSms} onToggle={() => setOtpSms(p => !p)} />
          </SRow>
        </SecBlock>
        {/* Sessions */}
        <SecBlock>
          <SecHead>الجلسات النشطة</SecHead>
          {[
            { dev: "Chrome / Windows 11",  loc: "الرياض", time: "الآن",       current: true },
            { dev: "Safari / iPhone 14",   loc: "الرياض", time: "منذ 2 ساعة", current: false },
            { dev: "Chrome / MacBook Pro", loc: "الرياض", time: "أمس",        current: false },
          ].map((sess, i) => (
            <SRow key={i}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  {sess.dev}
                  {sess.current && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 5, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>الجلسة الحالية</span>}
                </div>
                <div style={{ fontSize: 10, color: "var(--tx2)" }}>{sess.loc} · {sess.time}</div>
              </div>
              {!sess.current && <button style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>إنهاء</button>}
            </SRow>
          ))}
          <div style={{ padding: "10px 14px" }}>
            <button style={{ width: "100%", justifyContent: "center", padding: "7px 14px", borderRadius: 7, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>إنهاء جميع الجلسات الأخرى</button>
          </div>
        </SecBlock>
      </div>
    </div>
  );

  /* ══ APPEARANCE ══ */
  const renderAppearance = () => {
    const themes = [{ ar: "تلقائي", ico: "🌓" }, { ar: "فاتح", ico: "☀️" }, { ar: "داكن", ico: "🌙" }];
    const accents = ["#E8702A", "#2563EB", "#059669", "#7C3AED", "#DC2626", "#0891B2"];
    const sizes = [{ ar: "صغير", fs: 11 }, { ar: "متوسط", fs: 14 }, { ar: "كبير", fs: 17 }];
    return (
      <div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>🎨 المظهر والواجهة</div>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Theme */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9 }}>🌓 وضع العرض</div>
            <div style={{ display: "flex", gap: 8 }}>
              {themes.map((t, i) => {
                const key = i === 0 ? "auto" : i === 1 ? "light" : "dark";
                const active = (themeIdx === i) || prefs.theme === key;
                return (
                  <div key={i} onClick={() => { setThemeIdx(i); savePrefs({ theme: key }); }} style={{ flex: 1, padding: 14, border: "2px solid " + (active ? "#E8702A" : "var(--brd)"), borderRadius: 11, textAlign: "center", cursor: "pointer", background: active ? "#FEF3E8" : "var(--bg1)" }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{t.ico}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#E8702A" : "var(--tx0)" }}>{t.ar}</div>
                    {active && <div style={{ fontSize: 9, color: "#E8702A", marginTop: 2 }}>● محدد</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Accent */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9 }}>🎨 لون التمييز</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {accents.map(c => {
                const active = (accent === c) || prefs.accent === c;
                return (
                  <div key={c} onClick={() => { setAccent(c); savePrefs({ accent: c }); }} style={{ width: 36, height: 36, borderRadius: 10, background: c, cursor: "pointer", border: "3px solid " + (active ? "var(--tx0)" : "transparent"), boxShadow: "0 2px 8px " + c + "44" }} />
                );
              })}
            </div>
          </div>
          {/* Font size */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9 }}>🔤 حجم الخط</div>
            <div style={{ display: "flex", gap: 8 }}>
              {sizes.map((sz, i) => {
                const key = i === 0 ? "sm" : i === 1 ? "md" : "lg";
                const active = prefs.font_size === key;
                return (
                  <div key={i} onClick={() => savePrefs({ font_size: key })} style={{ flex: 1, padding: 12, border: "2px solid " + (active ? "#E8702A" : "var(--brd)"), borderRadius: 10, textAlign: "center", cursor: "pointer", background: active ? "#FEF3E8" : "var(--bg1)" }}>
                    <div style={{ fontSize: sz.fs, fontWeight: 700, color: active ? "#E8702A" : "var(--tx0)" }}>{sz.ar}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Toggles */}
          <SecBlock>
            <SecHead>خيارات الواجهة</SecHead>
            {[
              { k: "animations" as const, ar: "الرسوم المتحركة",       sub: "تفعيل الانتقالات" },
              { k: "english"    as const, ar: "اللغة الإنجليزية",      sub: "عرض العناوين بالإنجليزية" },
              { k: "compact"    as const, ar: "الوضع المضغوط",         sub: "تقليص المسافات" },
              { k: "collapse"   as const, ar: "الشريط الجانبي مصغّر", sub: "إخفاء النصوص" },
            ].map(opt => (
              <SRow key={opt.k}>
                <div><div style={{ fontSize: 12.5 }}>{opt.ar}</div><div style={{ fontSize: 10, color: "var(--tx2)" }}>{opt.sub}</div></div>
                <Sw on={appToggles[opt.k]} onToggle={() => toggleApp(opt.k)} />
              </SRow>
            ))}
          </SecBlock>
          <button style={{ justifyContent: "center", padding: "9px 14px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 حفظ الإعدادات</button>
        </div>
      </div>
    );
  };

  /* ══ BACKUP ══ */
  const renderBackup = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>💾 النسخ الاحتياطي</div>
        <button style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#E8702A", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>نسخ الآن</button>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "14px 16px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 32 }}>💚</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#059669" }}>آخر نسخة: ✅ ناجحة</div>
            <div style={{ fontSize: 11, color: "#065F46" }}>2025-02-22 02:00 · 48 MB · خوادم CORBIT</div>
          </div>
        </div>
        <SecBlock>
          <SecHead>إعدادات النسخ التلقائي</SecHead>
          <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { lbl: "التكرار",    opts: ["يومي", "أسبوعي", "شهري"] },
              { lbl: "مكان الحفظ", opts: ["خوادم CORBIT (السعودية)", "Google Drive", "OneDrive"] },
              { lbl: "مدة الاحتفاظ", opts: ["30 يوم", "90 يوم", "سنة"] },
            ].map((f, i) => (
              <div key={i}>
                <label style={label()}>{f.lbl}</label>
                <select style={{ ...fi(), cursor: "pointer" }}>{f.opts.map(o => <option key={o}>{o}</option>)}</select>
              </div>
            ))}
            <div>
              <label style={label()}>وقت النسخ</label>
              <input type="time" defaultValue="02:00" style={fi()} />
            </div>
          </div>
          {[
            { k: "encBackup",   on: encBackup,   toggle: () => setEncBackup(p => !p),   ar: "تشفير النسخ الاحتياطية" },
            { k: "notifBackup", on: notifBackup, toggle: () => setNotifBackup(p => !p), ar: "إشعار بعد كل نسخة" },
            { k: "autoBackup",  on: autoBackup,  toggle: () => setAutoBackup(p => !p),  ar: "نسخ احتياطي فوري عند التحديثات" },
          ].map(opt => (
            <SRow key={opt.k}>
              <span style={{ fontSize: 12.5 }}>{opt.ar}</span>
              <Sw on={opt.on} onToggle={opt.toggle} />
            </SRow>
          ))}
        </SecBlock>
        <SecBlock>
          <SecHead>سجل النسخ الاحتياطية</SecHead>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--brd)" }}>
            <button onClick={triggerBackup} disabled={backupBusy} style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: backupBusy ? "wait" : "pointer", fontFamily: "inherit", opacity: backupBusy ? 0.6 : 1 }}>
              💾 {backupBusy ? "جاري الإنشاء..." : "إنشاء نسخة احتياطية الآن"}
            </button>
          </div>
          {backupHistory.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)", fontSize: 11 }}>لا توجد نسخ سابقة</div>}
          {backupHistory.map((b: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid var(--brd)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 11.5, fontWeight: 700 }}>{(b.created_at ?? b.date ?? "").toString().slice(0, 16).replace("T", " ")}</span>
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: b.kind === "auto" ? "#F5F3FF" : "#FEF3E8", color: b.kind === "auto" ? "#7C3AED" : "#E8702A", fontWeight: 700 }}>{b.kind === "auto" ? "تلقائي" : "يدوي"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "var(--tx2)" }}>{b.size_bytes ? `${Math.round(b.size_bytes / 1024 / 1024)} MB` : "—"}</span>
                <span style={{ fontSize: 11, color: b.status === "success" ? "#059669" : "#B45309", fontWeight: 700 }}>{b.status === "success" ? "✓ ناجحة" : b.status ?? "قيد الإنشاء"}</span>
              </div>
            </div>
          ))}
        </SecBlock>
      </div>
    </div>
  );

  /* ══ BILLING ══ */
  const renderBilling = () => (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>💳 الاشتراك والفاتورة</div>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Hero plan card */}
        <div style={{ background: "linear-gradient(135deg,#1A1A2E,#16213E,#0F3460)", borderRadius: 14, padding: 20, color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(232,112,42,.15)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginBottom: 4 }}>خطة الاشتراك الحالية</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>الخطة المؤسسية 🏆</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginBottom: 14 }}>غير محدود — جميع الميزات</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>850 ر.س</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,.6)" }}>/ شهرياً</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,.2)" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>تجدد في</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#FCD34D" }}>2025-03-15</div>
              </div>
            </div>
          </div>
        </div>
        {/* Usage */}
        <SecBlock>
          <SecHead>الاستخدام الحالي</SecHead>
          {[
            { ar: "الطلاب المُسجَّلون", v: 1248, max: 2000, c: "#2563EB" },
            { ar: "حسابات الكادر",      v: 24,   max: 50,   c: "#059669" },
            { ar: "سعة التخزين",        v: 48,   max: 500,  c: "#7C3AED", unit: "MB/GB" },
          ].map((item, i) => {
            const pct = Math.round((item.v / item.max) * 100);
            return (
              <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700 }}>{item.ar}</span>
                  <span style={{ color: item.c, fontWeight: 800 }}>{item.v.toLocaleString()} / {item.max.toLocaleString()}{item.unit ? " " + item.unit : ""}</span>
                </div>
                <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--brd)" }}>
                  <div style={{ height: "100%", width: pct + "%", background: item.c, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </SecBlock>
        {/* Plans */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>ترقية الخطة</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[
              { ar: "أساسية",  sub: "حتى 300 طالب", price: "250", hot: false, current: false },
              { ar: "متوسطة",  sub: "حتى 800 طالب", price: "550", hot: false, current: false },
              { ar: "مؤسسية",  sub: "غير محدود",    price: "850", hot: true,  current: true  },
            ].map((p, i) => (
              <div key={i} style={{ padding: 14, border: "2px solid " + (p.hot ? "#E8702A" : "var(--brd)"), borderRadius: 12, textAlign: "center", background: p.hot ? "#FEF3E8" : "var(--bg1)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: p.hot ? "#E8702A" : "var(--tx0)", marginBottom: 4 }}>{p.ar}</div>
                <div style={{ fontSize: 20, fontWeight: 800, margin: "6px 0" }}>{p.price} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--tx2)" }}>ر.س</span></div>
                <div style={{ fontSize: 10, color: "var(--tx2)", marginBottom: 8 }}>{p.sub}</div>
                <button style={{ width: "100%", padding: "6px 0", borderRadius: 7, border: p.hot ? "none" : "1.5px solid var(--brd)", background: p.hot ? "#E8702A" : "var(--bg3)", color: p.hot ? "#fff" : "var(--tx1)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{p.current ? "✓ حاليًا" : "ترقية"}</button>
              </div>
            ))}
          </div>
        </div>
        {/* Invoices */}
        <SecBlock>
          <SecHead>آخر الفواتير</SecHead>
          {[
            { date: "2025-02-15", plan: "مؤسسية", amt: "850" },
            { date: "2025-01-15", plan: "مؤسسية", amt: "850" },
            { date: "2024-12-15", plan: "متوسطة", amt: "550" },
          ].map((inv, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid var(--brd)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 11.5, fontWeight: 700 }}>{inv.date}</span>
                <span style={{ fontSize: 10, color: "var(--tx2)" }}>خطة {inv.plan}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{inv.amt} ر.س</span>
                <span style={{ fontSize: 10, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>✓ مدفوعة</span>
                <button style={{ padding: "3px 9px", borderRadius: 7, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>⬇️</button>
              </div>
            </div>
          ))}
        </SecBlock>
      </div>
    </div>
  );

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <DashboardLayout title={lang === "ar" ? "الإعدادات" : "Settings"}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>⚙️ الإعدادات</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>مدرسة النور · الإصدار 2.5.0</div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--brd)", background: "var(--bg3)", color: "var(--tx1)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📤 تصدير</button>
          <button style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 حفظ الكل</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <div style={{ width: 200, flexShrink: 0, background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          {/* Profile mini */}
          <div style={{ padding: 14, borderBottom: "1px solid var(--brd)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#E8702A,#C2410C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 auto 8px" }}>أح</div>
            <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800 }}>ـ</div>
            <div style={{ textAlign: "center", fontSize: 10, color: "var(--tx2)" }}>مدير المدرسة</div>
            <div style={{ textAlign: "center", marginTop: 6 }}>
              <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", fontWeight: 700 }}>● متصل الآن</span>
            </div>
          </div>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "11px 14px", border: "none", background: tab === n.id ? "#FEF3E8" : "transparent", color: tab === n.id ? "#E8702A" : "var(--tx1)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: tab === n.id ? 800 : 600, borderRight: tab === n.id ? "3px solid #E8702A" : "3px solid transparent", textAlign: "right" }}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{n.ico}</span>
              <span>{n.ar}</span>
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, minWidth: 0, background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          {tab === "profile"       && renderProfile()}
          {tab === "school"        && renderSchool()}
          {tab === "users"         && renderUsers()}
          {tab === "notifications" && renderNotifications()}
          {tab === "security"      && renderSecurity()}
          {tab === "appearance"    && renderAppearance()}
          {tab === "backup"        && renderBackup()}
          {tab === "billing"       && renderBilling()}
        </div>
      </div>
    </DashboardLayout>
  );
}
