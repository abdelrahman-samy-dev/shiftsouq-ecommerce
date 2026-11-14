/* ══════════════════════════════════════════════════════════════
   ContactContent — Client Component
   ──────────────────────────────────────────────────────────────
   Premium contact form with:
   - Name, email, subject dropdown, and message textarea
   - Contact info sidebar (email, phone, hours, address)
   - Real-time validation + animated feedback
   ══════════════════════════════════════════════════════════════ */

"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Check,
} from "lucide-react";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { submitContactForm } from "@/lib/actions/contact";
import { createContactSchema, CONTACT_MESSAGE_MAX } from "@/lib/validations/contact";

interface Props {
  dict: Dictionary;
  /** Kept for callers; the dictionary already carries the language. */
  locale?: Locale;
}

type ContactField = "name" | "email" | "subject" | "message";

export default function ContactContent({ dict }: Props) {
  const ct = dict.contact;
  const form = ct.form;
  const info = ct.info;
  const subjects = ct.subjects;

  /* Form state */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  /** Honeypot — hidden from people, filled in by bots. */
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ContactField, string>>>({});

  /* Validation messages follow the active language */
  const schema = useMemo(() => createContactSchema(dict.validation), [dict.validation]);

  const errorProps = (field: ContactField) => ({
    "aria-invalid": !!fieldErrors[field],
    "aria-describedby": fieldErrors[field] ? `contact-${field}-error` : undefined,
  });

  const fieldError = (field: ContactField) =>
    fieldErrors[field] ? (
      <p id={`contact-${field}-error`} className="text-xs font-medium mt-1.5 text-destructive" role="alert">
        {fieldErrors[field]}
      </p>
    ) : null;

  /* Feedback state */
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  /* Subject options */
  const subjectOptions = [
    { value: "general", label: subjects.general || "General Inquiry" },
    { value: "order", label: subjects.order || "Order Issue" },
    { value: "return", label: subjects.return || "Return / Refund" },
    { value: "product", label: subjects.product || "Product Question" },
    { value: "other", label: subjects.other || "Other" },
  ];

  /* Custom Dropdown State */
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const subjectContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        subjectContainerRef.current &&
        !subjectContainerRef.current.contains(e.target as Node)
      ) {
        setIsSubjectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsSubjectOpen(false);
    }
    if (isSubjectOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isSubjectOpen]);

  /* ── Submit Handler ────────────────────────────────────────── */

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const selectedLabel = subjectOptions.find((o) => o.value === subject)?.label || "";

    /* Instant feedback in the visitor's language (the server checks again) */
    const parsed = schema.safeParse({ name, email, subject: selectedLabel, message });
    if (!parsed.success) {
      const next: Partial<Record<ContactField, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as ContactField;
        if (!next[field]) next[field] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const result = await submitContactForm({
        name,
        email,
        subject: selectedLabel,
        message,
        website,
      });

      setFeedback({
        type: result.success ? "success" : "error",
        text: result.message,
      });
      if (!result.success && result.field) {
        setFieldErrors({ [result.field]: result.message });
      }

      if (result.success) {
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      }
    });
  }

  return (
    <div className="min-h-[70vh] mx-auto max-w-6xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{ background: "var(--surface-elevated)" }}
        >
          <MessageSquare
            size={28}
            strokeWidth={1.5}
            style={{ color: "var(--accent)" }}
          />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          {ct.title || "Contact Us"}
        </h1>
        <p
          className="text-sm max-w-xl mx-auto leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {ct.subtitle ||
            "We'd love to hear from you. Send us a message and we'll respond as soon as possible."}
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Form (3 cols) ────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-3 card-elevated p-6 sm:p-8"
        >
          {/* Honeypot: invisible to people and screen readers, bots fill it in */}
          <div className="absolute -start-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Name */}
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {form.name} *
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
                autoComplete="name"
                placeholder={form.namePlaceholder}
                {...errorProps("name")}
              />
              {fieldError("name")}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {form.email} *
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                autoComplete="email"
                placeholder="you@example.com"
                dir="ltr"
                {...errorProps("email")}
              />
              {fieldError("email")}
            </div>

            {/* Subject */}
            <div className="sm:col-span-2" ref={subjectContainerRef}>
              <label
                id="contact-subject-label"
                htmlFor="contact-subject"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {form.subject} *
              </label>
              <div className="relative">
                <button
                  type="button"
                  id="contact-subject"
                  onClick={() => setIsSubjectOpen((prev) => !prev)}
                  className="input-field w-full flex items-center justify-between text-start cursor-pointer"
                  aria-haspopup="listbox"
                  aria-expanded={isSubjectOpen}
                  aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}
                >
                  <span
                    style={{
                      color: subject ? "var(--text-primary)" : "var(--text-faint)",
                    }}
                  >
                    {subject
                      ? subjectOptions.find((o) => o.value === subject)?.label
                      : form.subjectPlaceholder}
                  </span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: "var(--text-muted)",
                      transition: "transform var(--duration-fast) ease",
                      transform: isSubjectOpen ? "rotate(180deg)" : "rotate(0deg)"
                    }}
                  />
                </button>

                {isSubjectOpen && (
                  <div
                    className="absolute z-50 w-full mt-2 p-1.5 dropdown-panel animate-scale-in origin-top"
                    role="listbox"
                    aria-labelledby="contact-subject-label"
                  >
                    {subjectOptions.map((opt) => {
                      const isActive = opt.value === subject;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => {
                            setSubject(opt.value);
                            setIsSubjectOpen(false);
                            setFieldErrors((prev) => ({ ...prev, subject: undefined }));
                          }}
                          className={`sort-select-option ${isActive ? "sort-select-option-active" : ""}`}
                        >
                          <span>{opt.label}</span>
                          {isActive && (
                            <Check size={16} strokeWidth={2.5} className="sort-select-check" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {fieldError("subject")}
            </div>

            {/* Message */}
            <div className="sm:col-span-2">
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {form.message} *
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input-field resize-none"
                rows={6}
                required
                maxLength={CONTACT_MESSAGE_MAX}
                placeholder={form.messagePlaceholder}
                {...errorProps("message")}
              />
              {fieldError("message")}
              <p
                className="text-xs mt-1.5 text-end"
                style={{ color: "var(--text-faint)" }}
                dir="ltr"
              >
                {message.length}/{CONTACT_MESSAGE_MAX}
              </p>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`mt-5 flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border animate-fade-in-up ${
                feedback.type === "success"
                  ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              )}
              {feedback.text}
            </div>
          )}

          {/* Submit */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full sm:w-auto px-8"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {isPending
                ? form.sending || "Sending..."
                : form.submit || "Send Message"}
            </button>
          </div>
        </form>

        {/* ── Info Sidebar (2 cols) ────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Get in Touch card */}
          <div className="card-elevated p-6 sm:p-8">
            <h2
              className="text-base font-bold mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              {info.title || "Get in Touch"}
            </h2>

            <div className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex items-start gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <Mail
                    size={18}
                    strokeWidth={1.5}
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {info.email || "Email"}
                  </p>
                  <a
                    href="mailto:support@shiftsouq.com"
                    className="text-sm font-medium hover:underline"
                    style={{ color: "var(--text-primary)" }}
                    dir="ltr"
                  >
                    support@shiftsouq.com
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <Phone
                    size={18}
                    strokeWidth={1.5}
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {info.phone || "Phone"}
                  </p>
                  <a
                    href="tel:+201234567890"
                    className="text-sm font-medium hover:underline"
                    style={{ color: "var(--text-primary)" }}
                    dir="ltr"
                  >
                    +20 123 456 7890
                  </a>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <MapPin
                    size={18}
                    strokeWidth={1.5}
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {info.address || "Address"}
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {info.addressValue || "Cairo, Egypt"}
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface-elevated)" }}
                >
                  <Clock
                    size={18}
                    strokeWidth={1.5}
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {info.hours || "Business Hours"}
                  </p>
                  <p
                    className="text-sm font-medium whitespace-pre-line leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {(info.hoursValue ||
                      "Mon - Fri: 10:00 AM - 8:00 PM\nSat - Sun: 11:00 AM - 6:00 PM"
                    ).replace(/\\n/g, "\n")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Response Time Note */}
          <div
            className="rounded-xl px-5 py-4 border text-center"
            style={{
              background: "var(--surface-elevated)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {ct.responseNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
