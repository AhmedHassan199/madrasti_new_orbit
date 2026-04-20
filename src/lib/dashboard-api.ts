import { api } from "./api";

/*
 * One call to /dashboard now returns: kpis, recent_activity, weekly_attendance,
 * monthly_attendance, classes_performance, violation_types, at_risk_students.
 * kpis/activity/charts all hit the same endpoint so pages can pick the field
 * they need from the unified payload.
 */
export const dashboardApi = {
  kpis:      () => api("/dashboard"),
  activity:  () => api("/dashboard"),
  charts:    () => api("/dashboard"),
  overview:  () => api("/dashboard"),
  counselor: () => api("/dashboard/counselor"),
};
