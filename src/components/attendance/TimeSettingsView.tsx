"use client";

import { useState, useEffect } from "react";

interface ApiShape {
  timeSettings: () => Promise<any>;
  saveTimeSettings: (data: any) => Promise<any>;
  customGroups: () => Promise<any>;
  createCustomGroup: (data: any) => Promise<any>;
  updateCustomGroup: (id: number, data: any) => Promise<any>;
  deleteCustomGroup: (id: number) => Promise<any>;
}

interface Props {
  api: ApiShape;
  employeeType: "student" | "teacher";
  roleLabel: string;
}

const DAYS = [
  { key: "saturday",  ar: "السبت" },
  { key: "sunday",    ar: "الأحد" },
  { key: "monday",    ar: "الإثنين" },
  { key: "tuesday",   ar: "الثلاثاء" },
  { key: "wednesday", ar: "الأربعاء" },
  { key: "thursday",  ar: "الخميس" },
  { key: "friday",    ar: "الجمعة" },
];

interface Form {
  start_check_in: string;
  start_delay: string;
  delay_permission_period: number;
  start_absence: string;
  send_delay_message: boolean;
  send_permission_message: boolean;
  enable_auto_convert: boolean;
  auto_convert: "immediate" | "timed" | "";
  time_limit: string;
  study_stop_type: "auto" | "manual";
  start_date: string;
  end_date: string;
  study_days: string[];
}

const EMPTY_FORM: Form = {
  start_check_in: "06:00",
  start_delay: "07:00",
  delay_permission_period: 15,
  start_absence: "08:30",
  send_delay_message: false,
  send_permission_message: false,
  enable_auto_convert: false,
  auto_convert: "",
  time_limit: "14:00",
  study_stop_type: "auto",
  start_date: "",
  end_date: "",
  study_days: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
};

