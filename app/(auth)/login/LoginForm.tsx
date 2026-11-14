"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginAction } from "@/lib/actions/auth";
import { createLoginSchema, type LoginInput } from "@/lib/validations/auth";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { motion, useReducedMotion, useAnimate } from "framer-motion";
import { formEntrance, formItem, shakeAnimation } from "@/lib/motion";

export default function LoginForm({ dict }: { dict: Dictionary }) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? undefined;

  /* Validation messages follow the active language */
  const schema = useMemo(() => createLoginSchema(dict.validation), [dict.validation]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    const result = await loginAction(data, redirectTo);
    if (result?.error) {
      setServerError(result.error);
      // Shake animation on error (respects reduced motion)
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
      className="w-full max-w-md mx-auto p-5 sm:p-8 lg:p-10 glass-panel bg-background/70 dark:bg-background/50 relative overflow-hidden rounded-2xl sm:rounded-[24px]"
    >
      {/* Decorative gradient orb */}
      <div className="absolute top-0 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-[150%] h-32 bg-gradient-to-b from-primary/5 dark:from-white/10 to-transparent blur-3xl pointer-events-none -z-10"></div>

      <motion.div variants={formItem} className="mb-6 sm:mb-10 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-text-primary mb-2 sm:mb-3">
          {dict.auth.loginTitle}
        </h1>
        <p className="text-sm text-text-muted font-medium">
          {dict.auth.loginSubtitle}
        </p>
      </motion.div>

      {/* noValidate: show our localized messages instead of the browser's */}
      <form onSubmit={(e) => handleSubmit(onSubmit)(e)} noValidate className="space-y-4 sm:space-y-6">
        {serverError && (
          <motion.div
            variants={formItem}
            role="alert"
            className="p-4 text-sm text-destructive bg-destructive-bg rounded-xl border border-destructive-border flex items-start gap-3"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{serverError}</p>
          </motion.div>
        )}

        <motion.div variants={formItem} className="space-y-1.5">
          <label htmlFor="login-email" className="text-sm font-semibold text-text-primary/90 block ms-1">
            {dict.auth.email}
          </label>
          <div className="relative group">
            <input
              {...register("email")}
              id="login-email"
              type="email"
              autoComplete="email"
              dir="ltr"
              placeholder="hello@shiftsouq.com"
              className="input-field text-start"
              aria-describedby={errors.email ? "login-email-error" : undefined}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && (
            <p id="login-email-error" className="text-xs font-medium text-destructive mt-1.5 ms-1" role="alert">{errors.email.message}</p>
          )}
        </motion.div>

        <motion.div variants={formItem} className="space-y-1.5">
          <label htmlFor="login-password" className="text-sm font-semibold text-text-primary/90 block ms-1">
            {dict.auth.password}
          </label>
          <div className="relative group">
            <input
              {...register("password")}
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="input-field text-start pe-12"
              aria-describedby={errors.password ? "login-password-error" : undefined}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label={showPassword ? dict.auth.hidePassword : dict.auth.showPassword}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" className="text-xs font-medium text-destructive mt-1.5 ms-1" role="alert">{errors.password.message}</p>
          )}
        </motion.div>

        <motion.div variants={formItem} className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                {...register("rememberMe")}
                type="checkbox"
                className="peer appearance-none w-5 h-5 border-2 border-border hover:border-primary checked:bg-primary checked:border-primary rounded-md transition-all cursor-pointer"
              />
              <svg
                className="absolute w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none transform scale-50 peer-checked:scale-100 transition-transform duration-200"
                viewBox="0 0 14 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-medium text-text-muted group-hover:text-text-primary transition-colors">
              {dict.auth.rememberMe}
            </span>
          </label>

          {/* No self-service reset yet: support handles it from the contact page. */}
          <Link
            href="/contact"
            className="text-sm font-semibold text-text-muted hover:text-text-primary hover:underline transition-all"
          >
            {dict.auth.forgotPassword}
          </Link>
        </motion.div>

        <motion.div variants={formItem} className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="btn-primary group relative w-full py-3 sm:py-4 h-auto text-[15px] overflow-hidden shadow-xl shadow-primary/10 hover:shadow-primary/20"
          >
            {/* Hover sheen effect */}
            <div className="absolute inset-0 -translate-x-full rtl:translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent"></div>

            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {dict.auth.loginTitle}
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
              {dict.auth.noAccount}{" "}
              <Link
                href="/register"
                className="text-text-primary font-bold hover:underline ms-1"
              >
                {dict.auth.register}
              </Link>
            </p>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}
