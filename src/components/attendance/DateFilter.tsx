"use client";

import { useUi } from "@/contexts/UiContext";

interface Props {
  value?: string;
  onChange: (v: string) => void;
  label_ar?: string;
  label_en?: string;
}

export default function DateFilter({ value, onChange, label_ar = "التاريخ", label_en = "Date" }: Props) {
  const { lang } = useUi();
  return (
    <div className="fg" style={{ marginBottom: 0 }}>
      <label className="fl">{lang === "ar" ? label_ar : label_en}</label>
      <input
        type="date"
        className="fi"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ minWidth: 150 }}
      />
    </div>
  );
}
