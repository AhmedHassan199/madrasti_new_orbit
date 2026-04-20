"use client";

const colors: Record<number, { bg: string; text: string; label_ar: string; label_en: string }> = {
  1: { bg: "rgba(34,197,94,.12)",  text: "#16A34A", label_ar: "حاضر",    label_en: "Present" },
  2: { bg: "rgba(245,158,11,.12)", text: "#B45309", label_ar: "متأخر",   label_en: "Late" },
  3: { bg: "rgba(239,68,68,.12)",  text: "#DC2626", label_ar: "غائب",    label_en: "Absent" },
  4: { bg: "rgba(59,130,246,.12)", text: "#2563EB", label_ar: "مستأذن",  label_en: "Excused" },
};

export default function StatusBadge({ status, lang = "ar" }: { status: number; lang?: "ar" | "en" }) {
  const c = colors[status] ?? { bg: "var(--bg3)", text: "var(--tx2)", label_ar: "غير محدد", label_en: "Unknown" };
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 9px",
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      fontSize: 11,
      fontWeight: 700,
    }}>
      {lang === "ar" ? c.label_ar : c.label_en}
    </span>
  );
}
