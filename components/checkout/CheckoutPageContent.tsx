"use client";

/* ══════════════════════════════════════════════════════════════
   CheckoutPageContent — one-page checkout
   ──────────────────────────────────────────────────────────────
   Contact → Delivery → Payment on one page; finished sections
   collapse to a summary with "Edit". Guests check out without an
   account; signed-in buyers start from their profile and saved
   addresses.

   • Every amount shown is the server's quote (quoteCheckout):
     server prices, promo discount, delivery from the store
     settings. Nothing the browser computes is sent as a price.
   • "Place order": cash on delivery → receipt. Card → Paymob form
     (or the local test panel). Wallet → wallet provider redirect.
   • An unpaid card / wallet order of this visit is remembered
     (session storage, no secrets): retrying the payment — also
     after coming back from a failed redirect — reuses it instead
     of reserving stock twice. If the buyer changes anything, the
     old order is released first. The bag is emptied only once
     the order is placed (cash) or the payment confirmed.
   ══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Lock, X } from "lucide-react";
import { toast } from "sonner";

import { Breadcrumbs, ButtonLink, Skeleton } from "@/components/ds";
import { useHydrated } from "@/components/shared/useHydrated";
import { useCartStore, selectCartSubtotal } from "@/lib/store/useCartStore";
import {
  readSavedGovernorate,
  useCheckoutStore,
  type ContactInfo,
  type DeliveryInfo,
  type PendingOrder,
} from "@/lib/store/useCheckoutStore";
import type { CheckoutPrefill, EtaByZone } from "@/lib/dal/orders";
import type { ShippingSettings } from "@/lib/settings/types";
import { governorateName } from "@/lib/checkout/shipping";
import { startPayment } from "@/lib/actions/paymob";
import {
  createOrder,
  previewPromoCode,
  quoteCheckout,
  releaseCheckoutOrder,
  type CheckoutQuote,
  type CreateOrderResult,
} from "@/lib/actions/checkout";
import { cn } from "@/lib/utils";

import {
  checkoutTotals,
  contactSchema,
  deliverySchema,
  formatAddress,
  formatEgyptianMobile,
  formatMoney,
  normalizeEgyptianMobile,
  paymentOptions,
  paymentUnavailableMessage,
  promoErrorMessage,
  type Lang,
  type PaymentMethod,
} from "./checkout-rules";
import { checkoutCopy } from "./copy";
import { CheckoutSection } from "./CheckoutSection";
import { ContactSection } from "./ContactSection";
import { DeliverySection } from "./DeliverySection";
import { PaymentSection } from "./PaymentSection";
import { OrderSummaryPanel } from "./OrderSummaryPanel";
import { CardPaymentDialog, type CardSession } from "./CardPaymentDialog";
import { noticeTone, textLink } from "./ui";

/* ── Types ───────────────────────────────────────────────────── */

interface CheckoutPageContentProps {
  locale: string;
  /** Signed-in buyer's details and saved addresses; null for guests. */
  prefill: CheckoutPrefill | null;
  /** Delivery rates from the store settings (the server charges with the same). */
  rates: ShippingSettings;
  /** Delivery time per governorate (falls back to rates.etaDays). */
  etaByZone: EtaByZone;
  /** Methods the store owner offers. */
  payments: Record<PaymentMethod, boolean>;
  /** Online methods the gateway can take right now. */
  gateway: { card: boolean; wallet: boolean };
}

type StartResult = "started" | "stale" | "failed";
type Problem = { kind: "payment_failed" } | { kind: "stock" } | { kind: "error"; message: string };

const isBlank = (o: object) => Object.values(o).every((v) => v === "" || v === false || v == null);

/* ── Component ───────────────────────────────────────────────── */

