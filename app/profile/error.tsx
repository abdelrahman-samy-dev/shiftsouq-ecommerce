"use client";

import ErrorState from "@/components/shared/ErrorState";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title={{ en: "Profile Error", ar: "تعذّر عرض الملف الشخصي" }}
      message={{
        en: "We couldn't load your profile. Please try again.",
        ar: "لم نتمكن من تحميل ملفك الشخصي. يرجى المحاولة مرة أخرى.",
      }}
      digest={error.digest}
      onReset={reset}
      retryLabel={{ en: "Reload Profile", ar: "إعادة تحميل الملف الشخصي" }}
      secondaryHref="/"
      secondaryLabel={{ en: "Go Home", ar: "العودة إلى الرئيسية" }}
      secondaryIcon="home"
    />
  );
}
