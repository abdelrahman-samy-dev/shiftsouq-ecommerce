/* ══════════════════════════════════════════════════════════════
   Admin Messages — /admin/messages
   Contact-form messages, newest first: inbox / unread / archived,
   open one to read it, reply by email, mark read or archive.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, ArrowRight, Inbox } from "lucide-react";
import { z } from "zod";
import { clampPage, getContactMessage, getContactMessages } from "@/lib/dal/admin";
import { APP_NAME } from "@/lib/constants";
import type { Locale } from "@/lib/types";
import type { InboxView } from "@/lib/admin/types";
import { fill, formatDateTime, getAdminText } from "@/lib/admin/i18n";
import { AdminPagination } from "../components/AdminPagination";
import { MessageActions } from "./MessageActions";

export const metadata: Metadata = {
  title: `Messages | ${APP_NAME} Admin`,
};

const VIEWS: InboxView[] = ["inbox", "unread", "archived"];
const SAFE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** mailto: link with the subject and a greeting filled in; null for an address that isn't plainly valid. */
function replyLink(email: string, subject: string, name: string, locale: string): string | null {
  if (!SAFE_EMAIL.test(email)) return null; // e.g. "a@b.com?bcc=…" must not become extra recipients
  const t = getAdminText(locale).inbox;
  const params = new URLSearchParams({
    subject: fill(t.replySubject, { subject }),
    body: `${fill(t.replyGreeting, { name })}\n\n`,
  });
  // URLSearchParams encodes spaces as "+", which mail apps show literally.
  return `mailto:${email}?${params.toString().replace(/\+/g, "%20")}`;
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; id?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en") as Locale;
  const t = getAdminText(locale);
  const sp = await searchParams;
  const view: InboxView = VIEWS.includes(sp.view as InboxView) ? (sp.view as InboxView) : "inbox";
  const page = clampPage(sp.page);
  const selectedId = z.guid().safeParse(sp.id).success ? (sp.id as string) : null;

  const [{ messages, count, totalPages }, selected] = await Promise.all([
    getContactMessages({ view, page, pageSize: 20 }),
    selectedId ? getContactMessage(selectedId) : Promise.resolve(null),
  ]);

  const href = (params: { view?: InboxView; id?: string | null; page?: number }) => {
    const q = new URLSearchParams();
    const v = params.view ?? view;
    if (v !== "inbox") q.set("view", v);
    if ((params.page ?? page) > 1) q.set("page", String(params.page ?? page));
    if (params.id) q.set("id", params.id);
    const s = q.toString();
    return `/admin/messages${s ? `?${s}` : ""}`;
  };
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">{t.inbox.title}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">{fill(t.inbox.description, { count })}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={href({ view: v, page: 1, id: null })}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors whitespace-nowrap ${
              v === view
                ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent"
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {t.inbox[v]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── List ─────────────────────────────────────────── */}
        <section
          className={`lg:col-span-2 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden ${
            selected ? "hidden lg:block" : ""
          }`}
        >
          {messages.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500 flex flex-col items-center gap-3">
              <Inbox size={28} className="text-zinc-400" />
              {view === "archived" ? t.inbox.emptyArchived : t.inbox.empty}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {messages.map((m) => (
                <li key={m.id}>
                  <Link
                    href={href({ id: m.id })}
                    className={`block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors ${
                      m.id === selected?.id ? "bg-zinc-100 dark:bg-zinc-900" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`truncate text-sm ${m.is_read ? "text-zinc-700 dark:text-zinc-300" : "font-bold text-zinc-900 dark:text-white"}`}>
                        {!m.is_read && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 me-2 align-middle" aria-label={t.inbox.newBadge} />}
                        {m.name}
                      </span>
                      <span className="text-[11px] text-zinc-400 whitespace-nowrap">{formatDateTime(m.created_at, locale)}</span>
                    </div>
                    <div className={`text-sm truncate mt-0.5 ${m.is_read ? "text-zinc-500" : "text-zinc-800 dark:text-zinc-200 font-semibold"}`}>
                      {m.subject}
                    </div>
                    <div className="text-xs text-zinc-400 truncate mt-0.5">{m.message}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <AdminPagination currentPage={page} totalPages={totalPages} locale={locale} />
        </section>

        {/* ── Open message ─────────────────────────────────── */}
        <section
          className={`lg:col-span-3 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm ${
            selected ? "" : "hidden lg:block"
          }`}
        >
          {selected ? (
            <article className="p-5 sm:p-6 space-y-5">
              <Link
                href={href({ id: null })}
                className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <BackIcon size={16} /> {t.inbox.back}
              </Link>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white break-words">{selected.subject}</h2>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-zinc-500">{t.inbox.from}:</dt>
                    <dd className="font-medium text-zinc-900 dark:text-white break-all">
                      {selected.name} &lt;<span dir="ltr">{selected.email}</span>&gt;
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-zinc-500">{t.inbox.received}:</dt>
                    <dd className="text-zinc-700 dark:text-zinc-300">{formatDateTime(selected.created_at, locale)}</dd>
                  </div>
                </dl>
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words border-t border-zinc-200 dark:border-zinc-800/80 pt-5">
                {selected.message}
              </p>
              {!SAFE_EMAIL.test(selected.email) && <p className="text-xs text-amber-700 dark:text-amber-400">{t.inbox.invalidEmail}</p>}
              <MessageActions
                key={selected.id}
                id={selected.id}
                isRead={selected.is_read}
                isArchived={Boolean(selected.archived_at)}
                email={selected.email}
                replyHref={replyLink(selected.email, selected.subject, selected.name, locale)}
                locale={locale}
              />
            </article>
          ) : (
            <div className="p-12 text-center text-sm text-zinc-500">{t.inbox.pick}</div>
          )}
        </section>
      </div>
    </div>
  );
}
