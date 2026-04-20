"use client";

import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export default function PageCard({ children, title, actions }: Props) {
  return (
    <div style={{
      background: "var(--bg1)",
      border: "1.5px solid var(--brd)",
      borderRadius: 14,
      padding: 16,
      boxShadow: "var(--card-sh)",
      marginBottom: 16,
    }}>
      {(title || actions) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          {title && <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{title}</h2>}
          {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
