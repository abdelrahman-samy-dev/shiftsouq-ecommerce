"use client";

import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Copy, Loader2, Mail, MailOpen, Reply } from "lucide-react";
import { setMessageArchived, setMessageRead } from "@/lib/actions/admin";
import { getAdminText } from "@/lib/admin/i18n";

/** Buttons for one open message. Opening an unread message marks it read once. */
export function MessageActions({
  id,
  isRead,
  isArchived,
  email,
  replyHref,
  locale,
}: {
  id: string;
  isRead: boolean;
  isArchived: boolean;
  email: string;
  replyHref: string | null;
  locale: string;
}) {
  const t = getAdminText(locale).inbox;
  const [isPending, startTransition] = useTransition();
  const autoMarked = useRef<string | null>(null);

  // Opening a message counts as reading it (a POST through the server action, not a GET side effect).
  useEffect(() => {
    if (isRead || autoMarked.current === id) return;
    autoMarked.current = id;
    void setMessageRead(id, true);
  }, [id, isRead]);

  const run = (fn: () => Promise<{ ok: boolean }>, success?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(t.error);
      else if (success) toast.success(success);
    });

  const btn =
    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {replyHref ? (
        <a
          href={replyHref}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity"
        >
          <Reply size={16} className={locale === "ar" ? "-scale-x-100" : ""} /> {t.reply}
        </a>
      ) : (
        <button
          type="button"
          className={btn}
          onClick={() => {
            void navigator.clipboard?.writeText(email).then(() => toast.success(t.copied));
          }}
        >
          <Copy size={16} /> {t.copy}
        </button>
      )}
      <button type="button" className={btn} disabled={isPending} onClick={() => run(() => setMessageRead(id, !isRead))}>
        {isRead ? <Mail size={16} /> : <MailOpen size={16} />}
        {isRead ? t.markUnread : t.markRead}
      </button>
      <button
        type="button"
        className={btn}
        disabled={isPending}
        onClick={() => run(() => setMessageArchived(id, !isArchived), isArchived ? t.restoredToast : t.archivedToast)}
      >
        {isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
        {isArchived ? t.unarchive : t.archive}
      </button>
      {isPending && <Loader2 size={18} className="animate-spin text-zinc-400" />}
    </div>
  );
}
