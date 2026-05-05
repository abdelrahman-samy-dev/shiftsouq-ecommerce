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
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getNavCategories } from "@/lib/dal/categories";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { SearchBar } from "./SearchBar";
import { HeaderActions } from "./HeaderActions";
import { Locale } from "@/lib/types";
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
async function AuthSection({
  locale,
  dict,
}: {
  locale: Locale;
  dict: any;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginStr = dict.common?.login || "Login";

  const userData = user
    ? {
        email: user.email || "",
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        avatarUrl: user.user_metadata?.avatar_url || "",
      }
    : null;

  const profileDict = {
    profile: dict.common?.profile || "My Profile",
    orders: dict.common?.ordersAndReturns || "My Orders",
    settings: dict.common?.settings || "Settings",
    logout: dict.common?.logout || "Logout",
    myAccount: dict.common?.myAccount || "My Account",
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
      <span>{loginStr}</span>
    </Link>
  );
}

/**
 * Skeleton fallback shown while the auth section loads.
 * Renders a login button placeholder to prevent layout shift.
 */
function AuthFallback({ locale }: { locale: Locale }) {
  return (
    <Link href="/login" className="btn-secondary hidden lg:flex h-[46px]">
      <span>{locale === "ar" ? "تسجيل الدخول" : "Login"}</span>
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
  dict: any;
  categories: any[];
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
    searchPlaceholder: dict.common?.search || "Type product name",
    searchAll: dict.common?.searchAll || "All",
    noResults: dict.search?.noResults || "No results found",
    products: dict.search?.products || "Products",
    categoriesLabel: dict.search?.categories || "Categories",
    viewAllResults: dict.search?.viewAllResults || "View all results for",
    trending: dict.search?.trending || "Trending",
    recentSearches: dict.search?.recentSearches || "Recent Searches",
    clearRecent: dict.search?.clearRecent || "Clear",
  };

  /** Flat categories for mobile menu (no sub-tree needed) */
  const flatCategories = navCategories.map((c) => ({ ...c, children: [] }));

  return (
    <header
      className="w-full sticky top-0 z-50 bg-background transition-colors duration-300 flex flex-col shadow-sm border-b border-border"
      role="banner"
    >
      {/* Main Bar */}
      <div className="max-w-7xl w-full mx-auto px-4 py-4 flex items-center justify-between gap-6 xl:gap-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex-shrink-0 flex items-center group transition-transform group-hover:scale-[1.02]"
          aria-label="ShiftSouq Home"
        >
          <Logo locale={locale} size="md" hideTextOnMobile={true} />
        </Link>

        {/* Professional Search Bar — Client Component */}
        <SearchBar
          locale={locale}
          categories={flatCategories as any}
          dict={searchDict}
        />

        {/* Actions */}
        <div className="flex items-center gap-2.5 text-text-primary">
          {/* Language & Theme Toggles */}
          <div className="hidden lg:flex items-center gap-2.5 mr-1 border-r border-border pr-3">
            <LanguageSwitcher currentLocale={locale} />
            <ThemeToggle />
          </div>

          <HeaderActions locale={locale} />

          {/* Auth: Login or Profile Dropdown — Streamed */}
          <Suspense fallback={<AuthFallback locale={locale} />}>
            <AuthSection locale={locale} dict={dict} />
          </Suspense>

          {/* Mobile Drawer */}
          <Suspense
            fallback={
              <MobileMenuDrawer
                dict={dict}
                locale={locale}
                categories={flatCategories as any}
                isLoggedIn={false}
                userName=""
                userEmail=""
              />
            }
          >
            <MobileMenuWithAuth
              dict={dict}
              locale={locale}
              categories={flatCategories as any}
            />
          </Suspense>
        </div>
      </div>

      {/* Categories Navigation Bar — dynamic from DB */}
      <nav
        className="w-full border-t border-border bg-background hidden lg:block"
        aria-label={isAr ? "فئات المنتجات" : "Product categories"}
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
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
              </Link>
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
}
