/* ══════════════════════════════════════════════════════════════
   Header — Global Site Header
   ──────────────────────────────────────────────────────────────
   Server component that renders the sticky site header with:
   - Logo and brand
   - Search bar (client component)
   - Action buttons (wishlist, cart, auth, language, theme)
   - Category navigation bar (desktop only)
   - Mobile menu drawer

   The auth section is streamed via Suspense to avoid blocking
   the entire header while the auth check completes.

   Semantic HTML: Uses <header> and <nav> elements.
   ══════════════════════════════════════════════════════════════ */

import { Suspense } from "react";
import Link from "next/link";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { getNavCategories } from "@/lib/dal/categories";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { SearchBar } from "./SearchBar";
import { HeaderActions } from "./HeaderActions";
import type { CategoryWithChildren, Locale } from "@/lib/types";
import { MobileMenuDrawer } from "./MobileMenuDrawer";
import { createServerClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";

/* ── Auth Section (async, streamed via Suspense) ──────────── */

/**
 * Asynchronously fetches the current user session and renders
 * either the profile dropdown (logged in) or login button.
 *
 * Wrapped in Suspense at the call site so the rest of the
 * header renders immediately while auth resolves.
 */
async function AuthSection({ dict }: { dict: Dictionary }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userData = user
    ? {
        email: user.email || "",
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        avatarUrl: user.user_metadata?.avatar_url || "",
      }
    : null;

  const profileDict = {
    profile: dict.common.profile,
    orders: dict.common.ordersAndReturns,
    settings: dict.common.settings,
    logout: dict.common.logout,
    myAccount: dict.common.myAccount,
  };

  if (userData) {
    return (
      <div className="hidden lg:block">
        <UserProfileDropdown user={userData} dict={profileDict} />
      </div>
    );
  }

  return (
    <Link href="/login" className="btn-secondary hidden lg:flex h-[46px]">
      <span>{dict.common.login}</span>
    </Link>
  );
}

/**
 * Skeleton fallback shown while the auth section loads.
 * Renders a login button placeholder to prevent layout shift.
 */
function AuthFallback({ dict }: { dict: Dictionary }) {
  return (
    <Link href="/login" className="btn-secondary hidden lg:flex h-[46px]">
      <span>{dict.common.login}</span>
    </Link>
  );
}

/**
 * Mobile Menu Auth Wrapper (async, streamed via Suspense)
 * Fetches user auth state independently to keep the header non-blocking.
 */
async function MobileMenuWithAuth({
  locale,
  dict,
  categories,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: CategoryWithChildren[];
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const userName = user
    ? `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`.trim()
    : "";
  const userEmail = user?.email || "";

  return (
    <MobileMenuDrawer
      dict={dict}
      locale={locale}
      categories={categories}
      isLoggedIn={isLoggedIn}
      userName={userName}
      userEmail={userEmail}
    />
  );
}

/* ── Main Header Component ───────────────────────────────────── */

/**
 * Header — The global sticky site header.
 *
 * Data fetching: Parallelises dictionary + categories loading
 * via Promise.all for optimal performance.
 *
 * @param locale - Current display locale.
 */
export default async function Header({ locale = "en" }: { locale?: Locale }) {
  const [dict, navCategories] = await Promise.all([
    getDictionary(locale),
    getNavCategories(),
  ]);

  const isAr = locale === "ar";

  /** Search bar dictionary — extracted for SRP */
  const searchDict = {
    searchPlaceholder: dict.common.search,
    searchAll: dict.common.searchAll,
    noResults: dict.search.noResults,
    products: dict.search.products,
    categoriesLabel: dict.search.categories,
    viewAllResults: dict.search.viewAllResults,
    trending: dict.search.trending,
    recentSearches: dict.search.recentSearches,
    clearRecent: dict.search.clearRecent,
    clearSearch: dict.search.clearSearch,
    submit: dict.search.submit,
    categoryFilter: dict.search.categoryFilter,
  };

  /** Flat categories for mobile menu (no sub-tree needed) */
  const flatCategories: CategoryWithChildren[] = navCategories.map((c) => ({ ...c, children: [] }));

  return (
    <header
      className="w-full sticky top-0 z-50 bg-background transition-colors duration-300 flex flex-col shadow-sm border-b border-border"
      role="banner"
    >
      {/* Main Bar */}
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-6 xl:gap-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex-shrink-0 flex items-center group transition-transform group-hover:scale-[1.02]"
          aria-label={dict.common.homeLink}
        >
          <Logo locale={locale} size="md" hideTextOnMobile={true} />
        </Link>

        {/* Professional Search Bar — Client Component */}
        <SearchBar
          locale={locale}
          categories={flatCategories}
          dict={searchDict}
        />

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-text-primary">
          {/* Language & Theme Toggles */}
          <div className="hidden lg:flex items-center gap-2.5 me-1 border-e border-border pe-3">
            <LanguageSwitcher currentLocale={locale} />
            <ThemeToggle />
          </div>

          <HeaderActions locale={locale} />

          {/* Auth: Login or Profile Dropdown — Streamed */}
          <Suspense fallback={<AuthFallback dict={dict} />}>
            <AuthSection dict={dict} />
          </Suspense>

          {/* Mobile Drawer */}
          <Suspense
            fallback={
              <MobileMenuDrawer
                dict={dict}
                locale={locale}
                categories={flatCategories}
                isLoggedIn={false}
                userName=""
                userEmail=""
              />
            }
          >
            <MobileMenuWithAuth
              dict={dict}
              locale={locale}
              categories={flatCategories}
            />
          </Suspense>
        </div>
      </div>

      {/* Categories Navigation Bar — dynamic from DB */}
      <nav
        className="w-full border-t border-border bg-background hidden lg:block"
        aria-label={dict.common.productCategories}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-10 h-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navCategories.map((cat) => (
            <div
              key={cat.id}
              className="relative group h-full flex items-center"
            >
              <Link
                href={`/category/${cat.slug}`}
                className="text-[14px] font-semibold flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap h-full relative"
              >
                {isAr ? cat.name_ar : cat.name_en}
                <span className="absolute bottom-0 start-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform ltr:origin-left rtl:origin-right"></span>
              </Link>
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
}
