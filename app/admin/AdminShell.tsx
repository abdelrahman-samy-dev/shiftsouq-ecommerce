"use client";

/* ══════════════════════════════════════════════════════════════
   Admin Shell — Client Component
   ──────────────────────────────────────────────────────────────
   Fixed inset-0 z-50 to cover global store header/footer.
   Features a modern sleek sidebar and a premium top header.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useTransition, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { fill, getAdminText } from "@/lib/admin/i18n";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  ChevronLeft,
  User as UserIcon,
  Moon,
  Sun,
  Globe,
  Check,
  Mail,
  Tag,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function AdminShell({
  children,
  userEmail,
  dict,
  locale,
  unreadMessages = 0,
}: {
  children: React.ReactNode;
  userEmail: string;
  dict: Dictionary;
  locale: string;
  unreadMessages?: number;
}) {
  const t = getAdminText(locale);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  
  // true only in the browser (the theme is unknown while rendering on the server)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const isRTL = locale === "ar";

  useEffect(() => {
    // Command+K listener for global search
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Close search and mobile menu on navigation (adjusting state while rendering, not in an effect)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  }

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLangOpen && langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (isNotifOpen && notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isLangOpen, isNotifOpen]);

  const switchLanguage = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    window.location.reload();
  };

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    // Search lists live on the orders and products pages; elsewhere, search orders.
    const target = pathname.startsWith("/admin/products") || pathname === "/admin/orders" ? pathname : "/admin/orders";
    if (target !== pathname) {
      for (const key of [...params.keys()]) if (key !== "search" && key !== "page") params.delete(key);
    }
    startTransition(() => {
      router.replace(`${target}?${params.toString()}`);
    });
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const navLinks = [
    { name: dict.admin?.sidebar?.dashboard || "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: dict.admin?.sidebar?.orders || "Orders", href: "/admin/orders", icon: ShoppingBag },
    { name: dict.admin?.sidebar?.products || "Products", href: "/admin/products", icon: Package },
    { name: t.nav.promos, href: "/admin/promos", icon: Tag },
    { name: t.nav.messages, href: "/admin/messages", icon: Mail, badge: unreadMessages },
  ];

  // Breadcrumbs logic
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    if (paths.length === 1 && paths[0] === "admin") {
      return [{ name: dict.admin?.sidebar?.dashboard || "Dashboard", href: "/admin" }];
    }
    return paths.map((path, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/");
      let name = path.charAt(0).toUpperCase() + path.slice(1);
      
      // Match with dictionary if possible
      if (path === "admin") name = dict.admin?.sidebar?.dashboard || "Dashboard";
      if (path === "orders") name = dict.admin?.sidebar?.orders || "Orders";
      if (path === "products") name = dict.admin?.sidebar?.products || "Products";
      if (path === "promos") name = t.nav.promos;
      if (path === "messages") name = t.nav.messages;
      if (/^[0-9a-f-]{36}$/i.test(path)) name = t.orders.order;
      
      return { name, href };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div 
      className={`fixed inset-0 z-[100] flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden ${isRTL ? 'font-arabic' : 'font-sans'}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={`fixed md:relative top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'} z-[110] md:z-50 bg-white dark:bg-[#0a0a0a] border-y-0 ${isRTL ? 'border-l' : 'border-r'} border-zinc-200 dark:border-zinc-800/80 transition-transform md:transition-all duration-300 ease-in-out flex flex-col shrink-0 w-72 md:w-20 ${
          isCollapsed ? "md:w-20" : "md:w-72"
        } ${isMobileMenuOpen ? "translate-x-0" : (isRTL ? "translate-x-full md:translate-x-0" : "-translate-x-full md:translate-x-0")}`}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center justify-between px-6 ${isCollapsed ? 'md:justify-center md:px-0' : ''} border-b border-zinc-200 dark:border-zinc-800/80 shrink-0 transition-all relative`}>
          <Link href="/admin" className="flex items-center gap-3" title={APP_NAME} onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {APP_NAME.charAt(0)}
            </div>
            {/* Desktop Full Title */}
            <div className={`flex flex-col overflow-hidden ${isCollapsed ? 'md:hidden' : ''}`}>
              <span className="text-sm font-bold leading-tight tracking-tight text-zinc-900 dark:text-white truncate">{APP_NAME}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider truncate">
                {dict.admin?.title || "Admin Panel"}
              </span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:flex absolute top-1/2 -translate-y-1/2 ${isRTL ? '-left-3' : '-right-3'} z-50 w-6 h-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white shadow-sm transition-transform hover:scale-110`}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight size={14} className={isRTL ? "rotate-180" : ""} /> : <ChevronLeft size={14} className={isRTL ? "rotate-180" : ""} />}
          </button>
        </div>

        {/* Sidebar Nav */}
        <div className={`flex-1 overflow-y-auto py-6 space-y-1 scrollbar-hide px-4 ${isCollapsed ? 'md:px-2' : ''}`}>
          <div className={`block ${isCollapsed ? 'md:hidden' : ''}`}>
            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-2">
              {dict.admin?.sidebar?.mainMenu || "Main Menu"}
            </div>
          </div>
          
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            const Icon = link.icon;
            
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`relative group flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isCollapsed ? 'md:justify-center md:gap-0 md:px-0' : ''} ${
                  isActive
                    ? "bg-gradient-to-r from-zinc-800 to-zinc-900 dark:from-zinc-100 dark:to-zinc-200 text-white dark:text-black shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {isActive && (
                  <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-1 h-5 bg-white dark:bg-black rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)] dark:shadow-[0_0_8px_rgba(0,0,0,0.5)] block ${isCollapsed ? 'md:hidden' : ''}`} />
                )}
                <Icon size={20} className={`shrink-0 ${isCollapsed ? 'md:w-5 md:h-5' : 'md:w-[18px] md:h-[18px]'} ${isActive ? "" : "opacity-80"}`} strokeWidth={isActive ? 2.5 : 2} />
                
                {/* Text */}
                <span className={`truncate block ${isCollapsed ? 'md:hidden' : ''}`}>{link.name}</span>
                {"badge" in link && link.badge ? (
                  <span className={`ms-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center ${isCollapsed ? 'md:absolute md:top-0.5 md:end-0.5 md:min-w-4 md:h-4 md:text-[9px]' : ''}`}>
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                ) : null}
                
                {/* Tooltip for collapsed desktop */}
                <div className={`absolute ${isRTL ? 'right-full mr-4' : 'left-full ml-4'} top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-zinc-800 dark:border-zinc-200 hidden ${isCollapsed ? 'md:block' : ''}`}>
                  {link.name}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-transparent shrink-0 flex flex-col gap-2 items-stretch ${isCollapsed ? 'md:items-center' : ''}`}>
          <Link
            href="/"
            className={`relative group flex items-center justify-start gap-3 px-3 w-full py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ${isCollapsed ? 'md:justify-center md:gap-0 md:px-0' : ''}`}
          >
            <LogOut size={20} className={`shrink-0 ${isCollapsed ? 'md:w-5 md:h-5' : 'md:w-[18px] md:h-[18px]'} ${isRTL ? "rotate-180" : ""}`} strokeWidth={2} />
            <span className={`truncate block ${isCollapsed ? 'md:hidden' : ''}`}>{dict.admin?.sidebar?.exitAdmin || "Exit Admin"}</span>
            
            <div className={`absolute ${isRTL ? 'right-full mr-4' : 'left-full ml-4'} top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-zinc-800 dark:border-zinc-200 hidden ${isCollapsed ? 'md:block' : ''}`}>
              {dict.admin?.sidebar?.exitAdmin || "Exit Admin"}
            </div>
          </Link>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50 dark:bg-[#000000]">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 lg:px-8 border-b border-zinc-200/80 dark:border-zinc-800/50 bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-xl sticky top-0 z-30 shrink-0 gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={`md:hidden p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${isRTL ? '-mr-2' : '-ml-2'}`}
            >
              <Menu size={20} />
            </button>
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center text-sm min-w-0">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center min-w-0">
                  {index > 0 && (
                    isRTL 
                      ? <ChevronLeft size={14} className="mx-1 sm:mx-2 text-zinc-300 dark:text-zinc-700 shrink-0" strokeWidth={3} />
                      : <ChevronRight size={14} className="mx-1 sm:mx-2 text-zinc-300 dark:text-zinc-700 shrink-0" strokeWidth={3} />
                  )}
                  <Link 
                    href={crumb.href}
                    className={`font-medium truncate max-w-[80px] sm:max-w-[120px] lg:max-w-xs ${
                      index === breadcrumbs.length - 1 
                        ? "text-zinc-900 dark:text-white" 
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
                    }`}
                    title={crumb.name}
                  >
                    {crumb.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 lg:gap-4 shrink-0">
            {/* Mobile/Tablet Search Icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="lg:hidden p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Search size={18} />
            </button>

            {/* Desktop Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`hidden lg:flex items-center justify-between w-48 lg:w-64 py-2 px-3 bg-zinc-100/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md dark:border-zinc-800 rounded-full text-sm text-zinc-500 transition-all duration-300`}
            >
              <div className="flex items-center gap-2">
                <Search size={16} />
                <span>{dict.admin?.shell?.searchPlaceholder || "Search..."}</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block mx-1"></div>

            {/* Language Switcher */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
                title="Switch Language"
              >
                <Globe size={18} />
              </button>
              {isLangOpen && (
                  <div className={`absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} w-40 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200`}>
                    <button
                      onClick={() => { switchLanguage("en"); setIsLangOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors ${locale === 'en' ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}
                    >
                      <span>English</span>
                      {locale === 'en' && <Check size={16} className="text-zinc-900 dark:text-white" />}
                    </button>
                    <button
                      onClick={() => { switchLanguage("ar"); setIsLangOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors ${locale === 'ar' ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}
                    >
                      <span className="font-arabic">العربية</span>
                      {locale === 'ar' && <Check size={16} className="text-zinc-900 dark:text-white" />}
                    </button>
                  </div>
              )}
            </div>

            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}

            {/* Notifications */}
            <div className="relative" ref={notifDropdownRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                aria-label={t.bell.title}
                className="relative p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Bell size={18} />
                {unreadMessages > 0 && (
                  <span className={`absolute top-1.5 ${isRTL ? 'left-1.5' : 'right-1.5'} w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0a0a0a]`}></span>
                )}
              </button>
              {isNotifOpen && (
                  <div className={`absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} w-80 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-white">{t.bell.title}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-1">
                        <Mail size={20} />
                      </div>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {unreadMessages > 0 ? fill(t.bell.unread, { count: unreadMessages }) : t.bell.none}
                      </span>
                      <Link
                        href="/admin/messages?view=unread"
                        onClick={() => setIsNotifOpen(false)}
                        className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:underline"
                      >
                        {t.bell.open}
                      </Link>
                    </div>
                  </div>
              )}
            </div>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block mx-1"></div>

            {/* User Profile */}
            <div className={`flex items-center gap-3 ${isRTL ? 'pr-1 sm:pr-2' : 'pl-1 sm:pl-2'}`}>
               <div className={`hidden sm:flex flex-col ${isRTL ? 'items-start' : 'items-end'} max-w-[100px] lg:max-w-[150px]`}>
                 <span className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight truncate w-full text-right" title={userEmail || "Admin"}>
                   {userEmail ? userEmail.split('@')[0] : "Admin"}
                 </span>
                 <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                   {dict.admin?.shell?.superadmin || "Superadmin"}
                 </span>
               </div>
               <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md border-2 border-white dark:border-[#0a0a0a] shrink-0">
                 <UserIcon size={16} strokeWidth={2.5} />
               </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-hide relative">
          <div className="max-w-7xl mx-auto pb-12 relative">
            {children}
          </div>
        </div>
      </main>

      {/* ── Global Search Command Palette ──────────────────────── */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[10vh] px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800">
              <Search size={20} className="text-zinc-400 shrink-0" />
              <input
                type="text"
                autoFocus
                defaultValue={searchParams.get("search")?.toString() || ""}
                onChange={onSearchChange}
                placeholder={dict.admin?.shell?.searchOverlayPlaceholder || "Search across the admin panel..."}
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 px-4 py-4 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400"
              />
              <div className="flex items-center gap-2">
                {isPending && <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />}
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                  {dict.admin?.shell?.esc || "ESC"}
                </kbd>
              </div>
            </div>
            
            <div className="p-2 overflow-y-auto max-h-[60vh] bg-zinc-50 dark:bg-black/50">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {dict.admin?.shell?.quickLinks || "Quick Links"}
              </div>
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon size={16} />
                      </div>
                      <span className="font-medium text-sm">{link.name}</span>
                      <ChevronRight size={16} className={`ml-auto text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'rotate-180' : ''}`} />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
