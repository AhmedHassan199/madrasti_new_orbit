const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Fetch wrapper for SMOS API.
 *
 * Backend يرجع SmosResponse format:
 *   Success: { success: true,  data: T, meta?: ..., filters?: ... }
 *   Error:   { success: false, message: "..." }
 *
 * الـ function بتعمل unwrap تلقائي:
 *   - لو success:true → ترجع الـ body كامل (data + meta + filters)
 *   - لو success:false → throw ApiError بالـ message
 *   - لو مفيش success field (legacy) → ترجع الـ body زي ما هو
 */
export async function api<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("smos_token")
      : null;

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = "فشل الطلب";
    try {
      const body = await res.json();
      message = body.message || message;
    } catch {
      // ignore json parse errors
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json();

  // SmosResponse unwrap: إذا الـ body فيه success field
  if (typeof body === "object" && body !== null && "success" in body) {
    if (body.success === false) {
      throw new ApiError(body.message || "فشل الطلب", res.status);
    }
    // ترجع الـ body كامل بدون الـ success field
    // عشان الـ consumers يقدروا يوصلوا لـ data + meta + filters
    const { success: _, ...rest } = body;
    // لو فيه data field بس → ترجع data مباشرة (backwards compatible)
    // لو فيه data + meta/filters → ترجع الـ object كامل
    const keys = Object.keys(rest);
    if (keys.length === 1 && keys[0] === "data") {
      return rest.data as T;
    }
    return rest as T;
  }

  return body as T;
}
