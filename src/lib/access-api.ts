import { api } from "./api";

/**
 * إدارة الوصول — SMS + Department settings.
 * Mirrors orbit-fingerprint-user UserSmsController + UserDepartmentController.
 */
export const accessApi = {
  smsGet: () => api<{
    sms_sender_name: string | null;
    sms_user_token: string | null;
    has_token: boolean;
    senders: any[];
    balance: number | null;
  }>("/access/sms"),

  smsSave: (data: { sms_sender_name?: string; sms_user_token?: string }) =>
    api<{ saved: boolean; message: string }>("/access/sms", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Test a token against the SMS provider without saving it. */
  smsTest: (data: { sms_user_token: string }) =>
    api<{
      valid: boolean;
      balance?: number;
      senders?: string[];
      senders_count?: number;
      status?: number;
      message: string;
    }>("/access/sms/test", { method: "POST", body: JSON.stringify(data) }),

  departmentGet: () => api<{
    department_name: string | null;
    region: string | null;
    sector: string | null;
    school_manager_name: string | null;
  }>("/access/department"),

  departmentSave: (data: {
    department_name: string;
    region: string;
    sector: string;
    school_manager_name: string;
  }) =>
    api<{ saved: boolean; message: string }>("/access/department", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
