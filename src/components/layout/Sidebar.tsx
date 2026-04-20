"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/* ═══════════════════════════════════════
   ICONS — SVG paths ported from HTML
═══════════════════════════════════════ */
const ICONS: Record<string, JSX.Element> = {
  grid:      <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  users:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  check:     <><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></>,
  alert:     <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  msg:       <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  file:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15"/></>,
  task:      <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  calendar:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  committee: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><circle cx="20" cy="5" r="2"/></>,
  exam:      <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></>,
  seat:      <><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  portfolio: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  form:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  noor:      <><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/><path d="M5 12h2M17 12h2M12 5v2M12 17v2"/></>,
  atrisk:    <><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></>,
  summon:    <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
  key:       <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
  chevron:   <><polyline points="9 18 15 12 9 6"/></>,
  device:    <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h12M6 12h12M6 16h8"/></>,
  reply:     <><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></>,
};

/* ═══════════════════════════════════════
   MENU STRUCTURE
═══════════════════════════════════════ */
interface NavItem { id: string; ar: string; en: string; href: string; icon: string; badge?: string; badgeType?: "warn" | "ok"; }
interface NavSec  { sec: [string, string]; }
type NavNode = NavItem | NavSec;

interface AttendanceGroup { id: string; ar: string; en: string; icon: string; items: NavItem[]; }

/** قبل قسم الحضور — لوحة التحكم + دليل البصمة. */
const TOP_NAV: NavNode[] = [
  { sec: ["الرئيسية", "Main"] },
  { id: "dashboard", ar: "لوحة التحكم",                en: "Dashboard",     href: "/dashboard",                icon: "grid" },
  { id: "bio-guide", ar: "دليل التعامل مع البصمة",    en: "BioTime Guide", href: "/attendance/biotime-guide", icon: "file" },
];

/** بعد قسم الحضور — باقي الموديولات. الإعدادات في الآخر خالص. */
const BOTTOM_NAV: NavNode[] = [
  { sec: ["متابعة الطلاب", "Student Tracking"] },
  { id: "students", ar: "الطلاب",           en: "Students",   href: "/students",  icon: "users" },
  { id: "groups",   ar: "المجموعات",        en: "Groups",     href: "/groups",    icon: "users" },
  { id: "behavior", ar: "السلوك",            en: "Behavior",   href: "/behavior",  icon: "alert" },
  { id: "atrisk",   ar: "طلاب في الخطر",    en: "At-Risk",    href: "/atrisk",    icon: "atrisk" },
  { id: "summons",  ar: "الاستدعاءات",       en: "Summons",    href: "/summons",   icon: "summon" },

  { sec: ["الجداول والاختبارات", "Schedule & Exams"] },
  { id: "schedule",   ar: "الجدول الدراسي",    en: "Schedule",     href: "/schedule",   icon: "calendar" },
  { id: "committees", ar: "اللجان",             en: "Committees",   href: "/committees", icon: "committee" },
  { id: "examdist",   ar: "توزيع الاختبارات",  en: "Exam Dist",    href: "/examdist",   icon: "exam" },
  { id: "seatnums",   ar: "أرقام الجلوس",      en: "Seat Numbers", href: "/seatnums",   icon: "seat" },

  { sec: ["المهام والإنجاز", "Tasks & Portfolios"] },
  { id: "tasks",     ar: "المهام",           en: "Tasks",      href: "/tasks",     icon: "task" },
  { id: "portfolio", ar: "ملفات الإنجاز",   en: "Portfolios", href: "/portfolio", icon: "portfolio" },
  { id: "forms",     ar: "الاستبانات",       en: "Forms",      href: "/forms",     icon: "form" },

  { sec: ["الكادر", "Staff"] },
  { id: "staff",    ar: "الكادر التعليمي",  en: "Staff",     href: "/staff",           icon: "briefcase" },
  { id: "subusers", ar: "المستخدمون",        en: "Sub-users", href: "/staff/sub-users", icon: "key" },

  { sec: ["التواصل والتقارير", "Communication"] },
  { id: "messages", ar: "الرسائل",     en: "Messages",   href: "/messages", icon: "msg" },
  { id: "noor",     ar: "تكامل نور",   en: "Noor Sync",  href: "/noor",     icon: "noor" },
  { id: "reports",  ar: "التقارير",    en: "Reports",    href: "/reports",  icon: "file" },

  { sec: ["النظام", "System"] },
  { id: "settings", ar: "الإعدادات", en: "Settings", href: "/settings", icon: "settings" },
];

/** Combined list — used by active-detection to find longest matching href. */
const MAIN_NAV: NavNode[] = [...TOP_NAV, ...BOTTOM_NAV];

/**
 * ATTENDANCE — Ordered EXACTLY as per user's sidebar spec.
 * Each item mirrors a route in orbit-fingerprint-user/routes/web.php.
 */