export function CheckoutPageContent({ locale, prefill, rates, etaByZone, payments, gateway }: CheckoutPageContentProps) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = checkoutCopy(lang);
  const router = useRouter();
  const mounted = useHydrated();
  const signedIn = !!prefill;

  /* ── Bag + checkout state ──────────────────────────────────── */
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const cartSubtotal = useCartStore(selectCartSubtotal);

  const section = useCheckoutStore((s) => s.section);
  const done = useCheckoutStore((s) => s.done);
  const contact = useCheckoutStore((s) => s.contact);
  const delivery = useCheckoutStore((s) => s.delivery);
  const storedMethod = useCheckoutStore((s) => s.paymentMethod);
  const promoCode = useCheckoutStore((s) => s.promoCode);
  const pendingOrder = useCheckoutStore((s) => s.pendingOrder);
  const isProcessing = useCheckoutStore((s) => s.isProcessing);
  const seed = useCheckoutStore((s) => s.seed);
  const store = useCheckoutStore.getState;

  /* ── First visit: start from the buyer's profile, saved address and bag estimate ── */
  const initialized = useRef(false);
  useEffect(() => {
    if (!mounted || initialized.current) return;
    initialized.current = true;
    const s = store();
    if (s.isProcessing) s.setIsProcessing(false);
    if (!isBlank(s.contact) || !isBlank({ ...s.delivery, saveAddress: false })) return;
    s.bumpSeed();

    let nextContact: ContactInfo = s.contact;
    let nextDelivery: DeliveryInfo = s.delivery;
    const saved = prefill ? (prefill.addresses.find((a) => a.isDefault) ?? prefill.addresses[0]) : undefined;
    if (prefill) {
      // The profile's mobile, else the one on the default saved address.
      nextContact = { email: prefill.contact.email, phone: prefill.contact.phone || normalizeEgyptianMobile(saved?.phone) || "" };
      nextDelivery = { ...s.delivery, firstName: prefill.contact.firstName, lastName: prefill.contact.lastName };
    }
    if (saved) {
      const [firstName, ...rest] = saved.fullName.trim().split(/\s+/);
      nextDelivery = {
        ...nextDelivery,
        addressId: saved.id,
        firstName: firstName ?? "",
        lastName: rest.join(" "),
        governorate: saved.governorate,
        city: saved.city,
        address: saved.address,
        apartment: saved.apartment ?? "",
        postalCode: saved.postalCode ?? "",
        saveAddress: false,
      };
    }
    const estimate = readSavedGovernorate();
    if (estimate && !nextDelivery.governorate) nextDelivery = { ...nextDelivery, governorate: estimate };
    s.setContact(nextContact);
    s.setDelivery(nextDelivery);

    // Returning buyers with complete details go straight to delivery (or to payment with a saved address).
    if (prefill && contactSchema(lang).pick({ email: true, phone: true }).safeParse(nextContact).success) {
      s.completeContact(nextContact);
      if (saved && deliverySchema(lang).safeParse(nextDelivery).success) s.completeDelivery(nextDelivery);
    }
  }, [mounted, prefill, lang, store]);

  /* ── Coming back from a failed payment redirect ────────────── */
  const searchParams = useSearchParams();
  const [problem, setProblem] = useState<Problem | null>(() =>
    searchParams.get("payment_error") === "true" ? { kind: "payment_failed" } : null,
  );
  useEffect(() => {
    if (searchParams.get("payment_error") === "true") window.history.replaceState(null, "", "/checkout");
  }, [searchParams]);

  /* ── Server quote: what the order will cost ────────────────── */
  const governorate = delivery.governorate || "";
  const quoteKey = JSON.stringify({
    items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    governorate: governorate || undefined,
    promoCode: promoCode ?? undefined,
  });
  const [quoteState, setQuoteState] = useState<{ key: string; quote: CheckoutQuote } | null>(null);
  const [promoNotice, setPromoNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      quoteCheckout(JSON.parse(quoteKey))
        .then((quote) => {
          if (cancelled) return;
          setQuoteState({ key: quoteKey, quote });
          // The code stopped applying (bag changed, used up, expired…): drop it and say why.
          if (quote.ok && quote.promo && !quote.promo.ok) {
            setPromoNotice(promoErrorMessage(quote.promo.reason, lang, quote.promo.minOrder));
            useCheckoutStore.getState().setPromoCode(null);
          }
        })
        .catch(() => {
          /* keep showing the estimate */
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [quoteKey, mounted, items.length, lang]);

  const freshQuote = quoteState?.key === quoteKey && quoteState.quote.ok ? quoteState.quote : null;
  const lastDiscount =
    promoCode && quoteState?.quote.promo?.ok && quoteState.quote.promo.code === promoCode ? quoteState.quote.discount : 0;
  const totals = freshQuote ?? checkoutTotals(cartSubtotal, lastDiscount, governorate, rates);
  const unitPrices = freshQuote?.unitPrices ?? quoteState?.quote.unitPrices;
  const unavailableLines = unitPrices ? items.filter((i) => unitPrices[`${i.productId}:${i.variantId}`] === null).length : 0;

  /* ── Payment methods on offer (owner switches, gateway, COD ceiling) ── */
  const options = useMemo(() => paymentOptions({ enabled: payments, gateway, total: totals.total }), [payments, gateway, totals.total]);
  const firstAvailable = (["cod", "card", "wallet"] as const).find((m) => options[m].available) ?? null;
  const method: PaymentMethod | null = storedMethod && options[storedMethod].available ? storedMethod : firstAvailable;

  /* ── Server-side field errors and payment errors ───────────── */
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof ContactInfo, string>>>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);

  /* ── Card payment window ───────────────────────────────────── */
  const [card, setCard] = useState<CardSession | null>(null);
  /** Access token of the order created in this page view (the receipt cookie covers reloads). */
  const accessTokenRef = useRef<{ orderId: string; token: string } | null>(null);

  /* ── Section handlers ──────────────────────────────────────── */
  /** Focus follows the buyer's own steps only (not the automatic fill-in on load). */
  const [interacted, setInteracted] = useState(false);
  const openSection = useCallback((name: "contact" | "delivery") => {
    setInteracted(true);
    useCheckoutStore.getState().open(name);
  }, []);

  const onContactDone = useCallback((c: ContactInfo) => {
    setInteracted(true);
    setContactErrors({});
    useCheckoutStore.getState().completeContact(c);
  }, []);

  const onDeliveryDone = useCallback((d: DeliveryInfo) => {
    setInteracted(true);
    useCheckoutStore.getState().completeDelivery(d);
  }, []);

  const onGovernorateChange = useCallback((g: string) => {
    const s = useCheckoutStore.getState();
    s.setDelivery({ ...s.delivery, governorate: g });
  }, []);

  /* ── Promo code ────────────────────────────────────────────── */
  const handleApplyPromo = useCallback(
    async (code: string): Promise<string | null> => {
      setPromoNotice(null);
      const res = await previewPromoCode(
        code,
        items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      );
      if (!res.ok) return promoErrorMessage(res.reason, lang, res.minOrder);
      useCheckoutStore.getState().setPromoCode(code.trim().toUpperCase());
      return null;
    },
    [items, lang],
  );

  const handleRemovePromo = useCallback(() => {
    setPromoNotice(null);
    useCheckoutStore.getState().setPromoCode(null);
  }, []);

  /* ── Online payment (card form / wallet redirect) ──────────── */
  const startOnline = useCallback(
    async (order: PendingOrder): Promise<StartResult> => {
      const token = accessTokenRef.current?.orderId === order.orderId ? accessTokenRef.current.token : undefined;

      if (order.method === "wallet") {
        const res = await fetch("/api/checkout/paymob/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.orderId,
            accessToken: token,
            walletPhone: normalizeEgyptianMobile(useCheckoutStore.getState().contact.phone) ?? undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 404 || res.status === 409) return "stale";
        if (!res.ok || !data.success || !data.redirectUrl) {
          setPaymentError(
            res.status === 503
              ? paymentUnavailableMessage("gateway", lang)
              : lang === "ar"
                ? "تعذر بدء الدفع بالمحفظة. يرجى المحاولة مرة أخرى."
                : "We couldn't start the wallet payment. Please try again.",
          );
          return "failed";
        }
        // The bag stays until the payment is confirmed, so a failed wallet payment returns to a full bag.
        window.location.href = data.redirectUrl;
        return "started";
      }

      const result = await startPayment({ orderId: order.orderId, accessToken: token, method: "card" });
      if (!result.success) {
        if (result.code === "not_found" || result.code === "not_payable") return "stale";
        setPaymentError(
          result.code === "unavailable"
            ? paymentUnavailableMessage("gateway", lang)
            : lang === "ar"
              ? "بوابة الدفع لا تستجيب حاليًا. يرجى المحاولة مرة أخرى."
              : "The payment gateway is not responding. Please try again.",
        );
        return "failed";
      }
      if (result.method !== "card") return "failed";
      setCard({ token: result.paymentToken, iframeId: result.iframeId });
      return "started";
    },
    [lang],
  );

  /* ── Order errors → the right place on the page ───────────── */
  const showOrderError = useCallback(
    (r: CreateOrderResult) => {
      const s = useCheckoutStore.getState();
      switch (r.code) {
        case "invalid_phone":
          setContactErrors({
            phone: lang === "ar" ? "يرجى إدخال رقم محمول مصري صحيح (01XXXXXXXXX)." : "Please enter a valid Egyptian mobile number (01XXXXXXXXX).",
          });
          s.open("contact");
          return;
        case "invalid_promo":
          s.setPromoCode(null);
          setPromoNotice(promoErrorMessage(r.promoReason, lang, r.minOrder));
          setPaymentError(lang === "ar" ? "أزلنا رمز الخصم لأنه لم يعد صالحًا. راجع الإجمالي ثم أكّد الطلب." : "We removed the promo code because it no longer applies. Check the total, then place your order.");
          return;
        case "payment_unavailable":
          setPaymentError(paymentUnavailableMessage(r.paymentReason ?? "gateway", lang));
          // The store's switches changed while the page was open: reload them.
          router.refresh();
          return;
        case "cod_limit":
          setPaymentError(paymentUnavailableMessage("cod_limit", lang));
          return;
        case "out_of_stock":
        case "product_unavailable":
        case "choose_variant":
          setProblem({ kind: "stock" });
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        default:
          setProblem({ kind: "error", message: t.genericError });
      }
    },
    [lang, t.genericError, router],
  );

  /* ── Place order ───────────────────────────────────────────── */
  const handlePlaceOrder = useCallback(async () => {
    const s = useCheckoutStore.getState();
    if (s.isProcessing || !method) return;
    if (!s.done.contact) return s.open("contact");
    if (!s.done.delivery) return s.open("delivery");

    s.setIsProcessing(true);
    setPaymentError(null);
    setProblem(null);

    try {
      const lines = items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }));
      const { addressId: _a, saveAddress: _s, ...deliveryKey } = s.delivery;
      void _a;
      void _s;
      const orderKey = JSON.stringify([s.contact, deliveryKey, method, s.promoCode, lines]);

      /* Retry: same details, same method → pay for the same order */
      const previous = s.pendingOrder;
      if (previous) {
        if (method !== "cod" && previous.key === orderKey && previous.method === method) {
          const started = await startOnline(previous);
          if (started !== "stale") {
            if (started === "failed" || previous.method === "card") s.setIsProcessing(false);
            return;
          }
          // The old order can no longer be paid (expired / cancelled): place a new one.
        } else {
          // Details / method / bag changed: give the old unpaid order's stock back first.
          await releaseCheckoutOrder(previous.orderId).catch(() => null);
        }
        s.setPendingOrder(null);
      }

      /* 1. Create the order: the server prices it and reserves stock */
      const result = await createOrder({
        firstName: s.delivery.firstName,
        lastName: s.delivery.lastName,
        email: s.contact.email,
        phone: s.contact.phone,
        governorate: s.delivery.governorate,
        city: s.delivery.city,
        address: s.delivery.address,
        apartment: s.delivery.apartment || undefined,
        postalCode: s.delivery.postalCode || undefined,
        notes: s.delivery.notes || undefined,
        paymentMethod: method,
        promoCode: s.promoCode ?? undefined,
        saveAddress: signedIn && s.delivery.saveAddress,
        items: lines,
      });

      if (!result.success || !result.orderId || !result.accessToken) {
        showOrderError(result);
        s.setIsProcessing(false);
        return;
      }

      const { orderId, accessToken, orderNumber = "" } = result;

      if (method === "cod") {
        clearCart();
        s.resetCheckout();
        router.push(`/checkout/success?order=${encodeURIComponent(orderNumber)}`);
        return;
      }

      /* 2. Online payment */
      accessTokenRef.current = { orderId, token: accessToken };
      const pending: PendingOrder = { key: orderKey, orderId, orderNumber, method };
      s.setPendingOrder(pending);
      const started = await startOnline(pending);
      if (started === "stale") {
        setPaymentError(lang === "ar" ? "تعذر بدء الدفع. يرجى المحاولة مرة أخرى." : "We couldn't start the payment. Please try again.");
        s.setPendingOrder(null);
      }
      if (started !== "started" || method === "card") s.setIsProcessing(false);
    } catch (error) {
      console.error("[Checkout] order failed:", error);
      setProblem({ kind: "error", message: t.genericError });
      s.setIsProcessing(false);
    }
  }, [method, items, signedIn, startOnline, showOrderError, clearCart, router, lang, t.genericError]);

  /* ── Card window results ───────────────────────────────────── */
  const handleCardClose = useCallback(() => setCard(null), []);

  const handleCardComplete = useCallback(
    (success: boolean) => {
      setCard(null);
      if (success) {
        const orderNumber = useCheckoutStore.getState().pendingOrder?.orderNumber;
        clearCart();
        useCheckoutStore.getState().resetCheckout();
        router.push(orderNumber ? `/checkout/success?order=${encodeURIComponent(orderNumber)}` : "/checkout/success");
      } else {
        setProblem({ kind: "payment_failed" });
        toast.error(t.paymentFailed);
      }
    },
    [clearCart, router, t.paymentFailed],
  );

  /* ── Mobile summary toggle ─────────────────────────────────── */
  const [summaryOpen, setSummaryOpen] = useState(false);

  /* ── Loading / empty ───────────────────────────────────────── */
  if (!mounted) return <CheckoutSkeleton label={t.loading} />;

  if (items.length === 0) {
    return (
      <div className="container-x py-24 md:py-32">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="t-h1">{t.emptyTitle}</h1>
          <p className="text-text-secondary">{t.emptyBody}</p>
          <ButtonLink href="/shop" size="lg" className="mt-4">
            {t.browse}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const locked = isProcessing || !!card;
  const retry = !!pendingOrder && method !== "cod" && pendingOrder.method === method && problem?.kind === "payment_failed";
  const deliveryPlace = governorate ? governorateName(governorate, lang) : undefined;

  const summaryProps = {
    locale,
    items,
    unitPrices,
    totals,
    freeThreshold: rates.freeThreshold,
    deliveryTo: deliveryPlace,
    updating: !freshQuote,
    promoCode,
    promoNotice,
    onApplyPromo: handleApplyPromo,
    onRemovePromo: handleRemovePromo,
    locked,
  };

  const contactSummary = (
    <>
      <span className="block text-start rtl:text-end" dir="ltr">
        {contact.email}
      </span>
      <span className="block text-start rtl:text-end" dir="ltr">
        {formatEgyptianMobile(contact.phone)}
      </span>
    </>
  );
  const deliverySummary = (
    <>
      <span className="block text-text-primary">{`${delivery.firstName} ${delivery.lastName}`.trim()}</span>
      <span className="block">{formatAddress(delivery, lang)}</span>
      <span className="block text-text-muted">
        {t.deliveryLine}: {totals.shipping === null ? "—" : totals.shipping === 0 ? t.free : formatMoney(totals.shipping, lang)}
      </span>
    </>
  );

  const stateOf = (name: "contact" | "delivery" | "payment") =>
    section === name ? "open" : name === "payment" ? "upcoming" : done[name] ? "done" : "upcoming";

  return (
    <div className="container-x pb-20 pt-6 md:pt-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex items-center justify-between gap-4">
          <Breadcrumbs items={[{ label: t.bag, href: "/cart" }, { label: t.title }]} />
          <p className="flex items-center gap-1.5 text-[0.8125rem] text-text-muted">
            <Lock className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            {t.secure}
          </p>
        </div>

        <h1 className="t-h1 mt-6 md:mt-8">{t.title}</h1>

        {/* Mobile: collapsible order summary at the top */}
        <div className="-mx-5 mt-6 border-y border-border bg-surface md:-mx-8 lg:hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            aria-controls="checkout-summary-mobile"
            className="flex min-h-14 w-full items-center justify-between gap-4 px-5 text-sm md:px-8"
          >
            <span className="flex items-center gap-2 text-text-primary">
              {summaryOpen ? t.hideSummary : t.showSummary}
              <ChevronDown className={cn("size-4 transition-transform duration-200", summaryOpen && "rotate-180")} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className={cn("t-price text-base text-text-primary transition-opacity", !freshQuote && "opacity-60")}>
              {formatMoney(totals.total, lang)}
            </span>
          </button>
          <div id="checkout-summary-mobile" hidden={!summaryOpen} className="border-t border-border px-5 pb-8 pt-6 md:px-8">
            <OrderSummaryPanel {...summaryProps} hideTitle idPrefix="m" />
          </div>
        </div>

        <div className="mt-8 grid gap-x-16 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-x-24">
          <div className="min-w-0">
            {/* Account prompt */}
            <div className="mb-10 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              {signedIn ? (
                <span className="text-text-secondary">{t.signedInAs(prefill?.contact.email ?? "")}</span>
              ) : (
                <>
                  <span className="text-text-secondary">{t.haveAccount}</span>
                  <Link href="/login?redirect=%2Fcheckout" className={cn("text-text-primary", textLink)}>
                    {t.signInFaster}
                  </Link>
                </>
              )}
            </div>

            {problem && problem.kind !== "payment_failed" ? <ProblemBanner problem={problem} t={t} onDismiss={() => setProblem(null)} /> : null}

            <div>
            <CheckoutSection
              id="checkout-contact"
              index={1}
              title={t.contact}
              state={stateOf("contact")}
              summary={contactSummary}
              editLabel={t.edit}
              editAria={t.editSection(t.contact)}
              onEdit={locked ? undefined : () => openSection("contact")}
              focusOnOpen={interacted}
            >
              <ContactSection key={seed} locale={locale} initial={contact} serverErrors={contactErrors} onDone={onContactDone} />
            </CheckoutSection>

            <CheckoutSection
              id="checkout-delivery"
              index={2}
              title={t.delivery}
              state={stateOf("delivery")}
              summary={deliverySummary}
              editLabel={t.edit}
              editAria={t.editSection(t.delivery)}
              onEdit={locked ? undefined : () => openSection("delivery")}
              focusOnOpen={interacted}
            >
              <DeliverySection
                key={seed}
                locale={locale}
                initial={delivery}
                addresses={prefill?.addresses ?? []}
                signedIn={signedIn}
                rates={rates}
                etaByZone={etaByZone}
                afterDiscount={totals.afterDiscount}
                onGovernorateChange={onGovernorateChange}
                onDone={onDeliveryDone}
              />
            </CheckoutSection>

            <CheckoutSection
              id="checkout-payment"
              index={3}
              title={t.payment}
              state={stateOf("payment")}
              editLabel={t.edit}
              editAria={t.editSection(t.payment)}
              focusOnOpen={interacted}
            >
              <PaymentSection
                locale={locale}
                method={method}
                options={options}
                onSelect={(m) => {
                  setPaymentError(null);
                  useCheckoutStore.getState().setPaymentMethod(m);
                }}
                phone={contact.phone}
                total={totals.total}
                error={paymentError}
                processing={isProcessing}
                retry={retry}
                blocked={unavailableLines > 0}
                locked={locked}
                notice={problem?.kind === "payment_failed" ? <ProblemBanner problem={problem} t={t} onDismiss={() => setProblem(null)} /> : null}
                onPlaceOrder={handlePlaceOrder}
              />
            </CheckoutSection>
            </div>
          </div>

          {/* Desktop: sticky summary */}
          <aside aria-label={t.summary} className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-height)+1.5rem)] bg-surface p-8">
              <OrderSummaryPanel {...summaryProps} idPrefix="d" />
            </div>
          </aside>
        </div>
      </div>

      <CardPaymentDialog session={card} locale={locale} onClose={handleCardClose} onComplete={handleCardComplete} />
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────── */

