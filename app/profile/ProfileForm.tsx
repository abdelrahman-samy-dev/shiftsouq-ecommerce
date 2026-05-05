/* ══════════════════════════════════════════════════════════════
   ProfileForm — Client Component
   ──────────────────────────────────────────────────────────────
   Premium profile management form with:
   - Personal information editing (name, phone, country, city)
   - Password change section
   - Real-time feedback with toast-style status messages
   ══════════════════════════════════════════════════════════════ */

"use client";

import { useState, useTransition } from "react";
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
import { updateProfile, changePassword } from "@/lib/actions/profile";

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
  dict: Record<string, any>;
  profile: ProfileData;
  locale: Locale;
}

/* ── Component ───────────────────────────────────────────────── */

export default function ProfileForm({ dict, profile, locale }: Props) {
  const pd = dict.profile || ({} as Record<string, any>);

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

  const [isPendingProfile, startProfileTransition] = useTransition();
  const [isPendingPassword, startPasswordTransition] = useTransition();

  /* ── Handle Profile Update ─────────────────────────────────── */

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);

    startProfileTransition(async () => {
      const result = await updateProfile({
        full_name: fullName,
        phone,
        country,
        city,
      });

      setProfileMsg({
        type: result.success ? "success" : "error",
        text: result.success
          ? pd.profileUpdated || result.message
          : result.message,
      });

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

    if (newPassword !== confirmPassword) {
      setPasswordMsg({
        type: "error",
        text: pd.passwordMismatch || "New passwords do not match",
      });
      return;
    }

    startPasswordTransition(async () => {
      const result = await changePassword(newPassword);

      setPasswordMsg({
        type: result.success ? "success" : "error",
        text: result.success
          ? pd.passwordChanged || result.message
          : result.message,
      });

      if (result.success) {
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordMsg(null), 4000);
      }
    });
  }

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
            {pd.title || "My Profile"}
          </h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {pd.subtitle || "Manage your account details"}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* ══════════════════════════════════════════════════════
           Section 1: Personal Information
           ══════════════════════════════════════════════════════ */}
        <form onSubmit={handleProfileSubmit} className="card-elevated p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <User size={18} style={{ color: "var(--accent)" }} />
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                {pd.personalInfo || "Personal Information"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {pd.personalInfoDesc || "Update your personal details"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Email (read-only) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                <Mail size={14} className="inline me-1.5 -mt-0.5" />
                {pd.email || "Email Address"}
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="input-field opacity-60 cursor-not-allowed"
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--text-faint)" }}>
                {pd.emailNote || "Email cannot be changed. Contact support if needed."}
              </p>
            </div>

            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                <User size={14} className="inline me-1.5 -mt-0.5" />
                {pd.fullName || "Full Name"}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder={locale === "ar" ? "أدخل اسمك الكامل" : "Enter your full name"}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                <Phone size={14} className="inline me-1.5 -mt-0.5" />
                {pd.phone || "Phone Number"}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                placeholder="+20 xxx xxx xxxx"
                dir="ltr"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                <Globe size={14} className="inline me-1.5 -mt-0.5" />
                {pd.country || "Country"}
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input-field"
                placeholder={locale === "ar" ? "مصر" : "Egypt"}
              />
            </div>

            {/* City */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                <MapPin size={14} className="inline me-1.5 -mt-0.5" />
                {pd.city || "City"}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-field"
                placeholder={locale === "ar" ? "القاهرة" : "Cairo"}
              />
            </div>
          </div>

          {/* Feedback */}
          {profileMsg && <FeedbackMessage type={profileMsg.type} text={profileMsg.text} />}

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isPendingProfile}
              className="btn-primary px-6"
            >
              {isPendingProfile ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              {pd.updateProfile || "Update Profile"}
            </button>
          </div>
        </form>

        {/* ══════════════════════════════════════════════════════
           Section 2: Change Password
           ══════════════════════════════════════════════════════ */}
        <form onSubmit={handlePasswordSubmit} className="card-elevated p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={18} style={{ color: "var(--accent)" }} />
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                {pd.changePassword || "Change Password"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {pd.changePasswordDesc || "Update your password to keep your account secure"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                {pd.newPassword || "New Password"}
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pe-10"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors"
                  style={{
                    right: locale === "ar" ? "auto" : "0.5rem",
                    left: locale === "ar" ? "0.5rem" : "auto",
                    color: "var(--text-faint)",
                  }}
                  tabIndex={-1}
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                {pd.confirmNewPassword || "Confirm New Password"}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pe-10"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors"
                  style={{
                    right: locale === "ar" ? "auto" : "0.5rem",
                    left: locale === "ar" ? "0.5rem" : "auto",
                    color: "var(--text-faint)",
                  }}
                  tabIndex={-1}
                >
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {passwordMsg && <FeedbackMessage type={passwordMsg.type} text={passwordMsg.text} />}

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isPendingPassword || !newPassword || !confirmPassword}
              className="btn-primary px-6"
            >
              {isPendingPassword ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              {pd.updatePassword || "Update Password"}
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
      className={`mt-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border animate-fade-in-up ${
        isSuccess
          ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
          : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
      }`}
    >
      {isSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {text}
    </div>
  );
}
