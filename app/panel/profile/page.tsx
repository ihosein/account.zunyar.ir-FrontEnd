"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { InputOTP } from "@/components/ui/InputOTP";
import { PasswordFields, passwordFieldsValid } from "@/components/ui/PasswordFields";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { DateSelect } from "@/components/ui/date-range-select";
import { api, setToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { citiesOfProvince, IRAN_PROVINCE_OPTIONS } from "@/lib/iran-locations";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import { isProfileComplete, isValidNationalCode } from "@/lib/profile-gate";
import type { AuthResponse } from "@/types/account";

type FormState = {
  firstName: string;
  lastName: string;
  fatherName: string;
  nationalCode: string;
  gender: string;
  birthDate: string;
  province: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  avatar?: string;
  password: string;
  passwordConfirm: string;
};

const EMPTY: Omit<FormState, "password" | "passwordConfirm"> = {
  firstName: "",
  lastName: "",
  fatherName: "",
  nationalCode: "",
  gender: "",
  birthDate: "",
  province: "",
  city: "",
  address: "",
  phone: "",
  email: "",
  avatar: undefined,
};

type ContactKind = "phone" | "email";

function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("98") && digits.length >= 12) digits = `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) digits = `0${digits}`;
  return digits.slice(0, 11);
}

export default function ProfilePage() {
  const { user, refresh, updateUser } = useAuth();
  const [form, setForm] = useState<FormState>({ ...EMPTY, password: "", passwordConfirm: "" });
  const [baseline, setBaseline] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const [contactKind, setContactKind] = useState<ContactKind | null>(null);
  const [contactValue, setContactValue] = useState("");
  const [contactOtp, setContactOtp] = useState("");
  const [contactStep, setContactStep] = useState<"edit" | "otp">("edit");
  const [contactDebug, setContactDebug] = useState("");
  const [contactBusy, setContactBusy] = useState(false);

  const needsPassword = user?.passwordSet === false;

  useEffect(() => {
    if (!user) return;
    const next = {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      fatherName: user.fatherName || "",
      nationalCode: user.nationalCode || "",
      gender: user.gender === "male" ? "MALE" : user.gender === "female" ? "FEMALE" : user.gender || "",
      birthDate: user.birthDate || "",
      province: user.province || "",
      city: user.city || "",
      address: user.address || "",
      phone: user.phone || "",
      email: user.email || "",
      avatar: user.avatar || undefined,
    };
    setForm({ ...next, password: "", passwordConfirm: "" });
    setBaseline(next);
  }, [user]);

  const cityOptions = useMemo(() => citiesOfProvince(form.province), [form.province]);
  const passwordTouched = form.password.length > 0 || form.passwordConfirm.length > 0;

  const dirty = useMemo(() => {
    return (
      form.firstName !== baseline.firstName ||
      form.lastName !== baseline.lastName ||
      form.fatherName !== baseline.fatherName ||
      form.nationalCode !== baseline.nationalCode ||
      form.gender !== baseline.gender ||
      form.birthDate !== baseline.birthDate ||
      form.province !== baseline.province ||
      form.city !== baseline.city ||
      form.address !== baseline.address ||
      (form.avatar || "") !== (baseline.avatar || "")
    );
  }, [baseline, form]);

  const nationalCode = form.nationalCode.trim();
  const nationalCodeLengthError = nationalCode.length > 0 && !isValidNationalCode(nationalCode);
  const namesOk =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.fatherName.trim().length > 0 &&
    isValidNationalCode(nationalCode) &&
    form.gender.trim().length > 0;
  const passwordOk = passwordFieldsValid(form.password, form.passwordConfirm, needsPassword);

  /** Red borders only while profile is still incomplete (first-time gate). */
  const showRequiredRed = !isProfileComplete(user);
  const firstNameInvalid = showRequiredRed && isBlank(form.firstName);
  const lastNameInvalid = showRequiredRed && isBlank(form.lastName);
  const fatherNameInvalid = showRequiredRed && isBlank(form.fatherName);
  const nationalCodeInvalid =
    (showRequiredRed && isBlank(form.nationalCode)) || nationalCodeLengthError;
  const genderInvalid = showRequiredRed && isBlank(form.gender);

  const canSave = useMemo(() => {
    if (busy || !namesOk || !passwordOk) return false;
    if (needsPassword) return true;
    return dirty || passwordTouched;
  }, [busy, namesOk, passwordOk, needsPassword, dirty, passwordTouched]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "province" && value !== prev.province) next.city = "";
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
      const body: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fatherName: form.fatherName.trim(),
        nationalCode: form.nationalCode.trim(),
        fullName,
        gender: form.gender,
        birthDate: form.birthDate || undefined,
        province: form.province || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
      };
      if ((form.avatar || "") !== (baseline.avatar || "")) {
        body.avatar = form.avatar || "";
      }
      if (needsPassword || (passwordTouched && form.password.trim())) {
        body.password = form.password;
      }

      const updated = await api<AuthResponse>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (updated.token) setToken(updated.token);
      const u = updated.user;
      updateUser({
        firstName: u?.firstName ?? form.firstName,
        lastName: u?.lastName ?? form.lastName,
        fatherName: u?.fatherName ?? form.fatherName,
        nationalCode: u?.nationalCode ?? form.nationalCode,
        fullName: u?.fullName ?? fullName,
        email: u?.email ?? form.email,
        phone: u?.phone ?? form.phone,
        gender: u?.gender ?? form.gender,
        birthDate: u?.birthDate ?? form.birthDate,
        province: u?.province ?? form.province,
        city: u?.city ?? form.city,
        address: u?.address ?? form.address,
        avatar: u?.avatar ?? form.avatar,
        passwordSet: u?.passwordSet ?? true,
      });
      await refresh().catch(() => undefined);
      setForm((prev) => ({ ...prev, password: "", passwordConfirm: "" }));
      toast.success(t("panel.settingsSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function openContact(kind: ContactKind) {
    setContactKind(kind);
    setContactValue(kind === "phone" ? form.phone : form.email);
    setContactOtp("");
    setContactStep("edit");
    setContactDebug("");
  }

  function closeContact() {
    setContactKind(null);
    setContactBusy(false);
  }

  async function requestContactOtp() {
    if (!contactKind) return;
    setContactBusy(true);
    try {
      if (contactKind === "phone") {
        const phone = normalizePhone(contactValue);
        if (!/^09\d{9}$/.test(phone)) {
          toast.error(t("auth.phoneInvalid"));
          return;
        }
        const res = await api<{ phone: string; debugCode?: string }>("/verification/phone/request", {
          method: "POST",
          body: JSON.stringify({ phone }),
        });
        setContactValue(res.phone || phone);
        setContactDebug(res.debugCode || "");
      } else {
        const email = contactValue.trim();
        if (!email || !email.includes("@")) {
          toast.error(t("panel.emailInvalid"));
          return;
        }
        const res = await api<{ email?: string; debugCode?: string }>("/verification/email/request", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setContactDebug(res.debugCode || "");
      }
      setContactOtp("");
      setContactStep("otp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setContactBusy(false);
    }
  }

  async function confirmContactOtp(code?: string) {
    if (!contactKind) return;
    const otp = (code ?? contactOtp).trim();
    if (otp.length !== 5) return;
    setContactBusy(true);
    try {
      if (contactKind === "phone") {
        const data = await api<AuthResponse>("/verification/phone/confirm", {
          method: "POST",
          body: JSON.stringify({ phone: contactValue, otp }),
        });
        if (data.token) setToken(data.token);
        updateUser({ phone: data.user?.phone || contactValue, phoneVerified: true });
        setForm((prev) => ({ ...prev, phone: data.user?.phone || contactValue }));
        setBaseline((prev) => ({ ...prev, phone: data.user?.phone || contactValue }));
      } else {
        await api("/verification/email/confirm", {
          method: "POST",
          body: JSON.stringify({ email: contactValue.trim(), otp }),
        });
        updateUser({ email: contactValue.trim(), emailVerified: true });
        setForm((prev) => ({ ...prev, email: contactValue.trim() }));
        setBaseline((prev) => ({ ...prev, email: contactValue.trim() }));
      }
      await refresh().catch(() => undefined);
      toast.success(t("panel.contactUpdated"));
      closeContact();
    } catch {
      toast.error(t("auth.otpWrong"));
      setContactOtp("");
    } finally {
      setContactBusy(false);
    }
  }

  useEffect(() => {
    if (contactStep === "otp" && contactOtp.length === 5 && !contactBusy) {
      void confirmContactOtp(contactOtp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactOtp, contactStep]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.personalInfo")}</h1>
      <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.personalHint")}</p>

      {showRequiredRed ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3.5 text-sm text-red-800 dark:text-red-200"
        >
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400"
            aria-hidden
          />
          <p className="leading-relaxed">{t("panel.profileIncompleteAlert")}</p>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate className="mt-6 space-y-6">
        <section className="glass-card-static p-1">
          <div className="glass-inner !m-2 space-y-5 !p-5">
            <h2 className="font-bold text-[var(--zy-ink)]">{t("panel.sectionPersonal")}</h2>

            {/* Desktop RTL: names on the right, photo on the left. Mobile: photo first. */}
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
              <ProfileAvatar
                className="order-1 mx-auto lg:order-2 lg:mx-0 lg:w-44 lg:shrink-0"
                value={form.avatar}
                onChange={(avatar) => setForm((prev) => ({ ...prev, avatar }))}
              />

              <div className="order-2 grid flex-1 gap-3 sm:grid-cols-2 lg:order-1">
                <label className="text-sm">
                  <span className={fieldLabelClass(firstNameInvalid)}>{t("panel.firstName")}</span>
                  <input
                    className={fieldInputClass(firstNameInvalid)}
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass(lastNameInvalid)}>{t("panel.lastName")}</span>
                  <input
                    className={fieldInputClass(lastNameInvalid)}
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass(fatherNameInvalid)}>{t("panel.fatherName")}</span>
                  <input
                    className={fieldInputClass(fatherNameInvalid)}
                    value={form.fatherName}
                    onChange={(e) => set("fatherName", e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass(nationalCodeInvalid)}>
                    {t("panel.nationalCode")}
                  </span>
                  <input
                    className={fieldInputClass(nationalCodeInvalid)}
                    value={form.nationalCode}
                    onChange={(e) =>
                      set("nationalCode", e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    inputMode="numeric"
                    dir="ltr"
                    maxLength={10}
                    autoComplete="off"
                  />
                  {nationalCodeLengthError ? (
                    <p className="mt-1 text-xs text-red-600">{t("panel.nationalCodeLength")}</p>
                  ) : null}
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass(genderInvalid)}>{t("panel.gender")}</span>
                  <GlassSelect
                    value={form.gender}
                    onChange={(gender) => set("gender", gender)}
                    placeholder={t("panel.genderSelect")}
                    invalid={genderInvalid}
                    options={[
                      { value: "MALE", label: t("panel.genderMale") },
                      { value: "FEMALE", label: t("panel.genderFemale") },
                    ]}
                  />
                </label>
                <DateSelect
                  label={t("panel.birthDate")}
                  value={form.birthDate}
                  onChange={(birthDate) => set("birthDate", birthDate)}
                  placeholder={t("panel.birthDate")}
                  maxDate={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <div className="grid items-end gap-3 border-t border-[var(--zy-border)] pt-5 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-[var(--zy-muted)]">
                  {t("panel.province")}{" "}
                  <span className="text-xs opacity-70">({t("common.optional")})</span>
                </span>
                <GlassSelect
                  value={form.province}
                  onChange={(province) => set("province", province)}
                  placeholder={t("panel.provinceSelect")}
                  options={IRAN_PROVINCE_OPTIONS}
                  searchable
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--zy-muted)]">
                  {t("panel.city")}{" "}
                  <span className="text-xs opacity-70">({t("common.optional")})</span>
                </span>
                <GlassSelect
                  value={form.city}
                  onChange={(city) => set("city", city)}
                  placeholder={t("panel.citySelect")}
                  options={cityOptions}
                  disabled={!form.province}
                  searchable
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-[var(--zy-muted)]">{t("panel.address")}</span>
                <textarea
                  className={fieldInputClass(false, "min-h-20")}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="glass-card-static p-1">
          <div className="glass-inner !m-2 space-y-4 !p-5">
            <h2 className="font-bold text-[var(--zy-ink)]">{t("panel.sectionAccount")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="text-sm">
                <span className="text-[var(--zy-muted)]">{t("panel.phone")}</span>
                <div className="mt-1 flex gap-2">
                  <input className={fieldInputClass(false, "flex-1 !mt-0")} value={form.phone} readOnly dir="ltr" />
                  <button
                    type="button"
                    onClick={() => openContact("phone")}
                    className="shrink-0 rounded-xl border border-accent-500/40 px-3 text-sm font-medium text-accent-700 hover:bg-accent-500/10 dark:text-accent-300"
                  >
                    {t("panel.change")}
                  </button>
                </div>
              </div>
              <div className="text-sm">
                <span className="text-[var(--zy-muted)]">{t("panel.email")}</span>
                <div className="mt-1 flex gap-2">
                  <input
                    className={fieldInputClass(false, "flex-1 !mt-0")}
                    value={form.email}
                    readOnly
                    dir="ltr"
                    placeholder={t("panel.emailEmpty")}
                  />
                  <button
                    type="button"
                    onClick={() => openContact("email")}
                    className="shrink-0 rounded-xl border border-accent-500/40 px-3 text-sm font-medium text-accent-700 hover:bg-accent-500/10 dark:text-accent-300"
                  >
                    {t("panel.change")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card-static p-1">
          <div className="glass-inner !m-2 space-y-4 !p-5">
            <h2 className="font-bold text-[var(--zy-ink)]">{t("panel.sectionPassword")}</h2>
            <PasswordFields
              password={form.password}
              confirm={form.passwordConfirm}
              onPasswordChange={(v) => set("password", v)}
              onConfirmChange={(v) => set("passwordConfirm", v)}
              required={needsPassword}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSave}
            className="cursor-pointer rounded-xl bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>

      <GlassDialog
        open={!!contactKind}
        onClose={closeContact}
        title={
          contactKind === "phone"
            ? t("panel.changePhoneTitle")
            : t("panel.changeEmailTitle")
        }
      >
        {contactStep === "edit" ? (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className={fieldLabelClass(isBlank(contactValue))}>
                {contactKind === "phone" ? t("panel.phone") : t("panel.email")}
              </span>
              <input
                className={fieldInputClass(isBlank(contactValue))}
                value={contactValue}
                onChange={(e) =>
                  setContactValue(
                    contactKind === "phone" ? normalizePhone(e.target.value) : e.target.value,
                  )
                }
                dir="ltr"
                inputMode={contactKind === "phone" ? "numeric" : "email"}
              />
            </label>
            <button
              type="button"
              disabled={contactBusy}
              onClick={() => void requestContactOtp()}
              className={`${dialogPrimaryBtnClass} w-full`}
            >
              {contactBusy ? t("common.loading") : t("panel.sendVerifyCode")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--zy-muted)]" dir="rtl">
              {t("auth.otpHint", { phone: contactValue })}
            </p>
            <InputOTP
              value={contactOtp}
              onChange={setContactOtp}
              length={5}
              autoFocus
              disabled={contactBusy}
              invalid={contactOtp.length < 5}
            />
            {contactDebug && (
              <p className="text-center text-xs text-accent-600" dir="ltr">
                {t("auth.otpDebug", { code: contactDebug })}
              </p>
            )}
            <button
              type="button"
              className="w-full text-sm text-accent-600 hover:underline"
              onClick={() => setContactStep("edit")}
            >
              {t("common.back")}
            </button>
          </div>
        )}
      </GlassDialog>
    </div>
  );
}
