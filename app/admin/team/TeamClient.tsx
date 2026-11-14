"use client";

/* Team page interactions (owner only): add a member, remove admin access, transfer ownership. */

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Crown, UserMinus } from "lucide-react";
import { Dialog, Spinner } from "@/components/ds";
import { addTeamMember, setTeamRole, transferOwnership } from "@/lib/actions/admin-owner";
import { errorText, fill, getAdminText } from "@/lib/admin/i18n";
import { ActionMenu } from "../components/ActionMenu";
import { adminButton } from "../components/buttons";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Panel } from "../components/ui";

const fieldClass =
  "h-10 w-full rounded-[3px] border border-border bg-background px-3 text-[0.8125rem] text-text-primary placeholder:text-text-faint outline-none transition-[border-color,box-shadow] hover:border-border-hover focus:border-text-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--text-primary)_12%,transparent)] aria-[invalid=true]:border-destructive pointer-coarse:h-11";

export function MemberActions({
  locale,
  member,
}: {
  locale: string;
  member: { id: string; name: string; email: string | null; hasAccount: boolean };
}) {
  const t = getAdminText(locale);
  const T = t.team;
  const [transferOpen, setTransferOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const confirmId = useId();
  const expected = (member.email ?? "").toLowerCase();

  const transfer = () =>
    startTransition(async () => {
      const res = await transferOwnership(member.id);
      if (res.ok) {
        toast.success(T.transferred);
        setTransferOpen(false);
      } else toast.error(errorText(T.error, res.error));
    });

  return (
    <>
      <ActionMenu
        label={fill(t.common.rowActions, { name: member.name })}
        items={[
          ...(member.hasAccount && member.email
            ? [
                {
                  type: "button" as const,
                  label: T.transfer,
                  icon: <Crown aria-hidden="true" strokeWidth={1.75} />,
                  onSelect: () => {
                    setTyped("");
                    setTransferOpen(true);
                  },
                },
                { type: "separator" as const },
              ]
            : []),
          {
            type: "action",
            label: T.remove,
            tone: "danger",
            icon: <UserMinus aria-hidden="true" strokeWidth={1.75} />,
            action: setTeamRole.bind(null, member.id, "customer"),
            success: T.removed,
            errors: T.error,
            confirm: {
              title: fill(T.removeTitle, { name: member.name }),
              body: T.removeBody,
              confirmLabel: T.remove,
              cancelLabel: t.common.cancel,
            },
          },
        ]}
      />
      <ConfirmDialog
        open={transferOpen}
        title={fill(T.transferTitle, { name: member.name })}
        body={T.transferBody}
        confirmLabel={T.transfer}
        cancelLabel={t.common.cancel}
        tone="warning"
        pending={pending}
        confirmDisabled={typed.trim().toLowerCase() !== expected}
        onCancel={() => setTransferOpen(false)}
        onConfirm={transfer}
      >
        <label htmlFor={confirmId} className="mb-1.5 block text-[0.8125rem] text-text-secondary">
          {fill(T.transferType, { email: member.email ?? "" })}
        </label>
        <input
          id={confirmId}
          type="email"
          dir="ltr"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className={fieldClass}
        />
      </ConfirmDialog>
    </>
  );
}

export function AddMemberForm({ locale }: { locale: string }) {
  const t = getAdminText(locale);
  const A = t.team.add;
  const emailId = useId();
  const nameId = useId();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addTeamMember(email, name);
      if (!res.ok) {
        setError(errorText(t.team.error, res.error));
        return;
      }
      if (res.created) setCreated({ email: email.trim().toLowerCase(), password: res.tempPassword });
      else toast.success(fill(A.added, { email: email.trim() }));
      setEmail("");
      setName("");
    });
  };

  return (
    <Panel title={A.title} description={A.desc}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-[0.8125rem] text-text-secondary">
            {A.email}
          </label>
          <input
            id={emailId}
            type="email"
            dir="ltr"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${emailId}-error` : undefined}
            className={fieldClass}
          />
          {error ? (
            <p id={`${emailId}-error`} role="alert" className="text-[0.75rem] text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-[0.8125rem] text-text-secondary">
            {A.name}
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            aria-describedby={`${nameId}-hint`}
            className={fieldClass}
          />
          <p id={`${nameId}-hint`} className="text-[0.75rem] text-text-muted">
            {A.nameHint}
          </p>
        </div>
        <button type="submit" disabled={pending || !email.trim()} className={adminButton("primary", "sm")}>
          {pending ? <Spinner /> : null}
          {A.submit}
        </button>
      </form>

      {created ? (
        <Dialog open onClose={() => setCreated(null)} title={A.createdTitle} closeLabel={t.common.close}>
          <p className="text-[0.875rem] leading-relaxed text-text-secondary">{fill(A.createdBody, { email: created.email })}</p>
          <div className="mt-4 flex items-center gap-2">
            <code dir="ltr" className="flex-1 select-all rounded-[3px] border border-border bg-background px-3 py-2.5 font-mono text-[0.9375rem] tracking-wide">
              {created.password}
            </code>
            <button
              type="button"
              className={adminButton("outline", "md")}
              onClick={() => void navigator.clipboard?.writeText(created.password).then(() => toast.success(A.copied))}
            >
              <Copy aria-hidden="true" strokeWidth={1.75} />
              {A.copy}
            </button>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" className={adminButton("primary", "md")} onClick={() => setCreated(null)}>
              {A.done}
            </button>
          </div>
        </Dialog>
      ) : null}
    </Panel>
  );
}