function ProblemBanner({ problem, t, onDismiss }: { problem: Problem; t: ReturnType<typeof checkoutCopy>; onDismiss: () => void }) {
  const tone = problem.kind === "error" ? noticeTone.danger : noticeTone.warning;
  const title = problem.kind === "payment_failed" ? t.paymentFailed : problem.kind === "stock" ? t.stockProblem : problem.message;
  const body = problem.kind === "payment_failed" ? t.paymentFailedBody : problem.kind === "stock" ? t.stockProblemBody : null;
  return (
    <div role="alert" className={cn("flex items-start gap-4 border px-4 py-3.5 rounded-sm", problem.kind !== "payment_failed" && "mb-8", tone)}>
      <div className="flex-1 text-sm">
        <p className="font-medium">{title}</p>
        {body ? <p className="mt-0.5 text-text-secondary">{body}</p> : null}
        {problem.kind === "stock" ? (
          <Link href="/cart" className={cn("mt-2 inline-block text-text-primary", textLink)}>
            {t.reviewBag}
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t.dismiss}
        className="-me-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-text-muted hover:text-text-primary"
      >
        <X className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function CheckoutSkeleton({ label }: { label: string }) {
  return (
    <div className="container-x pb-20 pt-6 md:pt-10" aria-busy="true" aria-label={label}>
      <div className="mx-auto max-w-[1200px]">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-8 h-12 w-56" />
        <Skeleton className="-mx-5 mt-6 h-14 md:-mx-8 lg:hidden" />
        <div className="mt-8 grid gap-x-16 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-x-24">
          <div className="flex flex-col gap-8">
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-8 w-40" />
            <div className="grid gap-5 md:grid-cols-2">
              <Skeleton className="h-[4.5rem]" />
              <Skeleton className="h-[4.5rem]" />
            </div>
            <Skeleton className="h-13 w-48" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="hidden h-[28rem] lg:block" />
        </div>
      </div>
    </div>
  );
}
