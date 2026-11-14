"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Package, Settings, LogOut, ChevronDown } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

interface UserProfileDropdownProps {
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  dict: {
    profile?: string;
    orders?: string;
    settings?: string;
    logout?: string;
    myAccount?: string;
  };
}

export function UserProfileDropdown({ user, dict }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user.email.split("@")[0];

  const initials = user.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] || ""}`.toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center gap-2.5 h-[46px] px-3 group cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        id="user-profile-dropdown-trigger"
      >
        {/* Avatar */}
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={displayName}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-surface-elevated"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center text-white dark:text-black text-xs font-bold shadow-inner">
            {initials}
          </div>
        )}

        {/* Name - hidden on smaller screens */}
        <span className="hidden xl:block text-sm font-semibold text-text-secondary max-w-[100px] truncate">
          {displayName}
        </span>

        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`text-text-faint transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`dropdown-panel absolute top-full end-0 mt-2 w-64 z-50 transition-all duration-200 ltr:origin-top-right rtl:origin-top-left ${isOpen
          ? "opacity-100 scale-100 visible translate-y-0"
          : "opacity-0 scale-95 invisible -translate-y-2"
          }`}
        role="menu"
        aria-orientation="vertical"
        id="user-profile-dropdown-menu"
      >
        {/* User Info Header */}
        <div className="px-4 py-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={displayName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-surface-elevated"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center text-white dark:text-black text-sm font-bold shadow-inner">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">
                {displayName}
              </p>
              <p className="text-xs text-text-muted truncate" dir="ltr">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
            role="menuitem"
          >
            <User size={18} strokeWidth={1.8} className="text-text-faint" />
            {dict.profile || "My Profile"}
          </Link>

          <Link
            href="/orders"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
            role="menuitem"
          >
            <Package size={18} strokeWidth={1.8} className="text-text-faint" />
            {dict.orders || "My Orders"}
          </Link>

          <Link
            href="/profile#password"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
            role="menuitem"
          >
            <Settings size={18} strokeWidth={1.8} className="text-text-faint" />
            {dict.settings || "Settings"}
          </Link>
        </div>

        {/* Logout */}
        <div className="border-t border-border py-2">
          <form action={logoutAction}>
            <button
              type="submit"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive-bg transition-colors cursor-pointer"
              role="menuitem"
            >
              <LogOut size={18} strokeWidth={1.8} className="rtl:-scale-x-100" />
              {dict.logout || "Logout"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
