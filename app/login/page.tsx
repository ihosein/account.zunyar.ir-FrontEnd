"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { InputOTP } from "@/components/ui/InputOTP";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getOtpCooldownRemaining, startOtpCooldown } from "@/lib/otp-cooldown";
import { isProfileComplete, PROFILE_PATH } from "@/lib/profile-gate";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";

type Step = "phone" | "login" | "loginOtp" | "register";

function normalizePhoneInput(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("98") && digits.length >= 12) digits = `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) digits = `0${digits}`;
  return digits.slice(0, 11);
}

export default function LoginPage() {
  const { login, loginWithOtp, registerWithOtp, checkPhone, sendOtp, sendLoginOtp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submittingOtp = useRef(false);
  const lastTriedOtp = useRef("");

  useEffect(() => {
    if (step !== "register" && step !== "loginOtp") {
      setCooldown(0);
      return;
    }
    setCooldown(getOtpCooldownRemaining(phone));
    const id = window.setInterval(() => {
      setCooldown(getOtpCooldownRemaining(phone));
    }, 500);
    return () => window.clearInterval(id);
  }, [step, phone]);

  function markOtpSent(p: string) {
    startOtpCooldown(p);
    setCooldown(getOtpCooldownRemaining(p));
  }

  async function onPhoneContinue(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizePhoneInput(phone);
    if (!normalized) {
      toast.error(t("auth.phoneRequired"));
      return;
    }
    if (!/^09\d{9}$/.test(normalized)) {
      toast.error(t("auth.phoneInvalid"));
      return;
    }
    setBusy(true);
    try {
      const res = await checkPhone(normalized);
      setPhone(res.phone || normalized);
      setPassword("");
      setOtp("");
      setDebugOtp("");
      lastTriedOtp.current = "";
      if (res.exists) {
        setStep("login");
      } else {
        const p = res.phone || normalized;
        if (getOtpCooldownRemaining(p) <= 0) {
          const otpRes = await sendOtp(p);
          setDebugOtp(otpRes.debugCode || "");
          markOtpSent(p);
        }
        setStep("register");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      toast.error(t("auth.login.passwordRequired"));
      return;
    }
    setBusy(true);
    try {
      const u = await login(phone, password);
      router.push(isProfileComplete(u) ? "/panel/apps" : PROFILE_PATH);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.login.error");
      toast.error(/ایمیل/.test(msg) ? t("auth.login.badCredentials") : msg);
    } finally {
      setBusy(false);
    }
  }

  async function startLoginOtp() {
    setBusy(true);
    try {
      if (getOtpCooldownRemaining(phone) <= 0) {
        const otpRes = await sendLoginOtp(phone);
        setDebugOtp(otpRes.debugCode || "");
        markOtpSent(phone);
      }
      setOtp("");
      lastTriedOtp.current = "";
      setStep("loginOtp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(code: string) {
    if (submittingOtp.current || code.length !== 5) return;
    submittingOtp.current = true;
    setBusy(true);
    try {
      if (step === "register") {
        await registerWithOtp(phone, code);
        router.push(PROFILE_PATH);
      } else {
        const u = await loginWithOtp(phone, code);
        router.push(isProfileComplete(u) ? "/panel/apps" : PROFILE_PATH);
      }
    } catch {
      toast.error(t("auth.otpWrong"));
      lastTriedOtp.current = "";
      setOtp("");
    } finally {
      setBusy(false);
      submittingOtp.current = false;
    }
  }

  useEffect(() => {
    if ((step !== "register" && step !== "loginOtp") || otp.length !== 5 || busy) return;
    if (lastTriedOtp.current === otp) return;
    lastTriedOtp.current = otp;
    void submitOtp(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, busy]);

  async function resendOtp() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    try {
      const otpRes = step === "loginOtp" ? await sendLoginOtp(phone) : await sendOtp(phone);
      setDebugOtp(otpRes.debugCode || "");
      lastTriedOtp.current = "";
      setOtp("");
      markOtpSent(phone);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === "phone"
      ? t("auth.unified.title")
      : step === "login"
        ? t("auth.login.title")
        : step === "loginOtp"
          ? t("auth.loginWithOtp")
          : t("auth.register.title");

  const subtitle =
    step === "phone"
      ? t("auth.unified.subtitle")
      : step === "login"
        ? t("auth.unified.loginHint", { phone })
        : t("auth.otpHint", { phone });

  const resendLabel =
    cooldown > 0 ? t("auth.otpResendWait", { seconds: cooldown }) : t("auth.otpResend");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo height={48} priority className="mb-3" />
          <p className="text-sm font-bold text-[var(--zy-ink)]" dir="ltr">
            {t("brand.nameEn")}
          </p>
        </div>

        <h1 className="text-center text-2xl font-bold text-[var(--zy-ink)] md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--zy-muted)]">{subtitle}</p>

        {step === "phone" && (
          <form onSubmit={onPhoneContinue} noValidate className="glass-card-static mt-8 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <label className="field-label">
                <span className={fieldLabelClass(isBlank(phone))}>{t("auth.phone")}</span>
                <input
                  className={fieldInputClass(isBlank(phone))}
                  value={phone}
                  onChange={(e) => {
                    setPhone(normalizePhoneInput(e.target.value));
                  }}
                  placeholder="09xxxxxxxxx"
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete="tel"
                />
              </label>
              <button type="submit" disabled={busy} className={`${dialogPrimaryBtnClass} w-full`}>
                {busy ? t("common.loading") : t("auth.unified.continue")}
              </button>
            </div>
          </form>
        )}

        {step === "login" && (
          <form onSubmit={onLogin} noValidate className="glass-card-static mt-8 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setPassword("");
                }}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400"
              >
                <ArrowRight size={14} />
                {t("auth.unified.changePhone")}
              </button>
              <label className="field-label">
                <span className={fieldLabelClass(isBlank(password))}>{t("auth.login.password")}</span>
                <input
                  className={fieldInputClass(isBlank(password))}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  autoComplete="current-password"
                />
              </label>
              <button type="submit" disabled={busy} className={`${dialogPrimaryBtnClass} w-full`}>
                {busy ? t("auth.login.submitting") : t("auth.login.submit")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startLoginOtp()}
                className="w-full cursor-pointer text-center text-sm font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400"
              >
                {t("auth.loginWithOtp")}
              </button>
            </div>
          </form>
        )}

        {(step === "register" || step === "loginOtp") && (
          <div className="glass-card-static mt-8 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <button
                type="button"
                onClick={() => {
                  setStep(step === "loginOtp" ? "login" : "phone");
                  setOtp("");
                }}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400"
              >
                <ArrowRight size={14} />
                {step === "loginOtp" ? t("auth.loginWithPassword") : t("auth.unified.changePhone")}
              </button>

              <InputOTP
                value={otp}
                onChange={setOtp}
                length={5}
                autoFocus
                disabled={busy}
                invalid={otp.length < 5}
              />

              {debugOtp && (
                <p className="text-center text-xs text-accent-600 dark:text-accent-400" dir="ltr">
                  {t("auth.otpDebug", { code: debugOtp })}
                </p>
              )}

              <button
                type="button"
                disabled={busy || cooldown > 0}
                onClick={() => void resendOtp()}
                className="w-full cursor-pointer text-center text-sm font-medium text-accent-600 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-accent-400"
              >
                {resendLabel}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--zy-muted)]">
          <ShieldCheck size={14} className="text-accent-600 dark:text-accent-400" />
          {t("brand.tagline")}
        </p>
      </div>
    </div>
  );
}