const ATTENDANCE: AttendanceGroup[] = [
  // ═══════════════════════════════════════
  // 1. اجهزة البصمة — 4 items, exact order
  // ═══════════════════════════════════════
  {
    id: "att-devices", ar: "اجهزة البصمة", en: "Fingerprint Devices", icon: "device",
    items: [
      { id: "d-txns",   ar: "جميع التوقيعات",   en: "All Transactions",    href: "/attendance/devices/transactions",    icon: "grid" },
      { id: "d-upd",    ar: "تحديث التوقيعات",  en: "Update Transactions", href: "/attendance/devices/update-statuses", icon: "settings" },
      { id: "d-upload", ar: "سحب بصماتي",       en: "Pull My Transactions", href: "/attendance/devices/upload-my",       icon: "file" },
      { id: "d-list",   ar: "أجهزة",            en: "Devices",             href: "/attendance/devices",                 icon: "device" },
    ],
  },
  // ═══════════════════════════════════════
  // 2. البصمة للطلاب — 11 items, exact order
  // ═══════════════════════════════════════
  {
    id: "att-students", ar: "البصمة للطلاب", en: "Student Fingerprint", icon: "users",
    items: [
      { id: "sa-sign",       ar: "جميع توقيعات أجهزة البصمة",          en: "All Signatures",  href: "/attendance/students/signatures",       icon: "file" },
      { id: "sa-daily",      ar: "الكشف اليومي",                        en: "Daily Report",    href: "/attendance/students/daily",            icon: "check" },
      { id: "sa-stats",      ar: "احصائيات الغياب و التأخير",          en: "Stats",           href: "/attendance/students/statistics",       icon: "grid" },
      { id: "sa-table",      ar: "جدول اضافه الطلاب",                   en: "Students Table",  href: "/attendance/students/table",            icon: "users" },
      { id: "sa-groups",     ar: "مجموعات الطلاب",                      en: "Student Groups",  href: "/attendance/students/groups",           icon: "users" },
      { id: "sa-time",       ar: "اعدادات الوقت",                       en: "Time Settings",   href: "/attendance/students/time-settings",    icon: "settings" },
      { id: "sa-mset",       ar: "إعدادات الإرسال",                     en: "Msg Settings",    href: "/attendance/students/message-settings", icon: "settings" },
      { id: "sa-msgs",       ar: "ارسال رسائل الغياب و التأخير",       en: "Send Messages",   href: "/attendance/students/messages",         icon: "msg" },
      { id: "sa-pmsgs",      ar: "إرسال رسائل الاستئذان",               en: "Permission Msgs", href: "/attendance/students/permission-messages", icon: "msg" },
      { id: "sa-early-add",  ar: "طلبات الانصراف المبكر",               en: "Add Early Leave", href: "/attendance/students/early-leaves/add", icon: "file" },
      { id: "sa-early",      ar: "كشف يومى لطلبات الاستئذان",           en: "Daily Permissions", href: "/attendance/students/early-leaves",   icon: "file" },
      // Extras kept for BioTime management (not in user's spec but essential):
      { id: "sa-cmp",        ar: "المقارنة مع BioTime",                 en: "BioTime Compare", href: "/attendance/students/comparison",       icon: "grid" },
    ],
  },
  // ═══════════════════════════════════════
  // 3. البصمة للمعلمين — 16 items, exact order
  // ═══════════════════════════════════════
  {
    id: "att-teachers", ar: "البصمة للمعلمين", en: "Teacher Fingerprint", icon: "briefcase",
    items: [
      { id: "ta-sign",       ar: "جميع توقيعات أجهزة البصمة",          en: "All Signatures",  href: "/attendance/teachers/signatures",       icon: "file" },
      { id: "ta-daily",      ar: "الكشف اليومي",                        en: "Daily Report",    href: "/attendance/teachers/daily",            icon: "check" },
      { id: "ta-absent",     ar: "سجل الغائبون اليومي",                 en: "Daily Absent",    href: "/attendance/teachers/absent",           icon: "alert" },
      { id: "ta-late",       ar: "سجل المتأخرون اليومي",                en: "Daily Late",      href: "/attendance/teachers/late",             icon: "alert" },
      { id: "ta-log",        ar: "التسجيل اليومي للحضور والانصراف",    en: "Daily Log",       href: "/attendance/teachers/log",              icon: "file" },
      { id: "ta-noch",       ar: "لم يسجل خروج",                         en: "No Checkout",     href: "/attendance/teachers/no-checkout",      icon: "alert" },
      { id: "ta-stats",      ar: "احصائيات الغياب و التأخير",           en: "Stats",           href: "/attendance/teachers/statistics",       icon: "grid" },
      { id: "ta-time",       ar: "اعدادات الوقت",                       en: "Time Settings",   href: "/attendance/teachers/time-settings",    icon: "settings" },
      { id: "ta-mset",       ar: "إعدادات الإرسال",                     en: "Msg Settings",    href: "/attendance/teachers/message-settings", icon: "settings" },
      { id: "ta-table",      ar: "جميع معلمي البصمة",                   en: "All Teachers",    href: "/attendance/teachers/table",            icon: "users" },
      { id: "ta-msgs",       ar: "ارسال رسائل الغياب و التأخير",       en: "Send Messages",   href: "/attendance/teachers/messages",         icon: "msg" },
      { id: "ta-replies",    ar: "ردود الرسائل",                         en: "Message Replies", href: "/attendance/message-replies",          icon: "reply" },
      { id: "ta-unav",       ar: "عدم التواجد",                          en: "Unavailability",  href: "/attendance/teachers/unavailabilities", icon: "alert" },
      { id: "ta-early-add",  ar: "طلبات الانصراف المبكر",               en: "Add Early Leave", href: "/attendance/teachers/early-leaves/add", icon: "file" },
      { id: "ta-early",      ar: "كشف يومى لطلبات الاستئذان",           en: "Daily Permissions", href: "/attendance/teachers/early-leaves",   icon: "file" },
      { id: "ta-pun",        ar: "الحسومات",                             en: "Punishments",     href: "/attendance/teachers/punishments",      icon: "alert" },
      // Extra kept for BioTime management:
      { id: "ta-cmp",        ar: "المقارنة مع BioTime",                 en: "BioTime Compare", href: "/attendance/teachers/comparison",       icon: "grid" },
    ],
  },
  // ═══════════════════════════════════════
  // 4. إدارة الوصول — 2 items
  // ═══════════════════════════════════════
  {
    id: "att-access", ar: "إدارة الوصول", en: "Access Management", icon: "key",
    items: [
      { id: "ac-sms",   ar: "اعدادات الإرسال العامة", en: "General SMS Settings", href: "/access/sms-settings",    icon: "msg" },
      { id: "ac-dept",  ar: "اعدادات المنطقة والإدارة", en: "Area & Department",   href: "/access/area-department", icon: "settings" },
    ],
  },
];

