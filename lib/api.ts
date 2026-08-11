import type { ApiResponse } from "@/types/account";
import { t } from "@/lib/i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const TOKEN_KEY = "zy_account_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let json: ApiResponse<T> | null = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(t("common.invalidServerResponse"));
  }

  if (!res.ok || !json?.success) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    throw new Error(json?.message || t("common.errorWithStatus", { status: res.status }));
  }

  return json.data;
}

/**
 * دریافت باینری احراز‌شده (مثلاً تصویر مدرک هویتی ادمین).
 * مسیر نسبت به base API است؛ مثل {@code /admin/identity/12/image}.
 */
export async function apiBlob(path: string): Promise<Blob> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { headers, cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    let message = t("common.errorWithStatus", { status: res.status });
    try {
      const json = (await res.json()) as ApiResponse<unknown>;
      if (json?.message) message = json.message;
    } catch {
      // binary/error without JSON
    }
    throw new Error(message);
  }
  return res.blob();
}
