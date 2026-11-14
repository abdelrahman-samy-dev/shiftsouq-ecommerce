/* Checkout — shown while the page loads; same shape as the page (no layout shift). */

import { CheckoutSkeleton } from "@/components/checkout/CheckoutPageContent";

export default function CheckoutLoading() {
  return <CheckoutSkeleton label="Loading" />;
}
