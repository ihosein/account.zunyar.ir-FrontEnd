"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ZunkoLogo } from "@/components/brand/ZunkoLogo";
import { InputOTP } from "@/components/ui/InputOTP";
import { useAuth } from "@/lib/auth";
import { t, tWithLtr } from "@/lib/i18n";
import { getOtpCooldownRemaining, startOtpCooldown } from "@/lib/otp-cooldown";
import { isProfileComplete, isValidNationalCode, PROFILE_PATH } from "@/lib/profile-gate";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";

const PRODUCT_LINKS = [
  {
    id: "zunyar",
    href: "https://zunyar.ir",
    nameKey: "auth.apps.zunyar",
    descKey: "auth.apps.zunyarDesc",
  },
  {
    id: "zunko",
    href: "https://zunko.ir",
    nameKey: "auth.apps.zunko",
    descKey: "auth.apps.zunkoDesc",
  },
] as const;

type Mode = "phone" | "national";
type Step =
  | "phone"
  | "registerNational"
  | "login"
  | "loginOtp"
  | "register"
  | "nationalCode"
  | "nationalLogin"
  | "nationalOtp"
  | "nationalReset";

function normalizePhoneInput(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("98") && digits.length >= 12) digits = `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) digits = `0${digits}`;
  return digits.slice(0, 11);
}

export default function LoginPage() {
  const {
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
  } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("phone");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submittingOtp = useRef(false);
  const lastTriedOtp = useRef("");

  const cooldownKey =
    step === "nationalOtp" || step === "nationalReset" ? `nc:${nationalCode}` : phone;

  useEffect(() => {
    const otpSteps: Step[] = ["register", "loginOtp", "nationalOtp", "nationalReset"];
    if (!otpSteps.includes(step)) {
      setCooldown(0);
      return;
    }
    setCooldown(getOtpCooldownRemaining(cooldownKey));
    const id = window.setInterval(() => {
      setCooldown(getOtpCooldownRemaining(cooldownKey));
    }, 500);
    return () => window.clearInterval(id);
  }, [step, cooldownKey]);

  function markOtpSent(key: string) {
    startOtpCooldown(key);
    setCooldown(getOtpCooldownRemaining(key));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStep(next === "phone" ? "phone" : "nationalCode");
    setPassword("");
    setNewPassword("");
    setOtp("");
    setDebugOtp("");
    setMaskedPhone("");
    lastTriedOtp.current = "";
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
      setNationalCode("");
      lastTriedOtp.current = "";
      if (res.exists) {
        setStep("login");
      } else {
        setStep("registerNational");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onRegisterNationalContinue(e: FormEvent) {
    e.preventDefault();
    if (!isValidNationalCode(nationalCode)) {
      toast.error(t("auth.nationalCodeInvalid"));
      return;
    }
    setBusy(true);
    try {
      if (getOtpCooldownRemaining(phone) <= 0) {
        const otpRes = await sendOtp(phone, nationalCode);
        setDebugOtp(otpRes.debugCode || "");
        setMaskedPhone(otpRes.maskedPhone || phone);
        markOtpSent(phone);
      }
      setOtp("");
      lastTriedOtp.current = "";
      setStep("register");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onNationalContinue(e: FormEvent) {
    e.preventDefault();
    if (!isValidNationalCode(nationalCode)) {
      toast.error(t("auth.nationalCodeInvalid"));
      return;
    }
    setBusy(true);
    try {
      const check = await checkNationalCode(nationalCode);
      setMaskedPhone(check.maskedPhone);
      setPassword("");
      setOtp("");
      setDebugOtp("");
      lastTriedOtp.current = "";
      setStep("nationalLogin");
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

  async function onNationalLogin(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      toast.error(t("auth.login.passwordRequired"));
      return;
    }
    setBusy(true);
    try {
      const u = await loginWithNationalCode(nationalCode, password);
      router.push(isProfileComplete(u) ? "/panel/apps" : PROFILE_PATH);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.login.error");
      toast.error(/رمز عبور/.test(msg) ? t("auth.national.badCredentials") : msg);
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
        setMaskedPhone(otpRes.maskedPhone || phone);
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

  async function startNationalOtp() {
    setBusy(true);
    try {
      const key = `nc:${nationalCode}`;
      if (getOtpCooldownRemaining(key) <= 0) {
        const otpRes = await sendOtpByNationalCode(nationalCode);
        setDebugOtp(otpRes.debugCode || "");
        setMaskedPhone(otpRes.maskedPhone || maskedPhone);
        markOtpSent(key);
      }
      setOtp("");
      lastTriedOtp.current = "";
      setStep("nationalOtp");
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
        await registerWithOtp(phone, nationalCode, code);
        router.push(PROFILE_PATH);
      } else if (step === "nationalOtp") {
        const u = await loginWithNationalCodeOtp(nationalCode, code);
        router.push(isProfileComplete(u) ? "/panel/apps" : PROFILE_PATH);
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
    const autoSteps: Step[] = ["register", "loginOtp", "nationalOtp"];
    if (!autoSteps.includes(step) || otp.length !== 5 || busy) return;
    if (lastTriedOtp.current === otp) return;
    lastTriedOtp.current = otp;
    void submitOtp(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, busy]);

  async function onResetPassword(e: FormEvent) {
    e.preventDefault();
    if (otp.length !== 5) {
      toast.error(t("auth.otpWrong"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("auth.passwordMin"));
      return;
    }
    setBusy(true);
    try {
      const u = await resetPasswordByNationalCode(nationalCode, otp, newPassword);
      router.push(isProfileComplete(u) ? "/panel/apps" : PROFILE_PATH);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    try {
      let otpRes;
      if (step === "loginOtp") {
        otpRes = await sendLoginOtp(phone);
        markOtpSent(phone);
      } else if (step === "nationalOtp" || step === "nationalReset") {
        otpRes = await sendOtpByNationalCode(nationalCode);
        markOtpSent(`nc:${nationalCode}`);
        setMaskedPhone(otpRes.maskedPhone || maskedPhone);
      } else {
        otpRes = await sendOtp(phone, nationalCode);
        markOtpSent(phone);
      }
      setDebugOtp(otpRes.debugCode || "");
      lastTriedOtp.current = "";
      setOtp("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === "nationalCode" ||
    step === "nationalLogin" ||
    step === "nationalOtp" ||
    step === "nationalReset"
      ? t("auth.national.title")
      : step === "phone" || step === "registerNational"
        ? t("auth.unified.title")
        : step === "login"
          ? t("auth.login.title")
          : step === "loginOtp"
            ? t("auth.loginWithOtp")
            : t("auth.register.title");

  const subtitle =
    step === "nationalOtp" || step === "nationalReset"
      ? tWithLtr("auth.national.otpHint", "phone", maskedPhone || "—")
      : step === "nationalLogin"
        ? t("auth.national.loginHint")
        : step === "nationalCode"
          ? t("auth.national.subtitle")
          : step === "registerNational"
            ? t("auth.national.registerHint")
            : step === "phone"
              ? t("auth.unified.subtitle")
              : step === "login"
                ? tWithLtr("auth.unified.loginHint", "phone", phone)
                : tWithLtr("auth.otpHint", "phone", maskedPhone || phone);

  const resendLabel =
    cooldown > 0 ? t("auth.otpResendWait", { seconds: cooldown }) : t("auth.otpResend");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex flex-col items-center pt-6 text-center">
          <BrandLogo variant="loader" height={100} priority className="mb-1.5" />
        </div>

        <h1 className="text-center text-2xl font-bold text-[var(--zy-ink)] md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--zy-muted)]">{subtitle}</p>

        <div className="mt-5 flex gap-2 rounded-xl border border-[var(--zy-border)] p-1">
          <button
            type="button"
            onClick={() => switchMode("phone")}
            className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "phone"
                ? "bg-accent-500 text-white"
                : "text-[var(--zy-ink)] hover:bg-accent-500/10"
            }`}
          >
            {t("auth.modePhone")}
          </button>
          <button
            type="button"
            onClick={() => switchMode("national")}
            className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "national"
                ? "bg-accent-500 text-white"
                : "text-[var(--zy-ink)] hover:bg-accent-500/10"
            }`}
          >
            {t("auth.modeNational")}
          </button>
        </div>

        {step === "phone" && (
          <form onSubmit={onPhoneContinue} noValidate className="glass-card-static mt-6 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <label className="field-label">
                <span className={fieldLabelClass(isBlank(phone))}>{t("auth.phone")}</span>
                <input
                  className={fieldInputClass(isBlank(phone))}
                  value={phone}
                  onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
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

        {step === "registerNational" && (
          <form
            onSubmit={onRegisterNationalContinue}
            noValidate
            className="glass-card-static mt-6 p-1"
          >
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-600"
              >
                <ArrowRight size={14} />
                {t("auth.unified.changePhone")}
              </button>
              <label className="field-label">
                <span className={fieldLabelClass(!isValidNationalCode(nationalCode))}>
                  {t("auth.nationalCode")}
                </span>
                <input
                  className={fieldInputClass(!isValidNationalCode(nationalCode))}
                  value={nationalCode}
                  onChange={(e) => setNationalCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={10}
                />
              </label>
              <button type="submit" disabled={busy} className={`${dialogPrimaryBtnClass} w-full`}>
                {busy ? t("common.loading") : t("auth.sendOtp")}
              </button>
            </div>
          </form>
        )}

        {step === "nationalCode" && (
          <form onSubmit={onNationalContinue} noValidate className="glass-card-static mt-6 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <label className="field-label">
                <span className={fieldLabelClass(!isValidNationalCode(nationalCode))}>
                  {t("auth.nationalCode")}
                </span>
                <input
                  className={fieldInputClass(!isValidNationalCode(nationalCode))}
                  value={nationalCode}
                  onChange={(e) => setNationalCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={10}
                />
              </label>
              <button type="submit" disabled={busy} className={`${dialogPrimaryBtnClass} w-full`}>
                {busy ? t("common.loading") : t("auth.unified.continue")}
              </button>
            </div>
          </form>
        )}

        {step === "nationalLogin" && (
          <form onSubmit={onNationalLogin} noValidate className="glass-card-static mt-6 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <button
                type="button"
                onClick={() => {
                  setStep("nationalCode");
                  setPassword("");
                }}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-600"
              >
                <ArrowRight size={14} />
                {t("auth.national.changeCode")}
              </button>
              <label className="field-label">
                <span className={fieldLabelClass(isBlank(password))}>{t("auth.login.password")}</span>
                <input
                  className={fieldInputClass(isBlank(password))}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <button type="submit" disabled={busy} className={`${dialogPrimaryBtnClass} w-full`}>
                {busy ? t("auth.login.submitting") : t("auth.login.submit")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startNationalOtp()}
                className="w-full cursor-pointer text-center text-sm font-medium text-accent-600"
              >
                {t("auth.national.forgotPassword")}
              </button>
            </div>
          </form>
        )}

        {step === "login" && (
          <form onSubmit={onLogin} noValidate className="glass-card-static mt-6 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setPassword("");
                }}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-600"
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
                  onChange={(e) => setPassword(e.target.value)}
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
                className="w-full cursor-pointer text-center text-sm font-medium text-accent-600"
              >
                {t("auth.loginWithOtp")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => switchMode("national")}
                className="w-full cursor-pointer text-center text-sm font-medium text-accent-600"
              >
                {t("auth.forgotViaNational")}
              </button>
            </div>
          </form>
        )}

        {(step === "register" || step === "loginOtp" || step === "nationalOtp") && (
          <div className="glass-card-static mt-6 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <button
                type="button"
                onClick={() => {
                  if (step === "loginOtp") setStep("login");
                  else if (step === "nationalOtp") setStep("nationalLogin");
                  else setStep("registerNational");
                  setOtp("");
                }}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-600"
              >
                <ArrowRight size={14} />
                {step === "loginOtp" || step === "nationalOtp"
                  ? t("auth.loginWithPassword")
                  : t("auth.unified.changePhone")}
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
                <p className="text-center text-xs text-accent-600" dir="ltr">
                  {t("auth.otpDebug", { code: debugOtp })}
                </p>
              )}

              <button
                type="button"
                disabled={busy || cooldown > 0}
                onClick={() => void resendOtp()}
                className="w-full cursor-pointer text-center text-sm font-medium text-accent-600 disabled:opacity-50"
              >
                {resendLabel}
              </button>

              {step === "nationalOtp" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setNewPassword("");
                    setStep("nationalReset");
                  }}
                  className="w-full cursor-pointer text-center text-sm font-medium text-accent-600"
                >
                  {t("auth.national.resetPassword")}
                </button>
              )}
            </div>
          </div>
        )}

        {step === "nationalReset" && (
          <form onSubmit={onResetPassword} noValidate className="glass-card-static mt-6 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-5">
              <button
                type="button"
                onClick={() => setStep("nationalOtp")}
                className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-accent-600"
              >
                <ArrowRight size={14} />
                {t("common.back")}
              </button>
              <InputOTP
                value={otp}
                onChange={setOtp}
                length={5}
                autoFocus
                disabled={busy}
                invalid={otp.length < 5}
              />
              <label className="field-label">
                <span className={fieldLabelClass(newPassword.length < 8)}>
                  {t("auth.national.newPassword")}
                </span>
                <input
                  className={fieldInputClass(newPassword.length < 8)}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" disabled={busy} className={`${dialogPrimaryBtnClass} w-full`}>
                {busy ? t("common.loading") : t("auth.national.submitReset")}
              </button>
              <button
                type="button"
                disabled={busy || cooldown > 0}
                onClick={() => void resendOtp()}
                className="w-full cursor-pointer text-center text-sm font-medium text-accent-600 disabled:opacity-50"
              >
                {resendLabel}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--zy-muted)]">
          <ShieldCheck size={14} className="text-accent-600 dark:text-accent-400" />
          {t("brand.tagline")}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          {PRODUCT_LINKS.map((app) => {
            const name = t(app.nameKey);
            const desc = t(app.descKey);
            return (
              <a
                key={app.id}
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`${name} — ${desc}`}
                aria-label={`${name}: ${desc}`}
                className="group inline-flex max-w-[9.5rem] cursor-pointer items-center gap-2 rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/70 px-2.5 py-2 text-start transition hover:border-accent-500/40 hover:bg-accent-500/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent-500/10 transition group-hover:bg-accent-500/20">
                  {app.id === "zunyar" ? (
                    <BrandLogo height={18} className="max-h-full max-w-full" />
                  ) : (
                    <ZunkoLogo height={30} className="max-h-[130%] max-w-[130%] scale-110" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-[var(--zy-ink)]">
                    {name}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] leading-snug text-[var(--zy-muted)]">
                    {desc}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
