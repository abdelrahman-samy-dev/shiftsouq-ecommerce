"use client";

import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Copy, Mail, MailOpen, Reply } from "lucide-react";
import { Spinner } from "@/components/ds";
import { setMessageArchived, setMessageRead } from "@/lib/actions/admin";
import { getAdminText } from "@/lib/admin/i18n";
import { adminButton } from "../components/buttons";

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {replyHref ? (
        <a href={replyHref} className={adminButton("primary", "sm")}>
          <Reply aria-hidden="true" className="rtl:-scale-x-100" strokeWidth={1.75} />
          {t.reply}
        </a>
      ) : (
        <button
          type="button"
          className={adminButton("outline", "sm")}
          onClick={() => {
            void navigator.clipboard?.writeText(email).then(() => toast.success(t.copied));
          }}
        >
          <Copy aria-hidden="true" strokeWidth={1.75} />
          {t.copy}
        </button>
      )}
      <button type="button" className={adminButton("outline", "sm")} disabled={isPending} onClick={() => run(() => setMessageRead(id, !isRead))}>
        {isRead ? <Mail aria-hidden="true" strokeWidth={1.75} /> : <MailOpen aria-hidden="true" strokeWidth={1.75} />}
        {isRead ? t.markUnread : t.markRead}
      </button>
      <button
        type="button"
        className={adminButton("outline", "sm")}
        disabled={isPending}
        onClick={() => run(() => setMessageArchived(id, !isArchived), isArchived ? t.restoredToast : t.archivedToast)}
      >
        {isArchived ? <ArchiveRestore aria-hidden="true" strokeWidth={1.75} /> : <Archive aria-hidden="true" strokeWidth={1.75} />}
        {isArchived ? t.unarchive : t.archive}
      </button>
      {isPending ? <Spinner className="text-text-muted" /> : null}
    </div>
  );
}
