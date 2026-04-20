import { api } from "./api";

const qs = (params: Record<string, any> = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : "";
};

export const employeesApi = {
  list:        (params: Record<string, any> = {}) => {
    // Accept { role: "student" | "teacher" } or { type: ... } interchangeably
    const p: Record<string, any> = { ...params };
    if (p.role && !p.type) { p.type = p.role === "teacher" ? "teacher" : "student"; delete p.role; }
    return api("/employees" + qs(p));
  },
  students:    (params: Record<string, any> = {}) => api("/employees" + qs({ ...params, type: "student" })),
  teachers:    (params: Record<string, any> = {}) => api("/employees" + qs({ ...params, type: "teacher" })),
  show:        (id: number | string) => api("/employees/" + id),
  create:      (data: any) => api("/employees", { method: "POST", body: JSON.stringify(data) }),
  update:      (id: number | string, data: any) => api("/employees/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete:      (id: number | string) => api("/employees/" + id, { method: "DELETE" }),
  groups:      (params: Record<string, any> = {}) => api("/groups" + qs(params)),
  showGroup:   (id: number | string) => api("/groups/" + id),
  createGroup: (data: any) => api("/groups", { method: "POST", body: JSON.stringify(data) }),
  updateGroup: (id: number | string, data: any) => api("/groups/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteGroup: (id: number | string) => api("/groups/" + id, { method: "DELETE" }),
  subGroups:   (groupId: number | string) => api("/sub-groups?group_id=" + groupId),
  subGroupsAll:    (params: Record<string, any> = {}) => api("/sub-groups" + qs(params)),
  createSubGroup:  (data: any) => api("/sub-groups", { method: "POST", body: JSON.stringify(data) }),
  updateSubGroup:  (id: number | string, data: any) => api("/sub-groups/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteSubGroup:  (id: number | string) => api("/sub-groups/" + id, { method: "DELETE" }),
  guardians:   (empId: number | string) => api("/employees/" + empId + "/guardians"),
  addGuardian: (empId: number | string, data: any) => api("/employees/" + empId + "/guardians", { method: "POST", body: JSON.stringify(data) }),
  comments:    (empId: number | string) => api("/employees/" + empId + "/comments"),
  addComment:  (empId: number | string, data: any) => api("/employees/" + empId + "/comments", { method: "POST", body: JSON.stringify(data) }),

  // Drawer extra tabs (Academic / Attendance / Behavior / Timeline)
  grades:                  (empId: number | string) => api("/employees/" + empId + "/grades"),
  addGrade:                (empId: number | string, data: any) => api("/employees/" + empId + "/grades", { method: "POST", body: JSON.stringify(data) }),
  violations:              (empId: number | string) => api("/employees/" + empId + "/violations"),
  addViolation:            (empId: number | string, data: any) => api("/employees/" + empId + "/violations", { method: "POST", body: JSON.stringify(data) }),
  attendanceDetailed:      (empId: number | string) => api("/employees/" + empId + "/attendance-detailed"),
  timeline:                (empId: number | string) => api("/employees/" + empId + "/timeline"),

  /* ── Excel Import / Format ── */
  import: async (file: File, type: "student" | "teacher" = "student") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    const token = typeof window !== "undefined" ? localStorage.getItem("smos_token") : null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees/import`, {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.success === false) throw new Error(body?.message ?? "فشل الاستيراد");
    return body;
  },

  formatExcel: async (file: File, classNumber: string, groupCode: string): Promise<Blob> => {
    const fd = new FormData();
    fd.append("excel_file", file);
    fd.append("class_number", classNumber);
    fd.append("group_code", groupCode);
    const token = typeof window !== "undefined" ? localStorage.getItem("smos_token") : null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employees/format-excel`, {
      method: "POST",
      body: fd,
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) {
      let msg = "فشل ضبط الملف";
      try { const b = await res.json(); msg = b?.message ?? msg; } catch {}
      throw new Error(msg);
    }
    return res.blob();
  },
};
