import { api } from "./api";

const qs = (params: Record<string, any> = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : "";
};

type Paginated<T> = { data: T[]; meta: { current_page: number; per_page?: number; has_more: boolean } };
type Grouped = { date: string; transactions: any[]; count: number };
type DailyResponse = { data: Grouped[]; groups: { id: number; name: string }[]; meta: { current_page: number; per_page: number; has_more: boolean } };

export const attendanceApi = {
  // ═══════════════ STUDENTS ═══════════════
  students: {
    daily:  (p: Record<string, any> = {}) => api<DailyResponse>(`/attendance/students/daily${qs(p)}`),
    absent: (p: Record<string, any> = {}) => api<DailyResponse>(`/attendance/students/absent${qs(p)}`),
    late:   (p: Record<string, any> = {}) => api<DailyResponse>(`/attendance/students/late${qs(p)}`),
    statistics: (p: Record<string, any> = {}) => api<{ totals: any; by_day: any[] }>(`/attendance/students/statistics${qs(p)}`),

    earlyLeaves: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/students/early-leaves${qs(p)}`),
    earlyLeavesDaily: (date?: string) => api<{ data: any[]; date: string }>(`/attendance/students/early-leaves/daily${qs({ date })}`),
    earlyLeavesBulk: (data: { std_ids: number[]; std_time?: Record<number, string>; unified_punch_time?: string }) =>
      api<{ created: number; message: string }>("/attendance/students/early-leaves/bulk", { method: "POST", body: JSON.stringify(data) }),
    createEarlyLeave: (data: any) => api("/attendance/students/early-leaves", { method: "POST", body: JSON.stringify(data) }),

    excuses: () => api<{ data: any[] }>("/attendance/students/excuses"),
    attachExcuse: (data: any) => api("/attendance/students/excuses/attach", { method: "POST", body: JSON.stringify(data) }),
    detachExcuse: (transactionId: number) => api(`/attendance/students/excuses/transaction/${transactionId}`, { method: "DELETE" }),

    signatures: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/students/signatures${qs(p)}`),
    comparison: (p: Record<string, any> = {}) => api<{ data: any[] }>(`/attendance/students/comparison${qs(p)}`),

    messages: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/students/messages${qs(p)}`),
    messagesCount: () => api<{ count: number }>("/attendance/students/messages/count"),
    permissionMessages: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/students/messages/permission${qs(p)}`),
    sendMessages: (data: { transaction_ids: number[]; body?: string }) =>
      api<{ success: boolean; sent: number; skipped?: number; balance?: number; needed?: number; message: string }>(
        "/attendance/students/messages/send",
        { method: "POST", body: JSON.stringify(data) }
      ),
    messagesBalance: () => api<{ balance: number }>("/attendance/students/messages/balance"),

    timeSettings: () => api<{ default: any; custom: any[] }>("/attendance/students/time-settings"),
    saveTimeSettings: (data: any) => api("/attendance/students/time-settings", { method: "POST", body: JSON.stringify(data) }),
    customGroups: () => api<{ data: any[] }>("/attendance/students/time-settings/custom"),
    createCustomGroup: (data: any) => api("/attendance/students/time-settings/custom", { method: "POST", body: JSON.stringify(data) }),
    updateCustomGroup: (id: number, data: any) => api(`/attendance/students/time-settings/custom/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCustomGroup: (id: number) => api(`/attendance/students/time-settings/custom/${id}`, { method: "DELETE" }),
    assignEmployeesToGroup: (id: number, employeeIds: number[]) => api(`/attendance/students/time-settings/custom/${id}/employees`, { method: "POST", body: JSON.stringify({ employee_ids: employeeIds }) }),

    messageSettings: () => api<{ data: any }>("/attendance/students/message-settings"),
    saveMessageSettings: (data: any) => api("/attendance/students/message-settings", { method: "POST", body: JSON.stringify(data) }),
  },

  // ═══════════════ TEACHERS ═══════════════
  teachers: {
    daily:  (p: Record<string, any> = {}) => api<DailyResponse>(`/attendance/teachers/daily${qs(p)}`),
    absent: (p: Record<string, any> = {}) => api<DailyResponse>(`/attendance/teachers/absent${qs(p)}`),
    late:   (p: Record<string, any> = {}) => api<DailyResponse>(`/attendance/teachers/late${qs(p)}`),
    log:    (p: Record<string, any> = {}) => api<DailyResponse>(`/attendance/teachers/log${qs(p)}`),
    statistics: (p: Record<string, any> = {}) => api<{ totals: any; by_day: any[] }>(`/attendance/teachers/statistics${qs(p)}`),

    earlyLeaves: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/teachers/early-leaves${qs(p)}`),
    earlyLeavesDaily: (date?: string) => api<{ data: any[]; date: string }>(`/attendance/teachers/early-leaves/daily${qs({ date })}`),
    createEarlyLeave: (data: any) => api("/attendance/teachers/early-leaves", { method: "POST", body: JSON.stringify(data) }),
    earlyLeavesBulk: (data: { std_ids: number[]; std_time?: Record<number, string>; unified_punch_time?: string }) =>
      api<{ created: number; message: string }>("/attendance/teachers/early-leaves/bulk", { method: "POST", body: JSON.stringify(data) }),

    signatures: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/teachers/signatures${qs(p)}`),

    messages: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/teachers/messages${qs(p)}`),
    sendMessages: (data: { transaction_ids: number[]; body?: string }) =>
      api<{ success: boolean; sent: number; skipped?: number; balance?: number; needed?: number; message: string }>(
        "/attendance/teachers/messages/send",
        { method: "POST", body: JSON.stringify(data) }
      ),
    messagesBalance: () => api<{ balance: number }>("/attendance/teachers/messages/balance"),

    timeSettings: () => api<{ default: any; custom: any[] }>("/attendance/teachers/time-settings"),
    saveTimeSettings: (data: any) => api("/attendance/teachers/time-settings", { method: "POST", body: JSON.stringify(data) }),
    customGroups: () => api<{ data: any[] }>("/attendance/teachers/time-settings/custom"),
    createCustomGroup: (data: any) => api("/attendance/teachers/time-settings/custom", { method: "POST", body: JSON.stringify(data) }),
    updateCustomGroup: (id: number, data: any) => api(`/attendance/teachers/time-settings/custom/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCustomGroup: (id: number) => api(`/attendance/teachers/time-settings/custom/${id}`, { method: "DELETE" }),
    assignEmployeesToGroup: (id: number, employeeIds: number[]) => api(`/attendance/teachers/time-settings/custom/${id}/employees`, { method: "POST", body: JSON.stringify({ employee_ids: employeeIds }) }),

    messageSettings: () => api<{ data: any }>("/attendance/teachers/message-settings"),
    saveMessageSettings: (data: any) => api("/attendance/teachers/message-settings", { method: "POST", body: JSON.stringify(data) }),

    punishments: (p: Record<string, any>) => api<{ data: any[]; period: any }>(`/attendance/teachers/punishments${qs(p)}`),
    noCheckout: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/teachers/no-checkout${qs(p)}`),

    unavailabilities: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/teachers/unavailabilities${qs(p)}`),
    createUnavailability: (data: any) => api("/attendance/teachers/unavailabilities", { method: "POST", body: JSON.stringify(data) }),
    deleteUnavailability: (id: number) => api(`/attendance/teachers/unavailabilities/${id}`, { method: "DELETE" }),
  },

  // ═══════════════ DEVICES ═══════════════
  devices: {
    list: () => api<{ data: any[] }>("/attendance/devices"),
    create: (data: any) => api("/attendance/devices", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => api(`/attendance/devices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => api(`/attendance/devices/${id}`, { method: "DELETE" }),

    transactions: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/devices/transactions${qs(p)}`),
    transactionsCount: (p: Record<string, any> = {}) => api<{ count: number }>(`/attendance/devices/transactions/count${qs(p)}`),
    upload: (data: any) => api("/attendance/devices/transactions/upload", { method: "POST", body: JSON.stringify(data) }),
    uploadMy: (data: { from: string; to: string }) => api<{ dispatched: boolean; employees_count: number; message: string }>("/attendance/devices/transactions/upload-my", { method: "POST", body: JSON.stringify(data) }),
    uploadAll: (data: { from: string; to: string }) => api<{ dispatched: boolean; days: number; message: string }>("/attendance/devices/transactions/upload-all", { method: "POST", body: JSON.stringify(data) }),
    removeByRange: (data: { from: string; to: string }) => api<{ deleted: number; message: string }>("/attendance/devices/transactions/remove-range", { method: "POST", body: JSON.stringify(data) }),
    updateStatuses: (data: { from: string; to: string }) => api<{ dispatched: boolean; message: string }>("/attendance/devices/transactions/update-statuses", { method: "POST", body: JSON.stringify(data) }),
    removeTransactions: (ids: number[]) => api("/attendance/devices/transactions/remove", { method: "POST", body: JSON.stringify({ transaction_ids: ids }) }),
    updateStatus: (id: number, status: number) => api("/attendance/devices/transactions/update", { method: "POST", body: JSON.stringify({ transaction_id: id, status }) }),
    report: (p: Record<string, any> = {}) => api<{ data: any[] }>(`/attendance/devices/transactions/report${qs(p)}`),
  },

  // ═══════════════ MESSAGE REPLIES ═══════════════
  replies: {
    list: (p: Record<string, any> = {}) => api<Paginated<any>>(`/attendance/message-replies${qs(p)}`),
  },

  // ═══════════════ BIOTIME INTEGRATION ═══════════════
  biotime: {
    employees: (p: { type?: "student" | "teacher" | "both"; search?: string } = {}) =>
      api<{ synced: any[]; unsynced: any[]; counts: { total: number; synced: number; unsynced: number } }>(
        `/attendance/biotime/employees${qs(p)}`
      ),
    addEmployees: (data: { type: "student" | "teacher" | "both"; employee_ids?: number[] }) =>
      api<{ dispatched: boolean; message: string }>("/attendance/biotime/employees/add", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    removeEmployees: (employee_ids: number[]) =>
      api<{ dispatched: boolean; count: number; message: string }>("/attendance/biotime/employees/remove", {
        method: "POST",
        body: JSON.stringify({ employee_ids }),
      }),
    testConnection: () =>
      api<{ connected: boolean; server_ip: string; has_token?: boolean; error?: string; message?: string }>(
        "/attendance/biotime/test"
      ),
    syncDevices: () =>
      api<{ dispatched: boolean; message: string }>("/attendance/biotime/sync/devices", { method: "POST" }),
    syncEmployees: () =>
      api<{ dispatched: boolean; message: string }>("/attendance/biotime/sync/employees", { method: "POST" }),
  },
};
