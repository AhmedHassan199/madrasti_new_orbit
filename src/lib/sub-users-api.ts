import { api } from "./api";

const qs = (params: Record<string, any> = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : "";
};

export const subUsersApi = {
  list:              (params: Record<string, any> = {}) => api("/sub-users" + qs(params)),
  show:              (id: number | string) => api("/sub-users/" + id),
  create:            (data: any) => api("/sub-users", { method: "POST", body: JSON.stringify(data) }),
  update:            (id: number | string, data: any) => api("/sub-users/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete:            (id: number | string) => api("/sub-users/" + id, { method: "DELETE" }),
  permissions:       (id: number | string) => api("/sub-users/" + id + "/permissions"),
  updatePermissions: (id: number | string, data: any) => api("/sub-users/" + id + "/permissions", { method: "PUT", body: JSON.stringify(data) }),
};
