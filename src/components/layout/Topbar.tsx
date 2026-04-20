"use client";

interface Props {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: Props) {
  return (
    <header className="tb">
      <div className="tb-left">
        <div>
          <div className="tb-title">{title}</div>
          {subtitle && <div className="tb-breadcrumb">{subtitle}</div>}
        </div>
      </div>
      <div className="tb-right">
        {/* Notifications / quick actions in future phases */}
      </div>
    </header>
  );
}
