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

type OtpSendResult = {
  phone: string;
  maskedPhone?: string;
  debugCode?: string;
};

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  loginWithNationalCode: (nationalCode: string, password: string) => Promise<User>;
  loginWithOtp: (phone: string, otp: string) => Promise<User>;
  registerWithOtp: (phone: string, nationalCode: string, otp: string) => Promise<User>;
  checkPhone: (phone: string) => Promise<{ exists: boolean; phone: string }>;
  checkNationalCode: (
    nationalCode: string,
  ) => Promise<{ exists: boolean; nationalCode: string; maskedPhone: string }>;
  sendOtp: (phone: string, nationalCode: string) => Promise<OtpSendResult>;
  sendLoginOtp: (phone: string) => Promise<OtpSendResult>;
  sendOtpByNationalCode: (nationalCode: string) => Promise<OtpSendResult>;
  loginWithNationalCodeOtp: (nationalCode: string, otp: string) => Promise<User>;
  resetPasswordByNationalCode: (
    nationalCode: string,
    otp: string,
    newPassword: string,
  ) => Promise<User>;
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

  const applyAuth = useCallback((data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const checkPhone = useCallback(async (phone: string) => {
    return api<{ exists: boolean; phone: string }>("/auth/check-phone", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }, []);

  const checkNationalCode = useCallback(async (nationalCode: string) => {
    return api<{ exists: boolean; nationalCode: string; maskedPhone: string }>(
      "/auth/check-national-code",
      {
        method: "POST",
        body: JSON.stringify({ nationalCode }),
      },
    );
  }, []);

  const sendOtp = useCallback(async (phone: string, nationalCode: string) => {
    return api<OtpSendResult>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone, nationalCode }),
    });
  }, []);

  const sendLoginOtp = useCallback(async (phone: string) => {
    return api<OtpSendResult>("/auth/send-login-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }, []);

  const sendOtpByNationalCode = useCallback(async (nationalCode: string) => {
    return api<OtpSendResult>("/auth/send-otp-by-national-code", {
      method: "POST",
      body: JSON.stringify({ nationalCode }),
    });
  }, []);

  const login = useCallback(
    async (phone: string, password: string) => {
      const data = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });
      return applyAuth(data);
    },
    [applyAuth],
  );

  const loginWithNationalCode = useCallback(
    async (nationalCode: string, password: string) => {
      const data = await api<AuthResponse>("/auth/login-national-code", {
        method: "POST",
        body: JSON.stringify({ nationalCode, password }),
      });
      return applyAuth(data);
    },
    [applyAuth],
  );

  const loginWithOtp = useCallback(
    async (phone: string, otp: string) => {
      const data = await api<AuthResponse>("/auth/login-otp", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      });
      return applyAuth(data);
    },
    [applyAuth],
  );

  const loginWithNationalCodeOtp = useCallback(
    async (nationalCode: string, otp: string) => {
      const data = await api<AuthResponse>("/auth/login-national-code-otp", {
        method: "POST",
        body: JSON.stringify({ nationalCode, otp }),
      });
      return applyAuth(data);
    },
    [applyAuth],
  );

  const resetPasswordByNationalCode = useCallback(
    async (nationalCode: string, otp: string, newPassword: string) => {
      const data = await api<AuthResponse>("/auth/reset-password-by-national-code", {
        method: "POST",
        body: JSON.stringify({ nationalCode, otp, newPassword }),
      });
      return applyAuth(data);
    },
    [applyAuth],
  );

  const registerWithOtp = useCallback(
    async (phone: string, nationalCode: string, otp: string) => {
      const data = await api<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ phone, nationalCode, otp }),
      });
      return applyAuth(data);
    },
    [applyAuth],
  );

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
      loginWithNationalCode,
      loginWithOtp,
      registerWithOtp,
      checkPhone,
      checkNationalCode,
      sendOtp,
      sendLoginOtp,
      sendOtpByNationalCode,
      loginWithNationalCodeOtp,
      resetPasswordByNationalCode,
      logout,
      refresh,
      updateUser,
    }),
    [
      user,
      loading,
      login,
      loginWithNationalCode,
      loginWithOtp,
      registerWithOtp,
      checkPhone,
      checkNationalCode,
      sendOtp,
      sendLoginOtp,
      sendOtpByNationalCode,
      loginWithNationalCodeOtp,
      resetPasswordByNationalCode,
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
