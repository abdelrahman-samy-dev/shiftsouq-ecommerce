/* ══════════════════════════════════════════════════════════════
   Admin team — /admin/team
   The owner and admins. The owner adds admins (existing account,
   or a new one with a temporary password), removes admin access
   and transfers ownership. Admins see the list read-only.
   Server actions and database triggers enforce the same rules.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { Lock, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/auth";
import { getTeam } from "@/lib/dal/admin";
import { formatDate, formatDateTime, getAdminText } from "@/lib/admin/i18n";
import { getLocale } from "@/lib/i18n/server";
import { DataTable } from "../components/DataTable";
import { Avatar, Notice, PageHeader, Panel, Tag } from "../components/ui";
import { AddMemberForm, MemberActions } from "./TeamClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = getAdminText(await getLocale());
  return { title: t.shell.nav.team };
}

export default async function AdminTeamPage() {
  const [ctx, locale, team] = await Promise.all([getAdminContext(), getLocale(), getTeam()]);
  if (!ctx) redirect("/admin");
  const t = getAdminText(locale);
  const T = t.team;
  const owner = ctx.role === "super_admin";

  return (
    <>
      <PageHeader title={T.title} description={T.description} />
      {!owner ? (
        <Notice icon={<Lock />} title={T.ownerOnlyTitle} className="mb-6">
          {T.ownerOnlyBody}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-6 xl:grid-cols-3">
        <Panel padded={false} className="xl:col-span-2">
          <DataTable
            caption={T.title}
            rows={team}
            rowKey={(m) => m.id}
            columns={[
              {
                key: "member",
                header: T.col.member,
                cell: (m) => (
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={m.name} email={m.email} size={32} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-text-primary">
                        <span className="truncate">{m.name || m.email || T.noAccount}</span>
                        {m.id === ctx.profileId ? <Tag tone="neutral">{T.you}</Tag> : null}
                      </p>
                      <p className="truncate text-[0.75rem] text-text-muted">
                        <bdi>{m.email || T.noAccount}</bdi>
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                key: "role",
                header: T.col.role,
                cell: (m) => (m.role === "super_admin" ? <Tag tone="ink">{T.owner}</Tag> : <Tag tone="neutral">{T.admin}</Tag>),
              },
              {
                key: "last",
                header: T.col.lastSignIn,
                hideBelow: "md",
                cell: (m) => (
                  <span className="whitespace-nowrap text-text-secondary">
                    {!m.hasAccount ? T.noAccount : m.lastSignInAt ? formatDateTime(m.lastSignInAt, locale) : T.never}
                  </span>
                ),
              },
              {
                key: "joined",
                header: T.col.joined,
                hideBelow: "lg",
                cell: (m) => <span className="whitespace-nowrap text-text-secondary">{formatDate(m.joinedAt, locale)}</span>,
              },
              ...(owner
                ? [
                    {
                      key: "actions",
                      header: <span className="sr-only">{t.common.actions}</span>,
                      align: "end" as const,
                      className: "w-12",
                      cell: (m: (typeof team)[number]) =>
                        m.id === ctx.profileId || m.role === "super_admin" ? null : (
                          <MemberActions
                            locale={locale}
                            member={{ id: m.id, name: m.name || m.email || T.noAccount, email: m.email, hasAccount: m.hasAccount }}
                          />
                        ),
                    },
                  ]
                : []),
            ]}
          />
        </Panel>

        <div className="space-y-4 lg:space-y-6">
          {owner ? <AddMemberForm locale={locale} /> : null}
          <Panel title={T.rolesTitle}>
            <ul className="space-y-4 text-[0.8125rem]">
              <li className="flex gap-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-primary" strokeWidth={1.75} />
                <span>
                  <span className="block font-medium text-text-primary">{T.owner}</span>
                  <span className="text-text-muted">{T.roles.owner}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-muted" strokeWidth={1.75} />
                <span>
                  <span className="block font-medium text-text-primary">{T.admin}</span>
                  <span className="text-text-muted">{T.roles.admin}</span>
                </span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
