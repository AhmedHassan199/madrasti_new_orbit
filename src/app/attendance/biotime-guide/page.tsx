"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUi } from "@/contexts/UiContext";

export default function BiotimeGuidePage() {
  const { lang } = useUi();

  return (
    <DashboardLayout
      title={lang === "ar" ? "دليل التعامل مع البصمة" : "BioTime Usage Guide"}
      subtitle={lang === "ar" ? "شرح كامل لكيفية استخدام نظام البصمة والتكامل مع BioTime" : "Full guide to using the fingerprint system"}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <Section icon="🎯" title="نظرة عامة" color="#2563EB" bg="#EFF6FF">
          <p>نظام البصمة مرتبط بجهاز <strong>BioTime</strong> عن طريق REST API. كل بصمة تحدث في الجهاز تُسحب تلقائياً وتُصنّف كـ حاضر/متأخر/غائب بناءً على إعدادات الوقت المضبوطة.</p>
        </Section>

        <Section icon="⚙️" title="الخطوة 1 — الإعداد الأولي" color="#D97706" bg="#FFFBEB">
          <ol>
            <li><strong>إعدادات الوقت:</strong> اذهب لـ <Mono>البصمة للطلاب ← إعدادات الوقت</Mono> وحدد:
              <ul>
                <li>وقت بدء البصم (start_check_in)</li>
                <li>وقت بدء التأخير (start_delay)</li>
                <li>فترة السماحية بالدقائق</li>
                <li>وقت بدء احتساب الغياب (start_absence)</li>
                <li>أيام الدراسة</li>
              </ul>
            </li>
            <li><strong>نفس الخطوات للمعلمين</strong> من <Mono>البصمة للمعلمين ← إعدادات الوقت</Mono>.</li>
          </ol>
        </Section>

        <Section icon="👥" title="الخطوة 2 — إضافة الموظفين لـ BioTime" color="#059669" bg="#ECFDF5">
          <ol>
            <li>من <Mono>البصمة للطلاب ← جدول اضافه الطلاب</Mono> أضف الطلاب (اسم، هوية، هاتف، مجموعة).</li>
            <li>اذهب لصفحة <Mono>المقارنة مع BioTime</Mono> — الموظفون اللي مش على BioTime يظهروا باللون الأحمر.</li>
            <li>حدّدهم واضغط <strong>🔄 مزامنة المحدد</strong> — هيتم إرسالهم لجهاز البصمة تلقائياً.</li>
            <li>بعد لحظات اللون يتحول لـ <span style={{ color: "#D97706", fontWeight: 700 }}>أصفر (يحتاج تبصيم)</span> — لازم الموظف يسجل بصمته على الجهاز.</li>
            <li>لما يسجل البصمة، اللون يصبح <span style={{ color: "#059669", fontWeight: 700 }}>أخضر (البصمة سليمة)</span>.</li>
          </ol>
        </Section>

        <Section icon="🎨" title="ألوان المقارنة" color="#7C3AED" bg="#F5F3FF">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            <ColorBox color="#16A34A" bg="#DCFCE7" label="البصمة سليمة" desc="متزامن مع BioTime + عنده بصمة على الجهاز" />
            <ColorBox color="#F59E0B" bg="#FEF3C7" label="يحتاج تبصيم"   desc="متزامن مع BioTime لكن لسه مسجلش بصمة" />
            <ColorBox color="#DC2626" bg="#FEE2E2" label="غير موجود"      desc="موجود محلياً لكن مش على BioTime" />
            <ColorBox color="#2563EB" bg="#DBEAFE" label="بالبصمة فقط"    desc="على BioTime لكن مش محلياً" />
          </div>
        </Section>

        <Section icon="📥" title="الخطوة 3 — سحب البصمات" color="#0891B2" bg="#ECFEFF">
          <ul>
            <li><Mono>اجهزة البصمة ← سحب بصماتي</Mono>: يسحب بصمات موظفيك في فترة محددة.</li>
            <li><Mono>اجهزة البصمة ← رفع كل البصمات</Mono>: للمدير — يسحب كل البصمات يوم-يوم (rate-limited 10 دقائق).</li>
            <li><Mono>اجهزة البصمة ← تحديث التوقيعات</Mono>: يعيد حساب حالات البصمات (حاضر/متأخر/غائب) بناءً على إعدادات الوقت الحالية.</li>
          </ul>
        </Section>

        <Section icon="📊" title="الخطوة 4 — التقارير والإحصائيات" color="#DC2626" bg="#FEF2F2">
          <ul>
            <li><Mono>الكشف اليومي</Mono>: عرض الحضور/الغياب/التأخير ليوم محدد.</li>
            <li><Mono>جميع التوقيعات</Mono>: كل بصمات الموظفين في نطاق زمني.</li>
            <li><Mono>الإحصائيات</Mono>: إجمالي أيام الغياب ومجموع التأخير لكل موظف.</li>
            <li><Mono>سجل الغائبون/المتأخرون اليومي</Mono>: قوائم مفصّلة للمعلمين.</li>
          </ul>
        </Section>

        <Section icon="✉️" title="الخطوة 5 — إرسال الرسائل" color="#D97706" bg="#FFFBEB">
          <ul>
            <li><Mono>إعدادات الإرسال</Mono>: تحديد القنوات (SMS/WhatsApp) وقوالب الرسائل.</li>
            <li><Mono>ارسال رسائل الغياب والتأخير</Mono>: إرسال لأولياء الأمور عند تسجيل غياب أو تأخير.</li>
            <li><Mono>إرسال رسائل الاستئذان</Mono>: رسائل خاصة لطلبات الانصراف المبكر.</li>
            <li><Mono>ردود الرسائل</Mono>: استقبال ردود أولياء الأمور عبر link بـ token صالح 48 ساعة.</li>
          </ul>
        </Section>

        <Section icon="📝" title="الخطوة 6 — الاستئذانات" color="#0891B2" bg="#ECFEFF">
          <ul>
            <li><Mono>طلبات الانصراف المبكر</Mono>: إضافة طلب استئذان جماعي لمجموعة طلاب/معلمين.</li>
            <li><Mono>كشف يومى لطلبات الاستئذان</Mono>: عرض الطلبات المسجلة.</li>
            <li>لو الموظف خرج بعد وقت الاستئذان المسجل، حالته تتحول تلقائياً لـ <strong>مستأذن (status=4)</strong>.</li>
          </ul>
        </Section>

        <Section icon="⚠️" title="تنبيهات مهمة" color="#991B1B" bg="#FEE2E2">
          <ul>
            <li>التوقيت <strong>GMT+03</strong> (توقيت الرياض) — تأكد من ضبطه على جهاز BioTime.</li>
            <li>عند حذف موظف من BioTime، تتحذف بصماته أيضاً.</li>
            <li><Mono>سحب بصماتي</Mono> محدود 10 دقائق لكل مستخدم لتجنّب ضغط السيرفر.</li>
            <li>لا تغيّر إعدادات الوقت أثناء يوم دراسي — هيأثّر على الحسابات.</li>
          </ul>
        </Section>
      </div>
    </DashboardLayout>
  );
}

function Section({ icon, title, color, bg, children }: { icon: string; title: string; color: string; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: 12, padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: `2px solid ${bg}` }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color }}>{title}</h3>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--tx1)" }}>
        {children}
      </div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: "2px 6px", background: "var(--bg3)", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{children}</span>;
}

function ColorBox({ color, bg, label, desc }: { color: string; bg: string; label: string; desc: string }) {
  return (
    <div style={{ background: bg, border: `2px solid ${color}40`, borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color, marginBottom: 4 }}>● {label}</div>
      <div style={{ fontSize: 11, color: "var(--tx1)" }}>{desc}</div>
    </div>
  );
}