/** Render a list of NavNodes (section headers + flat items) with active state. */
function renderNavNodes(nodes: NavNode[], isActive: (h: string) => boolean, lang: "ar" | "en") {
  return nodes.map((item, i) => {
    if ("sec" in item) {
      return (
        <div key={`s-${i}`} className="sb-sec">
          {lang === "ar" ? item.sec[0] : item.sec[1]}
        </div>
      );
    }
    const active = isActive(item.href);
    return (
      <Link
        key={item.id}
        href={item.href}
        className={`sb-item ${active ? "on" : ""}`}
        style={{ textDecoration: "none" }}
      >
        <Icon name={item.icon} />
        <span>{lang === "ar" ? item.ar : item.en}</span>
        {item.badge && (
          <span className={`sb-badge ${item.badgeType ?? ""}`}>{item.badge}</span>
        )}
      </Link>
    );
  });
}

/* ═══════════════════════════════════════
   ROLE META
═══════════════════════════════════════ */
const ROLE_META: Record<string, { ico: string; ar: string; en: string; color: string }> = {
  principal: { ico: "🏫", ar: "مدير المدرسة",   en: "Principal", color: "#E8702A" },
  vice:      { ico: "📋", ar: "وكيل المدرسة",   en: "Vice",      color: "#2563EB" },
  counselor: { ico: "🧠", ar: "المرشد الطلابي", en: "Counselor", color: "#7C3AED" },
  teacher:   { ico: "📚", ar: "معلم",            en: "Teacher",   color: "#059669" },
};

interface Props {
  lang: "ar" | "en";
  onToggleTheme: () => void;
  onToggleLang: () => void;
  theme: "light" | "dark";
}

function Icon({ name, size = 15 }: { name: string; size?: number }) {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </svg>
  );
}

