import { api } from "./api";

const qs = (params: Record<string, any> = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : "";
};

// ── Behavior ────────────────────────────────────────────────────────────────
export const behaviorApi = {
  incidents:       (params: Record<string, any> = {}) => api("/behavior/incidents" + qs(params)),
  showIncident:    (id: number | string) => api("/behavior/incidents/" + id),
  createIncident:  (data: any) => api("/behavior/incidents", { method: "POST", body: JSON.stringify(data) }),
  updateIncident:  (id: number | string, data: any) => api("/behavior/incidents/" + id, { method: "PUT", body: JSON.stringify(data) }),
  closeIncident:   (id: number | string, status: string) => api("/behavior/incidents/" + id + "/close", { method: "POST", body: JSON.stringify({ status }) }),
  deleteIncident:  (id: number | string) => api("/behavior/incidents/" + id, { method: "DELETE" }),
  rules:           (params: Record<string, any> = {}) => api("/behavior/rules" + qs(params)),
  createRule:      (data: any) => api("/behavior/rules", { method: "POST", body: JSON.stringify(data) }),
  updateRule:      (id: number | string, data: any) => api("/behavior/rules/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteRule:      (id: number | string) => api("/behavior/rules/" + id, { method: "DELETE" }),
  analytics:       (params: Record<string, any> = {}) => api("/behavior/analytics" + qs(params)),
};

// ── Tasks ────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list:       (params: Record<string, any> = {}) => api("/tasks" + qs(params)),
  kanban:     () => api("/tasks/kanban"),
  show:       (id: number | string) => api("/tasks/" + id),
  create:     (data: any) => api("/tasks", { method: "POST", body: JSON.stringify(data) }),
  update:     (id: number | string, data: any) => api("/tasks/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete:     (id: number | string) => api("/tasks/" + id, { method: "DELETE" }),
  toggle:     (id: number | string) => api("/tasks/" + id + "/toggle", { method: "POST" }),
  comments:   (id: number | string) => api("/tasks/" + id + "/comments"),
  addComment: (id: number | string, content: string) => api("/tasks/" + id + "/comments", { method: "POST", body: JSON.stringify({ content }) }),
};

// ── Messages ─────────────────────────────────────────────────────────────────
export const messagesApi = {
  list:    (params: Record<string, any> = {}) => api("/messages" + qs(params)),
  history: (params: Record<string, any> = {}) => api("/messages" + qs(params)),
  show:    (id: number | string) => api("/messages/" + id),
  send:    (data: {
    message: string;
    type?: string;
    group_ids?: number[];
    sub_group_ids?: number[];
    employee_ids?: number[];
    phone_numbers?: string[];
  }) => api<{ message_id: number; recipients: number; dispatched: number; balance: number; message: string }>(
    "/messages/send", { method: "POST", body: JSON.stringify(data) }
  ),
  balance: () => api<{ balance: number }>("/messages/balance"),
  resolveRecipients: (data: {
    group_ids?: number[];
    sub_group_ids?: number[];
    employee_ids?: number[];
    phone_numbers?: string[];
  }) => api<{ count: number; phones: string[] }>("/messages/resolve", { method: "POST", body: JSON.stringify(data) }),

  // Drafts
  drafts:        (params: Record<string, any> = {}) => api("/messages/drafts" + qs(params)),
  createDraft:   (data: any) => api("/messages/drafts", { method: "POST", body: JSON.stringify(data) }),
  updateDraft:   (id: number | string, data: any) => api("/messages/drafts/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteDraft:   (id: number | string) => api("/messages/drafts/" + id, { method: "DELETE" }),

  // Scheduled
  scheduled:        (params: Record<string, any> = {}) => api("/messages/scheduled" + qs(params)),
  createScheduled:  (data: any) => api("/messages/scheduled", { method: "POST", body: JSON.stringify(data) }),
  updateScheduled:  (id: number | string, data: any) => api("/messages/scheduled/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteScheduled:  (id: number | string) => api("/messages/scheduled/" + id, { method: "DELETE" }),

  // Auto rules
  autoRules:        (params: Record<string, any> = {}) => api("/messages/auto-rules" + qs(params)),
  createAutoRule:   (data: any) => api("/messages/auto-rules", { method: "POST", body: JSON.stringify(data) }),
  updateAutoRule:   (id: number | string, data: any) => api("/messages/auto-rules/" + id, { method: "PUT", body: JSON.stringify(data) }),
  toggleAutoRule:   (id: number | string) => api("/messages/auto-rules/" + id + "/toggle", { method: "POST" }),
  deleteAutoRule:   (id: number | string) => api("/messages/auto-rules/" + id, { method: "DELETE" }),

  // Templates
  templates:        (params: Record<string, any> = {}) => api("/messages/templates" + qs(params)),
  createTemplate:   (data: any) => api("/messages/templates", { method: "POST", body: JSON.stringify(data) }),
  updateTemplate:   (id: number | string, data: any) => api("/messages/templates/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteTemplate:   (id: number | string) => api("/messages/templates/" + id, { method: "DELETE" }),
};

// ── Summons ──────────────────────────────────────────────────────────────────
export const summonsApi = {
  list:   (params: Record<string, any> = {}) => api("/summons" + qs(params)),
  show:   (id: number | string) => api("/summons/" + id),
  create: (data: any) => api("/summons", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number | string, data: any) => api("/summons/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number | string) => api("/summons/" + id, { method: "DELETE" }),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsApi = {
  school:              () => api("/settings"),
  updateSchool:        (data: any) => api("/settings", { method: "PUT", body: JSON.stringify(data) }),
  notifications:       () => api("/settings/notifications"),
  updateNotifications: (data: any) => api("/settings/notifications", { method: "PUT", body: JSON.stringify(data) }),

  // Activity log
  activity: (params: Record<string, any> = {}) => api("/settings/activity" + qs(params)),

  // Appearance preferences
  preferences:     () => api("/settings/preferences"),
  savePreferences: (data: any) => api("/settings/preferences", { method: "PUT", body: JSON.stringify(data) }),

  // Backup
  backup:       () => api("/settings/backup"),
  createBackup: () => api("/settings/backup", { method: "POST" }),

  // Logo (FormData — uses custom fetch bypass)
  uploadLogo: async (file: File) => {
    const fd = new FormData();
    fd.append("logo", file);
    return api("/settings/logo", { method: "POST", body: fd, headers: { /* let browser set Content-Type */ } as any });
  },
};

// ── Schedule ──────────────────────────────────────────────────────────────────
export const scheduleApi = {
  list:   (params: Record<string, any> = {}) => api("/schedule/weekly" + qs(params)),
  weekly: (params: Record<string, any> = {}) => api("/schedule/weekly" + qs(params)),
  grid:   (params: Record<string, any> = {}) => api("/schedule/grid" + qs(params)),
  create: (data: any) => api("/schedule", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number | string, data: any) => api("/schedule/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number | string) => api("/schedule/" + id, { method: "DELETE" }),
};

// ── Committees ────────────────────────────────────────────────────────────────
export const committeesApi = {
  list:        (params: Record<string, any> = {}) => api("/committees" + qs(params)),
  show:        (id: number | string) => api("/committees/" + id),
  create:      (data: any) => api("/committees", { method: "POST", body: JSON.stringify(data) }),
  update:      (id: number | string, data: any) => api("/committees/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete:      (id: number | string) => api("/committees/" + id, { method: "DELETE" }),

  members:      (id: number | string) => api("/committees/" + id + "/members"),
  addMember:    (id: number | string, data: any) => api("/committees/" + id + "/members", { method: "POST", body: JSON.stringify(data) }),
  removeMember: (id: number | string, empId: number | string) => api("/committees/" + id + "/members/" + empId, { method: "DELETE" }),

  files:     (id: number | string) => api("/committees/" + id + "/files"),
  addFile:   (id: number | string, data: any) => api("/committees/" + id + "/files", { method: "POST", body: JSON.stringify(data) }),
  deleteFile:(id: number | string, fileId: number | string) => api("/committees/" + id + "/files/" + fileId, { method: "DELETE" }),

  // Tasks (inside a committee)
  tasks:      (id: number | string) => api("/committees/" + id + "/tasks"),
  addTask:    (id: number | string, data: any) => api("/committees/" + id + "/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: number | string, taskId: number | string, data: any) => api("/committees/" + id + "/tasks/" + taskId, { method: "PUT", body: JSON.stringify(data) }),
  deleteTask: (id: number | string, taskId: number | string) => api("/committees/" + id + "/tasks/" + taskId, { method: "DELETE" }),

  // Meetings
  meetings:      (id: number | string) => api("/committees/" + id + "/meetings"),
  addMeeting:    (id: number | string, data: any) => api("/committees/" + id + "/meetings", { method: "POST", body: JSON.stringify(data) }),
  updateMeeting: (id: number | string, mId: number | string, data: any) => api("/committees/" + id + "/meetings/" + mId, { method: "PUT", body: JSON.stringify(data) }),
  deleteMeeting: (id: number | string, mId: number | string) => api("/committees/" + id + "/meetings/" + mId, { method: "DELETE" }),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  templates:      (params: Record<string, any> = {}) => api("/reports/templates" + qs(params)),
  generate:       (data: any) => api("/reports/generate", { method: "POST", body: JSON.stringify(data) }),
  history:        (params: Record<string, any> = {}) => api("/reports/history" + qs(params)),
  download:       (id: number | string) => api("/reports/" + id + "/download"),
};

// ── Forms ─────────────────────────────────────────────────────────────────────
export const formsApi = {
  list:          (params: Record<string, any> = {}) => api("/forms" + qs(params)),
  show:          (id: number | string) => api("/forms/" + id),
  create:        (data: any) => api("/forms", { method: "POST", body: JSON.stringify(data) }),
  update:        (id: number | string, data: any) => api("/forms/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete:        (id: number | string) => api("/forms/" + id, { method: "DELETE" }),
  questions:     (id: number | string) => api("/forms/" + id + "/questions"),
  addQuestion:   (id: number | string, data: any) => api("/forms/" + id + "/questions", { method: "POST", body: JSON.stringify(data) }),
  responses:     (id: number | string) => api("/forms/" + id + "/responses"),
  responseStats: (id: number | string) => api("/forms/" + id + "/responses/stats"),
  exportCsv:     (id: number | string) => api("/forms/" + id + "/responses/export"),
};

// ── Portfolio ─────────────────────────────────────────────────────────────────
export const portfolioApi = {
  list:       (params: Record<string, any> = {}) => api("/portfolio" + qs(params)),
  show:       (id: number | string) => api("/portfolio/" + id),
  create:     (data: any) => api("/portfolio", { method: "POST", body: JSON.stringify(data) }),
  update:     (id: number | string, data: any) => api("/portfolio/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete:     (id: number | string) => api("/portfolio/" + id, { method: "DELETE" }),
  documents:  (id: number | string) => api("/portfolio/" + id + "/documents"),
  addDoc:     (id: number | string, data: any) => api("/portfolio/" + id + "/documents", { method: "POST", body: JSON.stringify(data) }),
  deleteDoc:  (portfolioId: number | string, docId: number | string) => api("/portfolio/" + portfolioId + "/documents/" + docId, { method: "DELETE" }),

  // Admin feedback / approve / reminder
  feedback:     (id: number | string) => api("/portfolio/" + id + "/feedback"),
  addFeedback:  (id: number | string, data: any) => api("/portfolio/" + id + "/feedback", { method: "POST", body: JSON.stringify(data) }),
  approve:      (id: number | string) => api("/portfolio/" + id + "/approve", { method: "POST" }),
  sendReminder: (id: number | string) => api("/portfolio/" + id + "/reminder", { method: "POST" }),
};

// ── Exam Distribution ─────────────────────────────────────────────────────────
export const examDistApi = {
  sessions:      (params: Record<string, any> = {}) => api("/exam-dist/sessions" + qs(params)),
  showSession:   (id: number | string) => api("/exam-dist/sessions/" + id),
  createSession: (data: any) => api("/exam-dist/sessions", { method: "POST", body: JSON.stringify(data) }),
  updateSession: (id: number | string, data: any) => api("/exam-dist/sessions/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteSession: (id: number | string) => api("/exam-dist/sessions/" + id, { method: "DELETE" }),
  rooms:         (params: Record<string, any> = {}) => api("/exam-dist/rooms" + qs(params)),
  createRoom:    (data: any) => api("/exam-dist/rooms", { method: "POST", body: JSON.stringify(data) }),
  updateRoom:    (id: number | string, data: any) => api("/exam-dist/rooms/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteRoom:    (id: number | string) => api("/exam-dist/rooms/" + id, { method: "DELETE" }),
  seats:         (sessionId: number | string) => api("/exam-dist/sessions/" + sessionId + "/seats"),
  distribute:    (sessionId: number | string, data: any) => api("/exam-dist/sessions/" + sessionId + "/distribute", { method: "POST", body: JSON.stringify(data) }),
  seatSearch:    (params: Record<string, any> = {}) => api("/exam-dist/seats/search" + qs(params)),
};

// ── At-Risk ───────────────────────────────────────────────────────────────────
export const atRiskApi = {
  list:    (params: Record<string, any> = {}) => api("/at-risk" + qs(params)),
  show:    (id: number | string) => api("/at-risk/" + id),
  summary: () => api("/at-risk/summary"),
  runAssessment: () => api("/at-risk/run-assessment", { method: "POST" }),

  // Interventions
  interventions:       (id: number | string) => api("/at-risk/" + id + "/interventions"),
  addIntervention:     (id: number | string, data: any) => api("/at-risk/" + id + "/interventions", { method: "POST", body: JSON.stringify(data) }),
  updateIntervention:  (id: number | string, stepId: number | string, data: any) =>
    api("/at-risk/" + id + "/interventions/" + stepId, { method: "PUT", body: JSON.stringify(data) }),

  // Notes
  saveNotes: (id: number | string, notes: string) => api("/at-risk/" + id + "/notes", { method: "PUT", body: JSON.stringify({ notes }) }),

  // Timeline
  timeline:       (id: number | string) => api("/at-risk/" + id + "/timeline"),
  appendTimeline: (id: number | string, data: any) => api("/at-risk/" + id + "/timeline", { method: "POST", body: JSON.stringify(data) }),

  // Bulk notify
  notifyParents: (ids: (number | string)[]) => api("/at-risk/notify", { method: "POST", body: JSON.stringify({ ids }) }),
};

// ── Noor Integration ──────────────────────────────────────────────────────────
export const noorApi = {
  status: () => api("/noor/status"),
  sync:   (data: any = {}) => api("/noor/sync", { method: "POST", body: JSON.stringify(data) }),
  logs:   (params: Record<string, any> = {}) => api("/noor/logs" + qs(params)),
};

// ── Integration systems (full integrations endpoint set) ──────────────────────
export const integrationsApi = {
  list:   (params: Record<string, any> = {}) => api("/integrations" + qs(params)),
  show:   (id: number | string) => api("/integrations/" + id),
  create: (data: any) => api("/integrations", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number | string, data: any) => api("/integrations/" + id, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number | string) => api("/integrations/" + id, { method: "DELETE" }),

  saveMappings: (id: number | string, mappings: any[]) => api("/integrations/" + id + "/mappings", { method: "PUT", body: JSON.stringify({ mappings }) }),
  sync:         (id: number | string) => api("/integrations/" + id + "/sync", { method: "POST" }),
  logs:         (id: number | string, params: Record<string, any> = {}) => api("/integrations/" + id + "/logs" + qs(params)),

  pending:        (id: number | string, params: Record<string, any> = {}) => api("/integrations/" + id + "/pending" + qs(params)),
  resolvePending: (id: number | string, pendingId: number | string, action: string) =>
    api("/integrations/" + id + "/pending/" + pendingId, { method: "POST", body: JSON.stringify({ action }) }),

  test:               (id: number | string) => api("/integrations/" + id + "/test", { method: "POST" }),
  webhook:            (id: number | string) => api("/integrations/" + id + "/webhook"),
  regenerateWebhook:  (id: number | string) => api("/integrations/" + id + "/webhook/regenerate", { method: "POST" }),
};
