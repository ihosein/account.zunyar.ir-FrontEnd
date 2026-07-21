import type { ApiResponse } from "@/types/account";
import { t } from "@/lib/i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090/api";
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
    throw new Error(json?.message || t("common.errorWithStatus", { status: res.status }));
  }

  return json.data;
}
