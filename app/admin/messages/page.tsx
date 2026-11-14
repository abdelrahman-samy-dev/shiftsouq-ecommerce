/* ══════════════════════════════════════════════════════════════
   Admin messages — /admin/messages
   Contact-form messages, newest first: inbox / unread / archived.
   Two panes on desktop (list + reading pane), one at a time on
   phones. Reply by e-mail, mark read / unread, archive.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MailOpen } from "lucide-react";
import { z } from "zod";
import { clampPage, getContactMessage, getContactMessages } from "@/lib/dal/admin";
import type { InboxView } from "@/lib/admin/types";
import { fill, formatDateTime, formatInt, getAdminText } from "@/lib/admin/i18n";
import { getLocale } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { AdminPagination } from "../components/AdminPagination";
import { AdminEmptyState, Avatar, PageHeader, TabsNav } from "../components/ui";
import { MessageActions } from "./MessageActions";

export async function generateMetadata(): Promise<Metadata> {
  const t = getAdminText(await getLocale());
  return { title: t.shell.nav.messages };
}

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
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const t = getAdminText(locale);
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

  return (
    <>
      <PageHeader title={t.inbox.title} description={fill(t.inbox.description, { count: formatInt(count, locale) })} />
      <TabsNav
        label={t.inbox.title}
        className="mb-4"
        tabs={VIEWS.map((v) => ({ href: href({ view: v, page: 1, id: null }), label: t.inbox[v], current: v === view }))}
      />

      <div className="grid grid-cols-1 overflow-hidden rounded-[4px] border border-border bg-surface-elevated lg:min-h-[32rem] lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        {/* ── List ─────────────────────────────────────────── */}
        <section aria-label={t.inbox[view]} className={cn("min-w-0 border-border lg:border-e", selected && "hidden lg:block")}>
          {messages.length === 0 ? (
            <AdminEmptyState icon={<Inbox />} title={view === "archived" ? t.inbox.emptyArchived : t.inbox.empty} />
          ) : (
            <ul className="divide-y divide-border">
              {messages.map((m) => {
                const current = m.id === selected?.id;
                return (
                  <li key={m.id}>
                    <Link
                      href={href({ id: m.id })}
                      aria-current={current ? "true" : undefined}
                      className={cn(
                        "relative block px-4 py-3.5 transition-colors sm:px-5",
                        current ? "bg-surface" : "hover:bg-surface/60",
                        current && "before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-text-primary",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn("flex min-w-0 items-center gap-2 text-[0.8125rem]", m.is_read ? "text-text-secondary" : "font-medium text-text-primary")}>
                          {!m.is_read ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-accent">
                              <span className="sr-only">{t.inbox.newBadge}</span>
                            </span>
                          ) : null}
                          <span className="truncate">{m.name}</span>
                        </span>
                        <span className="shrink-0 text-[0.6875rem] tabular-nums text-text-faint">{formatDateTime(m.created_at, locale)}</span>
                      </div>
                      <p className={cn("mt-0.5 truncate text-[0.8125rem]", m.is_read ? "text-text-muted" : "text-text-primary")}>{m.subject}</p>
                      <p className="mt-0.5 truncate text-[0.75rem] text-text-faint">{m.message}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {totalPages > 1 ? (
            <div className="border-t border-border">
              <AdminPagination currentPage={page} totalPages={totalPages} locale={locale} />
            </div>
          ) : null}
        </section>

        {/* ── Reading pane ─────────────────────────────────── */}
        <section aria-label={selected ? selected.subject : t.inbox.pick} className={cn("min-w-0", !selected && "hidden lg:block")}>
          {selected ? (
            <article className="p-5 sm:p-8">
              <Link href={href({ id: null })} className="mb-5 inline-flex items-center gap-1.5 text-[0.8125rem] text-text-muted hover:text-text-primary lg:hidden">
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3.5 5.5 8l4.5 4.5" />
                </svg>
                {t.inbox.back}
              </Link>
              <h2 className="text-[1.25rem] font-medium leading-snug text-text-primary break-words">{selected.subject}</h2>
              <div className="mt-4 flex items-center gap-3 border-b border-border pb-5">
                <Avatar name={selected.name} email={selected.email} size={36} />
                <div className="min-w-0 text-[0.8125rem]">
                  <p className="truncate text-text-primary">
                    {selected.name} <bdi className="text-text-muted" dir="ltr">&lt;{selected.email}&gt;</bdi>
                  </p>
                  <p className="text-[0.75rem] text-text-muted">
                    {t.inbox.received} {formatDateTime(selected.created_at, locale)}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap break-words py-6 text-[0.9375rem] leading-relaxed text-text-primary">{selected.message}</p>
              {!SAFE_EMAIL.test(selected.email) ? <p className="mb-4 text-[0.75rem] text-warning">{t.inbox.invalidEmail}</p> : null}
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
            <AdminEmptyState icon={<MailOpen />} title={t.inbox.pick} className="h-full justify-center" />
          )}
        </section>
      </div>
    </>
  );
}
