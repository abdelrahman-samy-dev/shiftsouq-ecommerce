/* ══════════════════════════════════════════════════════════════
   Header — announcement bar, sticky header, mini-cart
   ──────────────────────────────────────────────────────────────
   Server component. Navigation comes from the DB category tree
   (lib/dal/navigation), messages and the free-delivery threshold
   from store settings. The signed-in visitor is passed down as a
   promise, so the header renders immediately and the account
   icon / menu fills in when the auth check resolves.

   Layout: a three-column grid keeps the wordmark truly centred.
     start  — menu button (<1024) / primary nav with mega menus
     centre — wordmark
     end    — search, account, wishlist, bag, language, theme
   ══════════════════════════════════════════════════════════════ */

import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getNavigation, getViewer } from "@/lib/dal/navigation";
import { getSettingsExtras } from "@/lib/dal/home";
import { getStoreSettings } from "@/lib/settings";
import type { Locale } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";
import { SearchOverlayTrigger } from "@/components/search/SearchOverlayTrigger";
import { LazyCartDrawer } from "./LazyCartDrawer";
import { AnnouncementBar } from "./AnnouncementBar";
import { HeaderFrame } from "./HeaderFrame";
import { DesktopNav } from "./DesktopNav";
import { MobileMenu } from "./MobileMenu";
import { AccountLink, AccountMenu } from "./AccountMenu";
import { BagButton, WishlistLink } from "./HeaderActions";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { shellCopy } from "./copy";
import {
  ANNOUNCEMENT_COOKIE,
  announcementKey,
  announcementMessages,
  buildMenuItems,
  categoryHref,
  navBreakpoint,
  type NavBreakpoint,
} from "./shell-rules";

const HIDE_AT: Record<NavBreakpoint, string> = { lg: "lg:hidden", xl: "xl:hidden", "2xl": "2xl:hidden" };

export default async function Header({ locale = "en" }: { locale?: Locale }) {
  const copy = shellCopy(locale);
  const [nav, settings, cookieStore, extras] = await Promise.all([getNavigation(), getStoreSettings(), cookies(), getSettingsExtras()]);
  // The home hero sets the transparent header's type colour (ink over a light photo).
  const heroTone = settings.home.hero?.image ? extras.hero.tone : "light";
  const viewer = getViewer();

  const messages = announcementMessages(settings.announcement, locale);
  const dismissKey = announcementKey(messages);
  const showBar = messages.length > 0 && cookieStore.get(ANNOUNCEMENT_COOKIE)?.value !== dismissKey;

  const items = buildMenuItems(nav, locale, {
    newIn: copy.newIn,
    collections: copy.collections,
    shopAll: copy.shopAll,
    discover: copy.discover,
    bestSellers: copy.bestSellers,
  });
  // Long category names: the inline navigation waits for a wider screen.
  const breakpoint = navBreakpoint(items);
  const topCategories = nav.categories.map((c) => ({
    href: categoryHref(c.slug),
    label: locale === "ar" ? c.name.ar : c.name.en,
  }));

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:bg-text-primary focus:px-4 focus:py-2.5 focus:text-sm focus:text-background"
      >
        {copy.skipToContent}
      </a>

      {showBar ? (
        <AnnouncementBar
          messages={messages}
          dismissKey={dismissKey}
          labels={{ region: copy.announcements, prev: copy.prevMessage, next: copy.nextMessage, dismiss: copy.dismiss }}
        />
      ) : null}

      <HeaderFrame heroTone={heroTone}>
        <div className="container-x grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex h-full min-w-0 items-center">
            <MobileMenu items={items} locale={locale} viewer={viewer} className={HIDE_AT[breakpoint]} />
            <DesktopNav items={items} label={copy.primaryNav} openLabel={copy.openSubmenu("{name}")} breakpoint={breakpoint} />
          </div>

          <Link href="/" className="flex h-full items-center justify-self-center px-2">
            <Logo locale={locale} />
            <span className="sr-only">, {copy.homeLink}</span>
          </Link>

          <div className="flex items-center justify-end gap-0.5 -me-2 lg:me-0">
            <SearchOverlayTrigger locale={locale} className="text-current! group-data-[overlay=light]/header:hover:bg-white/10 group-data-[overlay=dark]/header:hover:bg-black/5" />
            <div className="hidden lg:flex">
              <Suspense fallback={<AccountLink locale={locale} />}>
                <AccountMenu viewer={viewer} locale={locale} />
              </Suspense>
            </div>
            <WishlistLink locale={locale} />
            <BagButton locale={locale} />
            <div className="ms-2 hidden items-center gap-2 lg:flex">
              <LanguageSwitcher currentLocale={locale} />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </HeaderFrame>

      <LazyCartDrawer locale={locale} freeThreshold={settings.shipping.freeThreshold} categories={topCategories} />
    </>
  );
}