export default function TimeSettingsView({ api, employeeType, roleLabel }: Props) {
  const [tab, setTab] = useState<"default" | "custom">("default");

  /* Default timetable */
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  /* Custom groups */
  const [custom, setCustom] = useState<any[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [customForm, setCustomForm] = useState<Form & { name: string }>({ ...EMPTY_FORM, name: "" });

  async function load() {
    try {
      const r: any = await api.timeSettings();
      const data = r?.data ?? r;
      if (data?.default) {
        const d = data.default;
        setForm({
          start_check_in:          d.start_check_in ?? EMPTY_FORM.start_check_in,
          start_delay:             d.start_delay ?? EMPTY_FORM.start_delay,
          delay_permission_period: d.delay_permission_period ?? EMPTY_FORM.delay_permission_period,
          start_absence:           d.start_absence ?? EMPTY_FORM.start_absence,
          send_delay_message:      !!d.send_delay_message,
          send_permission_message: !!d.send_permission_message,
          enable_auto_convert:     !!d.enable_auto_convert,
          auto_convert:            (d.auto_convert ?? "") as any,
          time_limit:              d.time_limit ?? EMPTY_FORM.time_limit,
          study_stop_type:         (d.study_stop_type ?? "auto") as any,
          start_date:              d.start_date ?? "",
          end_date:                d.end_date ?? "",
          study_days: typeof d.study_days === "string"
            ? JSON.parse(d.study_days || "[]")
            : (d.study_days ?? []),
        });
      }
      setCustom(data?.custom ?? []);
    } catch { /* noop */ }
    setLoaded(true);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function saveDefault() {
    setSaving(true);
    setToast(null);
    try {
      await api.saveTimeSettings({
        ...form,
        employee_type: employeeType,
      });
      setToast({ ok: true, msg: "تم حفظ الإعدادات بنجاح" });
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" });
    } finally { setSaving(false); }
  }

  async function loadCustom() {
    setLoadingCustom(true);
    try {
      const r: any = await api.customGroups();
      setCustom(r?.data ?? r ?? []);
    } catch { setCustom([]); }
    finally { setLoadingCustom(false); }
  }

  function openNewCustom() {
    setEditingId(null);
    setCustomForm({ ...EMPTY_FORM, name: "" });
  }

  function openEditCustom(g: any) {
    setEditingId(g.id);
    setCustomForm({
      name:                    g.name ?? "",
      start_check_in:          g.start_check_in ?? EMPTY_FORM.start_check_in,
      start_delay:             g.start_delay ?? EMPTY_FORM.start_delay,
      delay_permission_period: g.delay_permission_period ?? EMPTY_FORM.delay_permission_period,
      start_absence:           g.start_absence ?? EMPTY_FORM.start_absence,
      send_delay_message:      !!g.send_delay_message,
      send_permission_message: !!g.send_permission_message,
      enable_auto_convert:     !!g.enable_auto_convert,
      auto_convert:            (g.auto_convert ?? "") as any,
      time_limit:              g.time_limit ?? EMPTY_FORM.time_limit,
      study_stop_type:         (g.study_stop_type ?? "auto") as any,
      start_date:              g.start_date ?? "",
      end_date:                g.end_date ?? "",
      study_days: typeof g.study_days === "string"
        ? JSON.parse(g.study_days || "[]")
        : (g.study_days ?? []),
    });
  }

  async function saveCustom() {
    if (!customForm.name.trim()) { setToast({ ok: false, msg: "أدخل اسم المجموعة" }); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateCustomGroup(editingId, customForm);
        setToast({ ok: true, msg: "تم تحديث المجموعة" });
      } else {
        await api.createCustomGroup({ ...customForm, employee_type: employeeType });
        setToast({ ok: true, msg: "تم إضافة المجموعة" });
      }
      setEditingId(null);
      setCustomForm({ ...EMPTY_FORM, name: "" });
      await loadCustom();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحفظ" });
    } finally { setSaving(false); }
  }

  async function deleteCustom(g: any) {
    if (!confirm(`حذف مجموعة "${g.name}"؟`)) return;
    try {
      await api.deleteCustomGroup(g.id);
      setToast({ ok: true, msg: "تم الحذف" });
      await loadCustom();
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message ?? "فشل الحذف" });
    }
  }

  function toggleDay(key: string, current: string[], setState: (d: string[]) => void) {
    setState(current.includes(key) ? current.filter(d => d !== key) : [...current, key]);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Tab active={tab === "default"} onClick={() => setTab("default")}>1️⃣ الإعدادات الافتراضية</Tab>
        <Tab active={tab === "custom"} onClick={() => { setTab("custom"); if (!custom.length) loadCustom(); }}>
          2️⃣ مجموعات مخصصة <Badge>{custom.length}</Badge>
        </Tab>
      </div>

      {toast && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: toast.ok ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`, color: toast.ok ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600 }}>
          {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          <button onClick={() => setToast(null)} style={{ float: "left", background: "none", border: 0, cursor: "pointer", color: "inherit", fontSize: 14 }}>×</button>
        </div>
      )}

      {tab === "default" && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 20 }}>
          {!loaded ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--tx2)" }}>جاري التحميل…</div>
          ) : (
            <>
              <TimeTableForm form={form} setForm={setForm} toggleDay={toggleDay} />
              <button onClick={saveDefault} disabled={saving} style={btnSave}>
                {saving ? "جاري الحفظ…" : "💾 حفظ الإعدادات الافتراضية"}
              </button>
            </>
          )}
        </div>
      )}

      {tab === "custom" && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Existing groups */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>المجموعات المخصصة ({custom.length})</h3>
              <button onClick={openNewCustom} style={btnBlue}>➕ مجموعة جديدة</button>
            </div>

            {loadingCustom ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)" }}>جاري التحميل…</div>
            ) : !custom.length ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--tx2)" }}>لا توجد مجموعات مخصصة</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
                {custom.map(g => (
                  <div key={g.id} style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 8, fontFamily: "var(--fm)" }}>
                      {g.start_check_in} → {g.start_absence} • {g.employees_count ?? 0} {roleLabel}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEditCustom(g)} style={btnGhost}>✏️ تعديل</button>
                      <button onClick={() => deleteCustom(g)} style={btnGhostRed}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New/Edit form */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
              {editingId ? "تعديل مجموعة" : "مجموعة جديدة"}
            </h3>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>اسم المجموعة</label>
              <input
                type="text"
                value={customForm.name}
                onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
                style={inp}
                placeholder="مثال: الصف الأول الثانوي"
              />
            </div>
            <TimeTableForm form={customForm} setForm={setCustomForm as any} toggleDay={toggleDay} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveCustom} disabled={saving} style={btnSave}>
                {saving ? "جاري الحفظ…" : (editingId ? "💾 تحديث" : "➕ إضافة")}
              </button>
              {editingId && (
                <button onClick={openNewCustom} style={btnGhost}>✕ إلغاء التعديل</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════
   FORM (reused for default + custom)
═══════════════════════════════════════ */
function TimeTableForm({ form, setForm, toggleDay }: { form: any; setForm: (f: any) => void; toggleDay: (k: string, c: string[], s: (d: string[]) => void) => void }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
        <Field label="بدء فترة البصم">
          <input type="time" value={form.start_check_in} onChange={e => setForm({ ...form, start_check_in: e.target.value })} style={inp} />
        </Field>
        <Field label="بدء التسجيل (start_delay)">
          <input type="time" value={form.start_delay} onChange={e => setForm({ ...form, start_delay: e.target.value })} style={inp} />
        </Field>
        <Field label="فترة السماحية (بالدقائق)">
          <input type="number" min="0" value={form.delay_permission_period} onChange={e => setForm({ ...form, delay_permission_period: parseInt(e.target.value) || 0 })} style={inp} />
        </Field>
        <Field label="بدء احتساب الغياب">
          <input type="time" value={form.start_absence} onChange={e => setForm({ ...form, start_absence: e.target.value })} style={inp} />
        </Field>
      </div>

      {/* Toggles */}
      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <Toggle
          label="إرسال رسالة فور تسجيل التأخير"
          checked={form.send_delay_message}
          onChange={v => setForm({ ...form, send_delay_message: v })}
        />
        <Toggle
          label="إرسال رسالة فور تسجيل الاستئذان"
          checked={form.send_permission_message}
          onChange={v => setForm({ ...form, send_permission_message: v })}
        />
      </div>

      {/* Auto convert section */}
      <div style={{ background: "#FFF4EC", border: "1px solid #FED7AA", borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <strong style={{ color: "#C2410C", fontSize: 13 }}>🔄 التحويل التلقائي للبصمة</strong>
          <div style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>
            لما يبصم الموظف مرة تانية، هل تتحوّل لخروج أوتوماتيك؟
          </div>
        </div>
        <Toggle
          label="تفعيل الخدمة"
          checked={form.enable_auto_convert}
          onChange={v => setForm({ ...form, enable_auto_convert: v, auto_convert: v ? (form.auto_convert || "immediate") : "" })}
        />
        {form.enable_auto_convert && (
          <>
            <Radio
              value={form.auto_convert}
              options={[
                { value: "immediate", label: "البصمة الثانية = خروج فوراً" },
                { value: "timed",     label: "البصمة الثانية = خروج بعد وقت محدد" },
              ]}
              onChange={v => setForm({ ...form, auto_convert: v })}
            />
            {form.auto_convert === "timed" && (
              <div style={{ marginTop: 10 }}>
                <Field label="الوقت المحدد">
                  <input type="time" value={form.time_limit} onChange={e => setForm({ ...form, time_limit: e.target.value })} style={inp} />
                </Field>
              </div>
            )}
          </>
        )}
      </div>

      {/* Study stop */}
      <div style={{ background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <strong style={{ fontSize: 13, marginBottom: 8, display: "block" }}>📅 التوقف الدراسي</strong>
        <Radio
          value={form.study_stop_type}
          options={[
            { value: "auto",   label: "حسب التقويم الرسمي للوزارة" },
            { value: "manual", label: "حسب التواريخ المُدخلة أدناه" },
          ]}
          onChange={v => setForm({ ...form, study_stop_type: v })}
        />
        {form.study_stop_type === "manual" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <Field label="بداية الفصل الدراسي">
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={inp} />
            </Field>
            <Field label="نهاية الفصل الدراسي">
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={inp} />
            </Field>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <label style={{ ...lbl, marginBottom: 8 }}>أيام الدراسة</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DAYS.map(d => (
              <label key={d.key} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6,
                background: form.study_days.includes(d.key) ? "var(--accent)" : "var(--bg2)",
                color:      form.study_days.includes(d.key) ? "#fff" : "var(--tx1)",
                border: "1px solid " + (form.study_days.includes(d.key) ? "var(--accent)" : "var(--brd)"),
                cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}>
                <input
                  type="checkbox"
                  checked={form.study_days.includes(d.key)}
                  onChange={() => toggleDay(d.key, form.study_days, (newDays) => setForm({ ...form, study_days: newDays }))}
                  style={{ display: "none" }}
                />
                {d.ar}
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   SUBCOMPONENTS
═══════════════════════════════════════ */
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 14px", background: active ? "var(--accent)" : "var(--bg3)",
      color: active ? "#fff" : "var(--tx1)",
      border: "1px solid " + (active ? "var(--accent)" : "var(--brd)"),
      borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>{children}</button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span style={{ background: "rgba(255,255,255,0.25)", padding: "1px 6px", borderRadius: 10, fontSize: 10, fontFamily: "var(--fm)" }}>{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--bg3)", border: "1px solid var(--brd)", borderRadius: 8, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
    </label>
  );
}

function Radio({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: any) => void }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {options.map(opt => (
        <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: "var(--bg2)", borderRadius: 6, cursor: "pointer", border: "1px solid " + (value === opt.value ? "var(--accent)" : "var(--brd)") }}>
          <input type="radio" checked={value === opt.value} onChange={() => onChange(opt.value)} />
          <span style={{ fontSize: 12 }}>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: "var(--bg2)", color: "var(--tx1)" };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, color: "var(--tx2)", marginBottom: 4, fontWeight: 600 };
const btnSave: React.CSSProperties  = { padding: "10px 20px", background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnBlue: React.CSSProperties  = { padding: "7px 14px", background: "#2563EB", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "6px 12px", background: "var(--bg2)", color: "var(--tx1)", border: "1px solid var(--brd)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" };
const btnGhostRed: React.CSSProperties = { padding: "6px 10px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" };
