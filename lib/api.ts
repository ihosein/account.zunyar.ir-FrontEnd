import type { ApiResponse } from "@/types/account";
import { t } from "@/lib/i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const TOKEN_KEY = "zy_account_token";

/**
 * On localhost (cross-origin FE:3000 → API:8000) HttpOnly cookies often cannot
 * be shared over HTTP, so we keep a Bearer fallback in localStorage.
 * In production we rely on the HttpOnly cookie + credentials:include only.
 */
function useBearerFallback(): boolean {
  if (process.env.NEXT_PUBLIC_AUTH_BEARER_FALLBACK === "true") return true;
  if (process.env.NEXT_PUBLIC_AUTH_BEARER_FALLBACK === "false") return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  if (!useBearerFallback()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!useBearerFallback()) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Clear any legacy local token (always safe). */
export function clearLocalToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
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
    credentials: "include",
  });

  let json: ApiResponse<T> | null = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(t("common.invalidServerResponse"));
  }

  if (!res.ok || !json?.success) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearLocalToken();
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
  const res = await fetch(`${API_URL}${path}`, {
    headers,
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearLocalToken();
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
