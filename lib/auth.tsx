"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "@/lib/api";
import type { AuthResponse, User } from "@/types/account";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  registerWithOtp: (phone: string, otp: string) => Promise<void>;
  checkPhone: (phone: string) => Promise<{ exists: boolean; phone: string }>;
  sendOtp: (phone: string) => Promise<{ phone: string; debugCode?: string }>;
  sendLoginOtp: (phone: string) => Promise<{ phone: string; debugCode?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>("/auth/me");
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const checkPhone = useCallback(async (phone: string) => {
    return api<{ exists: boolean; phone: string }>("/auth/check-phone", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    return api<{ phone: string; debugCode?: string }>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }, []);

  const sendLoginOtp = useCallback(async (phone: string) => {
    return api<{ phone: string; debugCode?: string }>("/auth/send-login-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const data = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const loginWithOtp = useCallback(async (phone: string, otp: string) => {
    const data = await api<AuthResponse>("/auth/login-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const registerWithOtp = useCallback(async (phone: string, otp: string) => {
    const data = await api<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithOtp,
      registerWithOtp,
      checkPhone,
      sendOtp,
      sendLoginOtp,
      logout,
      refresh,
      updateUser,
    }),
    [
      user,
      loading,
      login,
      loginWithOtp,
      registerWithOtp,
      checkPhone,
      sendOtp,
      sendLoginOtp,
      logout,
      refresh,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
