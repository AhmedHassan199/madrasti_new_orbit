"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";
import { settingsApi } from "@/lib/modules-api";

const SECTIONS = [
  {
    ar: "قنوات الإشعار",
    items: [
      { key: "n_internal", ar: "إشعارات داخلية (في النظام)", on: true },
      { key: "n_sms",      ar: "رسائل SMS",                   on: true },
      { key: "n_wa",       ar: "رسائل WhatsApp",              on: true },
      { key: "n_email",    ar: "بريد إلكتروني يومي",          on: false },
    ],
  },
  {
    ar: "تنبيهات الطلاب",
    items: [
      { key: "s_absent",  ar: "غياب متكرر (3 أيام فأكثر)",  on: true  },
      { key: "s_grade",   ar: "تراجع أكاديمي ملحوظ",         on: true  },
      { key: "s_behav",   ar: "مخالفة سلوكية خطيرة",         on: true  },
      { key: "s_atrisk",  ar: "دخول منطقة الخطر",            on: true  },
      { key: "s_improve", ar: "تحسّن ملحوظ في الأداء",       on: false },
    ],
  },
  {
    ar: "تنبيهات النظام",
    items: [
      { key: "sys_sms",    ar: "رصيد SMS أقل من 200",          on: true  },
      { key: "sys_sync",   ar: "فشل عملية مزامنة",            on: true  },
      { key: "sys_api",    ar: "انتهاء صلاحية رمز API",       on: true  },
      { key: "sys_backup", ar: "نسخة احتياطية ناجحة",         on: false },
      { key: "sys_login",  ar: "تسجيل دخول من جهاز جديد",    on: true  },
    ],
  },
];

function Sw({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 10, background: on ? "#E8702A" : "var(--bg3)", border: "1.5px solid " + (on ? "#E8702A" : "var(--brd2)"), position: "relative", cursor: "pointer", flexShrink: 0, transition: "background .2s" }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: on ? 2 : 16, transition: "right .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
    </div>
  );
}

export default function NotificationsSettingsPage() {
  const { lang } = useUi();
  const [saving, setSaving] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    SECTIONS.forEach(sec => sec.items.forEach(it => { m[it.key] = it.on; }));
    m["quiet"] = false;
    return m;
  });
  const toggle = (k: string) => setToggles(p => ({ ...p, [k]: !p[k] }));

  // Load saved notification settings from API
  useEffect(() => {
    settingsApi.notifications()
      .then((r: any) => {
        const rows = r.data ?? r ?? [];
        if (Array.isArray(rows)) {
          const m: Record<string, boolean> = {};
          rows.forEach((row: any) => {
            if (row.event) m[row.event] = !!(row.sms_enabled || row.whatsapp_enabled || row.email_enabled);
          });
          setToggles((prev) => ({ ...prev, ...m }));
        }
      })
      .catch(() => {});
  }, []);

  const save = () => {
    setSaving(true);
    const settings = Object.entries(toggles).map(([event, on]) => ({
      event,
      sms_enabled: on,
      whatsapp_enabled: false,
      email_enabled: false,
    }));
    settingsApi.updateNotifications({ settings })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  return (
    <DashboardLayout title={lang === "ar" ? "إعدادات الإشعارات" : "Notification Settings"}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>🔔 الإشعارات والتنبيهات</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>تحكم في جميع إشعارات النظام</div>
        </div>
        <button onClick={save} disabled={saving} style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: "#E8702A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>💾 {saving ? "جاري الحفظ…" : "حفظ الإعدادات"}</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
        {SECTIONS.map((sec, si) => (
          <div key={si} style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
            <div style={{ padding: "10px 14px", background: "var(--bg3)", fontSize: 11, fontWeight: 800, color: "var(--tx2)", borderBottom: "1px solid var(--brd)" }}>{sec.ar}</div>
            {sec.items.map((item, ii) => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: ii < sec.items.length - 1 ? "1px solid var(--brd)" : "none" }}>
                <span style={{ fontSize: 12.5 }}>{item.ar}</span>
                <Sw on={!!toggles[item.key]} onToggle={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        ))}

        {/* Quiet hours */}
        <div style={{ background: "var(--bg1)", border: "1.5px solid var(--brd)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--card-sh)" }}>
          <div style={{ padding: "10px 14px", background: "var(--bg3)", fontSize: 11, fontWeight: 800, color: "var(--tx2)", borderBottom: "1px solid var(--brd)" }}>ساعات الهدوء</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--brd)" }}>
            <div>
              <div style={{ fontSize: 12.5 }}>تفعيل ساعات الهدوء</div>
              <div style={{ fontSize: 10, color: "var(--tx2)" }}>لا إشعارات خلال هذه الفترة</div>
            </div>
            <Sw on={!!toggles["quiet"]} onToggle={() => toggle("quiet")} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px" }}>
            <span style={{ fontSize: 12, color: "var(--tx2)" }}>من</span>
            <input type="time" defaultValue="22:00" style={{ padding: "6px 8px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none", width: 100 }} />
            <span style={{ fontSize: 12, color: "var(--tx2)" }}>إلى</span>
            <input type="time" defaultValue="07:00" style={{ padding: "6px 8px", border: "1.5px solid var(--brd)", borderRadius: 7, background: "var(--bg1)", fontFamily: "inherit", fontSize: 12, color: "var(--tx0)", outline: "none", width: 100 }} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
