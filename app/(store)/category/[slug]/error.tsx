"use client";

import { ListingError } from "@/components/shop/ListingError";

export default function CategoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListingError
      reset={reset}
      digest={error.digest}
      title={{ en: "This category didn't load", ar: "تعذّر تحميل هذه الفئة" }}
      body={{
        en: "Please try again, or browse everything in the shop.",
        ar: "يُرجى المحاولة مرة أخرى، أو تصفّح جميع المنتجات في المتجر.",
      }}
      link={{ href: "/shop", label: { en: "All products", ar: "جميع المنتجات" } }}
    />
  );
}
