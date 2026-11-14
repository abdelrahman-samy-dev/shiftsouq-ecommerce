/* Shown (with HTTP 404) when a product slug doesn't exist or is no longer on sale. */

import { ButtonLink } from "@/components/ds";
import { getLocale } from "@/lib/i18n/server";

export default async function ProductNotFound() {
  const locale = await getLocale();
  const isAr = locale === "ar";
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <p className="t-eyebrow">404</p>
      <h1 className="t-h1">{isAr ? "هذا المنتج غير متوفر" : "This product isn’t available"}</h1>
      <p className="max-w-md text-text-secondary">
        {isAr
          ? "ربما نفدت كميته نهائيًا أو تغيّر رابطه. تصفّح أحدث المنتجات لتجد ما يناسبك."
          : "It may have sold out for good or moved to a new link. Have a look at what’s new instead."}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/shop">{isAr ? "تصفّح المتجر" : "Browse the shop"}</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          {isAr ? "الرئيسية" : "Home"}
        </ButtonLink>
      </div>
    </div>
  );
}
