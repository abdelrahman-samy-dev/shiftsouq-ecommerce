"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerAction } from "@/lib/actions/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { motion, useReducedMotion, useAnimate, AnimatePresence } from "framer-motion";
import { formEntrance, formItem, shakeAnimation } from "@/lib/motion";

export default function RegisterForm({ dict }: { dict: Dictionary }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate();

  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      gender: "female",
    },
  });

  const selectedCountry = watch("country");

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    const result = await registerAction(data);
    if (result?.error) {
      setServerError(result.error);
      if (!prefersReducedMotion) {
        animate(scope.current, shakeAnimation);
      }
    }
  };

  return (
    <motion.div
      ref={scope}
      variants={formEntrance}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
      className="w-full max-w-2xl mx-auto p-8 sm:p-10 glass-panel bg-background/70 dark:bg-background/50 relative overflow-hidden rounded-[24px]"
    >
      <div className="absolute top-0 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-[150%] h-32 bg-gradient-to-b from-primary/5 dark:from-white/10 to-transparent blur-3xl pointer-events-none -z-10"></div>

      <motion.div variants={formItem} className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary mb-3">
          {dict.auth?.registerTitle || "Create an Account"}
        </h1>
        <p className="text-sm text-text-muted font-medium">
          {dict.auth?.registerSubtitle || "Join us today to get the best shopping experience."}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <motion.div
            variants={formItem}
            className="p-4 text-sm text-destructive bg-destructive-bg rounded-xl border border-destructive-border flex items-start gap-3"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{serverError}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div variants={formItem} className="space-y-1.5">
            <label htmlFor="reg-firstName" className="text-sm font-semibold text-text-primary/90 block ms-1">
              {dict.auth?.firstName || "First name"}
            </label>
            <input
              {...register("firstName")}
              id="reg-firstName"
              type="text"
              placeholder="John"
              className="input-field text-start"
              aria-describedby={errors.firstName ? "reg-firstName-error" : undefined}
              aria-invalid={!!errors.firstName}
            />
            {errors.firstName && (
              <p id="reg-firstName-error" className="text-xs font-medium text-destructive mt-1.5 ms-1" role="alert">{errors.firstName.message}</p>
            )}
          </motion.div>
          <motion.div variants={formItem} className="space-y-1.5">
            <label htmlFor="reg-lastName" className="text-sm font-semibold text-text-primary/90 block ms-1">
              {dict.auth?.lastName || "Last name"}
            </label>
            <input
              {...register("lastName")}
              id="reg-lastName"
              type="text"
              placeholder="Doe"
              className="input-field text-start"
              aria-describedby={errors.lastName ? "reg-lastName-error" : undefined}
              aria-invalid={!!errors.lastName}
            />
            {errors.lastName && (
              <p id="reg-lastName-error" className="text-xs font-medium text-destructive mt-1.5 ms-1" role="alert">{errors.lastName.message}</p>
            )}
          </motion.div>
        </div>

        <motion.div variants={formItem} className="space-y-1.5">
          <label htmlFor="reg-email" className="text-sm font-semibold text-text-primary/90 block ms-1">
            {dict.auth?.email || "Email"}
          </label>
          <input
            {...register("email")}
            id="reg-email"
            type="email"
            placeholder="john.doe@example.com"
            className="input-field text-start"
            aria-describedby={errors.email ? "reg-email-error" : undefined}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p id="reg-email-error" className="text-xs font-medium text-destructive mt-1.5 ms-1" role="alert">{errors.email.message}</p>
          )}
        </motion.div>

        <motion.div variants={formItem} className="flex flex-wrap items-center gap-6 py-2">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                {...register("gender")}
                type="radio"
                value="female"
                className="peer appearance-none w-5 h-5 border-2 border-border hover:border-primary checked:border-primary rounded-full transition-all cursor-pointer"
              />
              <div className="absolute w-2.5 h-2.5 bg-primary rounded-full opacity-0 peer-checked:opacity-100 transition-all duration-200 scale-50 peer-checked:scale-100 pointer-events-none"></div>
            </div>
            <span className="text-sm font-medium text-text-muted group-hover:text-text-primary transition-colors">
              {dict.auth?.female || "Female"}
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                {...register("gender")}
                type="radio"
                value="male"
                className="peer appearance-none w-5 h-5 border-2 border-border hover:border-primary checked:border-primary rounded-full transition-all cursor-pointer"
              />
              <div className="absolute w-2.5 h-2.5 bg-primary rounded-full opacity-0 peer-checked:opacity-100 transition-all duration-200 scale-50 peer-checked:scale-100 pointer-events-none"></div>
            </div>
            <span className="text-sm font-medium text-text-muted group-hover:text-text-primary transition-colors">
              {dict.auth?.male || "Male"}
            </span>
          </label>

          {errors.gender && (
            <p className="text-xs font-medium text-destructive mt-1.5 ms-1 w-full">{errors.gender.message}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div variants={formItem} className="space-y-1.5" ref={countryRef}>
            <label className="text-sm font-semibold text-text-primary/90 block ms-1">
              {dict.auth?.country || "Country"}
            </label>
            <div className="relative">
              <div
                onClick={() => setIsCountryOpen(!isCountryOpen)}
                className={`flex items-center justify-between input-field cursor-pointer transition-all ${errors.country ? 'border-destructive' : ''}`}
                aria-invalid={!!errors.country}
              >
                <span className={`text-sm ${selectedCountry ? 'text-text-primary' : 'text-text-muted'}`}>
                  {selectedCountry === "EGY" ? (dict.auth?.egy || "Egypt") :
                   selectedCountry === "KSA" ? (dict.auth?.ksa || "Saudi Arabia") :
                   selectedCountry === "UAE" ? (dict.auth?.uae || "United Arab Emirates") :
                   selectedCountry === "USA" ? (dict.auth?.usa || "United States") :
                   selectedCountry === "UK" ? (dict.auth?.uk || "United Kingdom") :
                   (dict.auth?.selectCountry || "Select Country")}
                </span>
                <ChevronDown size={16} className={`text-text-muted transition-transform duration-200 ${isCountryOpen ? 'rotate-180' : ''}`} />
              </div>

              <AnimatePresence>
                {isCountryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-surface-elevated border border-border rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-[240px]"
                  >
                    <div className="overflow-y-auto py-1">
                      {[
                        { val: "EGY", label: dict.auth?.egy || "Egypt" },
                        { val: "KSA", label: dict.auth?.ksa || "Saudi Arabia" },
                        { val: "UAE", label: dict.auth?.uae || "United Arab Emirates" },
                        { val: "USA", label: dict.auth?.usa || "United States" },
                        { val: "UK", label: dict.auth?.uk || "United Kingdom" },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => {
                            setValue("country", item.val as any, { shouldValidate: true });
                            setIsCountryOpen(false);
                          }}
                          className={`w-full text-start px-4 py-2.5 text-sm transition-colors hover:bg-surface ${
                            selectedCountry === item.val
                              ? "bg-primary/5 text-primary font-medium"
                              : "text-text-secondary"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {errors.country && (
              <p className="text-xs font-medium text-destructive mt-1.5 ms-1">{errors.country.message}</p>
            )}
          </motion.div>
          <motion.div variants={formItem} className="space-y-1.5">
            <label className="text-sm font-semibold text-text-primary/90 block ms-1">
              {dict.auth?.city || "City"}
            </label>
            <input
              {...register("city")}
              type="text"
              placeholder="E.g. Dubai"
              className="input-field text-start"
            />
            {errors.city && (
              <p className="text-xs font-medium text-destructive mt-1.5 ms-1">{errors.city.message}</p>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div variants={formItem} className="space-y-1.5">
            <label htmlFor="reg-password" className="text-sm font-semibold text-text-primary/90 block ms-1">
              {dict.auth?.password || "Password"}
            </label>
            <div className="relative group">
              <input
                {...register("password")}
                id="reg-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="input-field text-start"
                aria-describedby={errors.password ? "reg-password-error" : undefined}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p id="reg-password-error" className="text-xs font-medium text-destructive mt-1.5 ms-1" role="alert">{errors.password.message}</p>
            )}
          </motion.div>

          <motion.div variants={formItem} className="space-y-1.5">
            <label htmlFor="reg-confirmPassword" className="text-sm font-semibold text-text-primary/90 block ms-1">
              {dict.auth?.confirmPassword || "Confirm Password"}
            </label>
            <div className="relative group">
              <input
                {...register("confirmPassword")}
                id="reg-confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="input-field text-start"
                aria-describedby={errors.confirmPassword ? "reg-confirmPassword-error" : undefined}
                aria-invalid={!!errors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="reg-confirmPassword-error" className="text-xs font-medium text-destructive mt-1.5 ms-1" role="alert">{errors.confirmPassword.message}</p>
            )}
          </motion.div>
        </div>

        <motion.div variants={formItem} className="pt-2">
          <label className="flex items-start space-x-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                {...register("terms")}
                type="checkbox"
                className="peer appearance-none w-5 h-5 border-2 border-border hover:border-primary checked:bg-primary checked:border-primary rounded-md transition-all cursor-pointer"
              />
              <svg
                className="absolute w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none transform scale-50 peer-checked:scale-100 transition-transform duration-200"
                viewBox="0 0 14 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-medium text-text-muted leading-snug">
              {dict.auth?.agreeTerms || "Agree with our"}{" "}
              <Link href="#" className="font-bold text-text-primary hover:underline transition-all">
                {dict.auth?.terms || "terms"}
              </Link>{" "}
              {dict.auth?.and || "and"}{" "}
              <Link href="#" className="font-bold text-text-primary hover:underline transition-all">
                {dict.auth?.privacyPolicy || "privacy policy"}
              </Link>.
            </span>
          </label>
          {errors.terms && (
            <p className="text-xs font-medium text-destructive mt-2 ms-1">{errors.terms.message}</p>
          )}
        </motion.div>

        <motion.div variants={formItem} className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary group relative w-full py-4 h-auto text-[15px] overflow-hidden shadow-xl shadow-primary/10 hover:shadow-primary/20"
          >
            <div className="absolute inset-0 -translate-x-full rtl:translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent"></div>

            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {dict.auth?.register || "Register"}
                <ArrowRight className="w-4 h-4 rtl:hidden group-hover:translate-x-1 transition-transform" />
                <ArrowLeft className="w-4 h-4 hidden rtl:block group-hover:-translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </motion.div>

        <motion.div variants={formItem} className="mt-8 pt-6 relative flex justify-center items-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative bg-background/70 dark:bg-background px-4 backdrop-blur-xl">
            <p className="text-sm font-medium text-text-muted">
              {dict.auth?.hasAccount || "Already have an account?"}{" "}
              <Link
                href="/login"
                className="text-text-primary font-bold hover:underline ms-1"
              >
                {dict.auth?.signIn || "Sign in"}
              </Link>
            </p>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}
