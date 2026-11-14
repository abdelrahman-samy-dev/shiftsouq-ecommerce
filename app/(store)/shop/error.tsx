"use client";

import { ListingError } from "@/components/shop/ListingError";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListingError
      reset={reset}
      digest={error.digest}
      title={{ en: "We couldn't load the products", ar: "تعذّر تحميل المنتجات" }}
      body={{
        en: "This is usually temporary. Please try again in a moment.",
        ar: "غالبًا ما تكون المشكلة مؤقتة. يُرجى المحاولة مرة أخرى بعد قليل.",
      }}
      link={{ href: "/", label: { en: "Back to home", ar: "العودة إلى الرئيسية" } }}
    />
  );
}
