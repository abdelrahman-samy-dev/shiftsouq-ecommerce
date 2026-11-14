/* ══════════════════════════════════════════════════════════════
   ProfileForm — Client Component
   ──────────────────────────────────────────────────────────────
   Premium profile management form with:
   - Personal information editing (name, phone, country, city)
   - Password change section
   - Real-time feedback with toast-style status messages
   Validation uses the shared zod schemas, so messages follow
   the active language (the server checks again).
   ══════════════════════════════════════════════════════════════ */

"use client";

import { useMemo, useState, useTransition } from "react";
import {
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  Globe,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { updateProfile, changePassword } from "@/lib/actions/profile";
import { createPasswordChangeSchema, createProfileSchema } from "@/lib/validations/profile";

/* ── Types ───────────────────────────────────────────────────── */

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
}

interface Props {
  dict: Dictionary;
  profile: ProfileData;
  /** Kept for callers; the dictionary already carries the language. */
  locale?: Locale;
}

type FieldErrors = Record<string, string | undefined>;

/** First message per field from a zod error. */
function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ── Component ───────────────────────────────────────────────── */

export default function ProfileForm({ dict, profile }: Props) {
  const pd = dict.profile;

  /* Form state */
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [country, setCountry] = useState(profile.country || "");
  const [city, setCity] = useState(profile.city || "");

  /* Password state */
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  /* Feedback state */
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});

  const [isPendingProfile, startProfileTransition] = useTransition();
  const [isPendingPassword, startPasswordTransition] = useTransition();

  /* Validation messages follow the active language */
  const profileSchema = useMemo(() => createProfileSchema(dict.validation), [dict.validation]);
  const passwordSchema = useMemo(() => createPasswordChangeSchema(dict.validation), [dict.validation]);

  /* ── Handle Profile Update ─────────────────────────────────── */

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);

    const values = { full_name: fullName, phone, country, city };
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      setProfileErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setProfileErrors({});

    startProfileTransition(async () => {
      const result = await updateProfile(values);

      setProfileMsg({ type: result.success ? "success" : "error", text: result.message });
      if (!result.success && result.field) {
        setProfileErrors({ [result.field]: result.message });
      }

      // Auto-clear success messages
      if (result.success) {
        setTimeout(() => setProfileMsg(null), 4000);
      }
    });
  }

  /* ── Handle Password Change ────────────────────────────────── */

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    const parsed = passwordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      setPasswordErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setPasswordErrors({});

    startPasswordTransition(async () => {
      const result = await changePassword(newPassword, confirmPassword);

      setPasswordMsg({ type: result.success ? "success" : "error", text: result.message });
      if (!result.success && result.field) {
        setPasswordErrors({ [result.field]: result.message });
      }

      if (result.success) {
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordMsg(null), 4000);
      }
    });
  }

  /** aria wiring + message under a field */
  const describe = (errors: FieldErrors, field: string, id: string) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${id}-error` : undefined,
  });
  const fieldError = (errors: FieldErrors, field: string, id: string) =>
    errors[field] ? (
      <p id={`${id}-error`} className="text-xs font-medium mt-1.5 text-destructive" role="alert">
        {errors[field]}
      </p>
    ) : null;

  const labelStyle = { color: "var(--text-secondary)" };

  return (
    <div className="min-h-[70vh] mx-auto max-w-3xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--surface-elevated)" }}
          >
            <User size={20} style={{ color: "var(--text-primary)" }} />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {pd.title}
          </h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {pd.subtitle}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* ══════════════════════════════════════════════════════
           Section 1: Personal Information
           ══════════════════════════════════════════════════════ */}
        <form onSubmit={handleProfileSubmit} noValidate className="card-elevated p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <User size={18} style={{ color: "var(--accent)" }} />
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                {pd.personalInfo}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {pd.personalInfoDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Email (read-only) */}
            <div className="sm:col-span-2">
              <label htmlFor="profile-email" className="block text-sm font-medium mb-2" style={labelStyle}>
                <Mail size={14} className="inline me-1.5 -mt-0.5" />
                {pd.email}
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                disabled
                dir="ltr"
                className="input-field opacity-60 cursor-not-allowed"
                aria-describedby="profile-email-note"
              />
              <p id="profile-email-note" className="text-xs mt-1.5" style={{ color: "var(--text-faint)" }}>
                {pd.emailNote}
              </p>
            </div>

            {/* Full Name */}
            <div className="sm:col-span-2">
              <label htmlFor="profile-fullname" className="block text-sm font-medium mb-2" style={labelStyle}>
                <User size={14} className="inline me-1.5 -mt-0.5" />
                {pd.fullName}
              </label>
              <input
                id="profile-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                autoComplete="name"
                placeholder={pd.fullNamePlaceholder}
                {...describe(profileErrors, "full_name", "profile-fullname")}
              />
              {fieldError(profileErrors, "full_name", "profile-fullname")}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="profile-phone" className="block text-sm font-medium mb-2" style={labelStyle}>
                <Phone size={14} className="inline me-1.5 -mt-0.5" />
                {pd.phone}
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                autoComplete="tel"
                placeholder="+20 1xx xxx xxxx"
                dir="ltr"
                {...describe(profileErrors, "phone", "profile-phone")}
              />
              {fieldError(profileErrors, "phone", "profile-phone")}
            </div>

            {/* Country */}
            <div>
              <label htmlFor="profile-country" className="block text-sm font-medium mb-2" style={labelStyle}>
                <Globe size={14} className="inline me-1.5 -mt-0.5" />
                {pd.country}
              </label>
              <input
                id="profile-country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input-field"
                autoComplete="country-name"
                placeholder={pd.countryPlaceholder}
                {...describe(profileErrors, "country", "profile-country")}
              />
              {fieldError(profileErrors, "country", "profile-country")}
            </div>

            {/* City */}
            <div className="sm:col-span-2">
              <label htmlFor="profile-city" className="block text-sm font-medium mb-2" style={labelStyle}>
                <MapPin size={14} className="inline me-1.5 -mt-0.5" />
                {pd.city}
              </label>
              <input
                id="profile-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-field"
                autoComplete="address-level2"
                placeholder={pd.cityPlaceholder}
                {...describe(profileErrors, "city", "profile-city")}
              />
              {fieldError(profileErrors, "city", "profile-city")}
            </div>
          </div>

          {/* Feedback */}
          {profileMsg && <FeedbackMessage type={profileMsg.type} text={profileMsg.text} />}

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isPendingProfile}
              aria-busy={isPendingProfile}
              className="btn-primary px-6"
            >
              {isPendingProfile ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              {pd.updateProfile}
            </button>
          </div>
        </form>

        {/* ══════════════════════════════════════════════════════
           Section 2: Change Password (anchor for "Settings" links)
           ══════════════════════════════════════════════════════ */}
        <form
          id="password"
          onSubmit={handlePasswordSubmit}
          noValidate
          className="card-elevated p-6 sm:p-8 scroll-mt-28"
        >
          <div className="flex items-center gap-3 mb-6">
            <Lock size={18} style={{ color: "var(--accent)" }} />
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                {pd.changePassword}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {pd.changePasswordDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* New Password */}
            <div>
              <label htmlFor="profile-new-password" className="block text-sm font-medium mb-2" style={labelStyle}>
                {pd.newPassword}
              </label>
              <div className="relative">
                <input
                  id="profile-new-password"
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pe-10"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...describe(passwordErrors, "newPassword", "profile-new-password")}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors"
                  style={{ color: "var(--text-faint)" }}
                  aria-label={showNewPwd ? dict.auth.hidePassword : dict.auth.showPassword}
                  aria-pressed={showNewPwd}
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldError(passwordErrors, "newPassword", "profile-new-password")}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="profile-confirm-password" className="block text-sm font-medium mb-2" style={labelStyle}>
                {pd.confirmNewPassword}
              </label>
              <div className="relative">
                <input
                  id="profile-confirm-password"
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pe-10"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...describe(passwordErrors, "confirmPassword", "profile-confirm-password")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors"
                  style={{ color: "var(--text-faint)" }}
                  aria-label={showConfirmPwd ? dict.auth.hidePassword : dict.auth.showPassword}
                  aria-pressed={showConfirmPwd}
                >
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldError(passwordErrors, "confirmPassword", "profile-confirm-password")}
            </div>
          </div>

          {/* Feedback */}
          {passwordMsg && <FeedbackMessage type={passwordMsg.type} text={passwordMsg.text} />}

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isPendingPassword || !newPassword || !confirmPassword}
              aria-busy={isPendingPassword}
              className="btn-primary px-6"
            >
              {isPendingPassword ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              {pd.updatePassword}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Feedback Message Component ───────────────────────────────── */

function FeedbackMessage({ type, text }: { type: "success" | "error"; text: string }) {
  const isSuccess = type === "success";
  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`mt-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border animate-fade-in-up ${
        isSuccess
          ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
          : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
      }`}
    >
      {isSuccess ? <CheckCircle size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
      {text}
    </div>
  );
}
