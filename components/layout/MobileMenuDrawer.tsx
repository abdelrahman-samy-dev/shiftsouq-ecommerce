"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, User, HelpCircle, Package, Star, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { logoutAction } from "@/lib/actions/auth";
import type { CategoryWithChildren, Locale } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";

/* ── Accordion Sub-Menu ──────────────────────────────────────── */

/**
 * Renders an expandable sub-menu with smooth height animation.
 * Uses a measured inner container + max-height transition for
 * a clean expand/collapse effect without layout jumps.
 */
function AccordionSubMenu({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        maxHeight: isOpen ? `${height}px` : "0px",
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

/* ── Main Drawer Component ───────────────────────────────────── */

export function MobileMenuDrawer({ 
  dict, 
  locale,
  categories,
  isLoggedIn = false,
  userName = "",
  userEmail = "",
}: { 
  dict: any;
  locale: Locale;
  categories: CategoryWithChildren[];
  isLoggedIn?: boolean;
  userName?: string;
  userEmail?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const isAr = locale === "ar";

  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const closeDrawer = () => setIsOpen(false);

  const initials = userName
    ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() || "U";

  return (
    <>
      <div className="lg:hidden flex items-center">
        <button 
          onClick={() => setIsOpen(true)}
          className="btn-icon"
          aria-label="Open Mobile Menu"
        >
          <Menu size={24} strokeWidth={1.8} />
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity lg:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 h-full w-[85%] max-w-[350px] bg-background z-[101] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <Logo locale={locale} size="sm" />
          <button 
            onClick={closeDrawer}
            className="p-2 -mr-2 text-text-muted hover:text-text-primary transition-colors rounded-full hover:bg-surface-elevated"
            aria-label="Close Menu"
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 px-5 flex flex-col gap-6">

          {/* User Profile Section (if logged in) */}
          {isLoggedIn && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated border border-border">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center text-white dark:text-black text-sm font-bold shadow-inner flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {userName || userEmail.split("@")[0]}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {userEmail}
                  </p>
                </div>
              </div>
              <div className="divider" />
            </>
          )}
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <LanguageSwitcher currentLocale={locale} />
            <div className="w-full">
              <ThemeToggle />
            </div>
          </div>

          <div className="divider" />

          {/* Dynamic Categories from DB */}
          <div>
            <h3 className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-3">
              {dict.common?.categories || "Categories"}
            </h3>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => {
                const hasChildren = cat.children.length > 0;
                const isExpanded = expandedCat === cat.id;

                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between">
                      <Link 
                        href={`/category/${cat.slug}`}
                        onClick={closeDrawer}
                        className="flex-1 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {isAr ? cat.name_ar : cat.name_en}
                      </Link>
                      {/* Only show expand button when there ARE sub-categories */}
                      {hasChildren && (
                        <button
                          onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                          className="p-2 text-text-faint hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-all duration-200"
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${cat.name_en}`}
                          aria-expanded={isExpanded}
                        >
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                      {/* No arrow icon rendered for items without children */}
                    </div>

                    {/* Animated Accordion Sub-Menu */}
                    {hasChildren && (
                      <AccordionSubMenu isOpen={isExpanded}>
                        <div className="pl-4 pb-2 flex flex-col gap-0.5">
                          {cat.children.map((child) => (
                            <Link
                              key={child.id}
                              href={`/category/${child.slug}`}
                              onClick={closeDrawer}
                              className="py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                            >
                              {isAr ? child.name_ar : child.name_en}
                            </Link>
                          ))}
                        </div>
                      </AccordionSubMenu>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="divider" />

          {/* User & Help */}
          <div>
            <h3 className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-3">
              {dict.common?.account || "Account & Help"}
            </h3>
            <div className="flex flex-col gap-1">
              {isLoggedIn ? (
                <>
                  <Link 
                    href="/profile"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <User size={20} className="text-text-faint" />
                    {dict.common?.profile || "My Profile"}
                  </Link>
                  <Link 
                    href="/orders"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Package size={20} className="text-text-faint" />
                    {dict.common?.ordersAndReturns || "Orders & Returns"}
                  </Link>
                  <Link 
                    href="/settings"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Settings size={20} className="text-text-faint" />
                    {dict.common?.settings || "Settings"}
                  </Link>
                  <Link 
                    href="/club"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Star size={20} className="text-text-faint" />
                    {dict.common?.joinTheClub || "Join the Club"}
                  </Link>
                  <Link 
                    href="/help"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <HelpCircle size={20} className="text-text-faint" />
                    {dict.common?.help || "Help Center"}
                  </Link>
                  <div className="divider my-1" />
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      onClick={closeDrawer}
                      className="flex items-center gap-3 py-3 w-full text-base font-medium text-destructive hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <LogOut size={20} />
                      {dict.common?.logout || "Logout"}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link 
                    href="/login"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <User size={20} className="text-text-faint" />
                    {dict.common?.login || "Login / Register"}
                  </Link>
                  <Link 
                    href="/orders"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Package size={20} className="text-text-faint" />
                    {dict.common?.ordersAndReturns || "Orders & Returns"}
                  </Link>
                  <Link 
                    href="/club"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <Star size={20} className="text-text-faint" />
                    {dict.common?.joinTheClub || "Join the Club"}
                  </Link>
                  <Link 
                    href="/help"
                    onClick={closeDrawer}
                    className="flex items-center gap-3 py-3 text-base font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <HelpCircle size={20} className="text-text-faint" />
                    {dict.common?.help || "Help Center"}
                  </Link>
                </>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
