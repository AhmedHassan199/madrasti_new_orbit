"use client";

import { useUi } from "@/contexts/UiContext";

interface Props {
  value?: string;
  onChange: (v: string) => void;
  groups: { id: number; name: string }[];
}

export default function GroupFilter({ value, onChange, groups }: Props) {
  const { lang } = useUi();
  return (
    <div className="fg" style={{ marginBottom: 0 }}>
      <label className="fl">{lang === "ar" ? "الفصل" : "Class"}</label>
      <select className="fi" value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={{ minWidth: 180 }}>
        <option value="">{lang === "ar" ? "كل الفصول" : "All classes"}</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
    </div>
  );
}