export default function Sidebar({ lang, onToggleTheme, onToggleLang, theme }: Props) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const roleKey = role || "teacher";
  const rMeta = ROLE_META[roleKey] ?? ROLE_META.teacher;

  // Collect every sidebar href so isActive can pick the LONGEST matching one
  // (prevents a parent route + child route from both looking active at once).
  const allHrefs = useMemo(() => {
    const out: string[] = [];
    for (const node of MAIN_NAV) if ("href" in node) out.push(node.href);
    for (const g of ATTENDANCE) for (const it of g.items) out.push(it.href);
    return out;
  }, []);

  const activeHref = useMemo(() => {
    if (!pathname) return null;
    let best: string | null = null;
    for (const h of allHrefs) {
      if (pathname === h || pathname.startsWith(h + "/")) {
        if (!best || h.length > best.length) best = h;
      }
    }
    return best;
  }, [pathname, allHrefs]);

  const isActive = (href: string) => activeHref === href;

  // Attendance collapse state — open the group that contains the active page
  const [attOpen, setAttOpen] = useState<string | null>(() => {
    for (const g of ATTENDANCE) {
      if (g.items.some(i => pathname?.startsWith(i.href))) return g.id;
    }
    return null;
  });

  return (
    <aside className="sb">
      {/* HEADER */}
      <div className="sb-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div className="sb-logo" style={{ background: "none" }}>
            <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#E8702A" strokeWidth="2" />
              <circle cx="20" cy="20" r="11" stroke="#E8702A" strokeWidth="1.5" strokeDasharray="4 3" opacity=".7" />
              <circle cx="20" cy="20" r="4.5" fill="#E8702A" />
              <circle cx="31" cy="13" r="2.5" fill="#E8702A" opacity=".8" />
            </svg>
          </div>
          <div>
            <div className="sb-app-name">CORBIT <span style={{ color: "#E8702A" }}>SMOS</span></div>
            <div className="sb-school-name">{user?.name ?? (lang === "ar" ? "نظام إدارة المدرسة" : "SMOS")}</div>
          </div>
        </div>
      </div>

      {/* USER CARD */}
      {user && (
        <div className="sb-user">
          <div className="sb-av" style={{ background: rMeta.color, fontSize: 16 }}>{rMeta.ico}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-uname" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.name}
            </div>
            <div className="role-badge" style={{ background: `${rMeta.color}4D`, color: "#fff", display: "inline-flex", alignItems: "center", gap: 3 }}>
              {rMeta.ico} <span>{lang === "ar" ? rMeta.ar : rMeta.en}</span>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 0 8px" }}>
        {/* TOP: Dashboard + BioTime Guide */}
        {renderNavNodes(TOP_NAV, isActive, lang)}

        {/* Attendance section header */}
        <div className="sb-sec">{lang === "ar" ? "الحضور والبصمات" : "Attendance"}</div>

        {/* Attendance — collapsible groups */}
        {ATTENDANCE.map((group) => {
          const isOpen = attOpen === group.id;
          const groupActive = group.items.some(i => isActive(i.href));
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => setAttOpen(isOpen ? null : group.id)}
                className="sb-item"
                style={{
                  color: groupActive || isOpen ? "#FFB680" : "rgba(255,255,255,.6)",
                  fontWeight: 600,
                }}
              >
                <Icon name={group.icon} />
                <span style={{ flex: 1 }}>{lang === "ar" ? group.ar : group.en}</span>
                <span style={{
                  display: "inline-flex",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0)",
                  transition: "transform .2s",
                }}>
                  <Icon name="chevron" size={11} />
                </span>
              </button>

              {isOpen && (
                <div style={{ paddingRight: lang === "ar" ? 10 : 0, paddingLeft: lang !== "ar" ? 10 : 0 }}>
                  {group.items.map((it) => {
                    const active = isActive(it.href);
                    return (
                      <Link
                        key={it.id}
                        href={it.href}
                        className={`sb-item ${active ? "on" : ""}`}
                        style={{
                          textDecoration: "none",
                          padding: "7px 16px",
                          fontSize: 11.5,
                          gap: 8,
                        }}
                      >
                        <Icon name={it.icon} size={12} />
                        <span>{lang === "ar" ? it.ar : it.en}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* BOTTOM: Student tracking + other modules + Settings (last) */}
        {renderNavNodes(BOTTOM_NAV, isActive, lang)}
      </nav>

      {/* FOOTER — icon buttons */}
      <div className="sb-foot">
        <button
          className="ico-btn"
          onClick={onToggleTheme}
          type="button"
          title={lang === "ar" ? "تغيير المظهر" : "Toggle theme"}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: "rgba(255,255,255,.07)",
            border: "1px solid rgba(255,255,255,.1)",
            color: "rgba(255,255,255,.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {theme === "light" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          )}
        </button>

        <button
          className="ico-btn"
          onClick={onToggleLang}
          type="button"
          style={{
            height: 30, borderRadius: 8, padding: "0 10px",
            background: "rgba(255,255,255,.07)",
            border: "1px solid rgba(255,255,255,.1)",
            color: "rgba(255,255,255,.65)",
            fontFamily: "var(--fm)",
            fontSize: 10, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {lang === "ar" ? "EN" : "ع"}
        </button>

        <div style={{ marginRight: lang === "ar" ? "auto" : 0, marginLeft: lang !== "ar" ? "auto" : 0 }}>
          <button
            type="button"
            onClick={() => logout()}
            className="btn btn-danger btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>{lang === "ar" ? "خروج" : "Logout"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
