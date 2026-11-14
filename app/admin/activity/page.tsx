/* ══════════════════════════════════════════════════════════════
   Admin activity — /admin/activity
   The audit log: who changed what and when, newest first.
   Filter by area, person and date (store time); every row links
   to the thing that changed when it has a page.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { clampPage, getAuditLog, getTeam } from "@/lib/dal/admin";
import { AUDIT_ENTITIES, entityHref } from "@/lib/admin/nav";
import { fill, formatDateTime, getAdminText, type AdminText } from "@/lib/admin/i18n";
import { isOrderStatus } from "@/lib/admin/orders";
import type { AuditEntry } from "@/lib/admin/types";
import { getLocale } from "@/lib/i18n/server";
import { AdminFilterDropdown } from "../components/AdminFilterDropdown";
import { AdminPagination } from "../components/AdminPagination";
import { DataTable } from "../components/DataTable";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { AdminEmptyState, Avatar, FilterBar, PageHeader, Panel } from "../components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = getAdminText(await getLocale());
  return { title: t.shell.nav.activity };
}

function details(e: AuditEntry, t: AdminText, locale: string): string | null {
  const d = e.data;
  const A = t.activity;
  const pair = (from: string, to: string) => fill(A.detail.fromTo, { from, to });
  if (e.action === "order.status" && isOrderStatus(d.from) && isOrderStatus(d.to)) return pair(t.status[d.from], t.status[d.to]);
  if (e.action.startsWith("team.") && typeof d.to === "string") {
    return typeof d.from === "string" ? pair(A.roles[d.from] ?? d.from, A.roles[d.to] ?? d.to) : (A.roles[d.to] ?? d.to);
  }
  if (e.action.startsWith("review.") && typeof d.from === "string" && typeof d.to === "string") {
    const label = (s: string) => t.reviews.tabs[s as "pending"] ?? s;
    return pair(label(d.from), label(d.to));
  }
  if (e.action === "inventory.set" && typeof d.to === "number") {
    const sku = typeof d.sku === "string" ? `${d.sku}: ` : "";
    return `${sku}${typeof d.from === "number" ? pair(String(d.from), String(d.to)) : String(d.to)}`;
  }
  if (e.action.startsWith("promo.") && typeof d.code === "string") return d.code;
  if ((e.action.startsWith("product.") || e.action.startsWith("category.") || e.action.startsWith("collection.")) && typeof d.slug === "string") {
    return d.slug;
  }
  if (e.action === "settings.update" && Array.isArray(d.sections)) {
    const names = (d.sections as unknown[]).map((s) => t.settings.sections[s as "contact"] ?? String(s));
    return names.length ? fill(A.detail.sections, { list: names.join(locale === "ar" ? "، " : ", ") }) : null;
  }
  return null;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; actor?: string; from?: string; to?: string; page?: string }>;
}) {
  const [sp, locale, team] = await Promise.all([searchParams, getLocale(), getTeam()]);
  const t = getAdminText(locale);
  const A = t.activity;
  const page = clampPage(sp.page);
  const filters = { entity: sp.entity, actor: sp.actor, from: sp.from, to: sp.to };
  const filtered = Boolean(sp.entity || sp.actor || sp.from || sp.to);
  const { entries, totalPages } = await getAuditLog({ ...filters, page, pageSize: 30 });

  return (
    <>
      <PageHeader title={A.title} description={A.description} />
      <FilterBar
        end={
          filtered ? (
            <Link href="/admin/activity" className="hover:text-text-primary">
              {t.common.clearFilters}
            </Link>
          ) : null
        }
      >
        <AdminFilterDropdown
          param="entity"
          label={A.entity}
          defaultLabel={A.allEntities}
          options={AUDIT_ENTITIES.map((e) => ({ value: e, label: A.entities[e] ?? e }))}
        />
        <AdminFilterDropdown
          param="actor"
          label={A.actor}
          defaultLabel={A.everyone}
          options={team.filter((m) => m.hasAccount).map((m) => ({ value: m.id, label: m.name || m.email || m.id }))}
        />
        <DateRangeFilter fromLabel={A.from} toLabel={A.to} />
      </FilterBar>

      <Panel padded={false}>
        {entries.length === 0 ? (
          <AdminEmptyState icon={<History />} title={filtered ? A.emptyFiltered : A.emptyTitle} body={filtered ? undefined : A.emptyBody} />
        ) : (
          <>
            <DataTable
              caption={A.title}
              rows={entries}
              rowKey={(e) => String(e.id)}
              columns={[
                {
                  key: "when",
                  header: A.col.when,
                  cell: (e) => <span className="whitespace-nowrap tabular-nums text-text-secondary">{formatDateTime(e.createdAt, locale)}</span>,
                },
                {
                  key: "who",
                  header: A.col.who,
                  hideBelow: "md",
                  cell: (e) =>
                    e.actor ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar name={e.actor.name} email={e.actor.email} size={24} />
                        <span className="max-w-40 truncate">{e.actor.name || e.actor.email}</span>
                      </span>
                    ) : (
                      <span className="text-text-muted">{A.system}</span>
                    ),
                },
                {
                  key: "what",
                  header: A.col.what,
                  cell: (e) => {
                    const extra = details(e, t, locale);
                    return (
                      <div className="min-w-0">
                        <p className="text-text-primary">{A.actions[e.action] ?? e.action}</p>
                        {extra ? <p className="text-[0.75rem] text-text-muted">{extra}</p> : null}
                        <p className="text-[0.75rem] text-text-muted md:hidden">{e.actor ? e.actor.name || e.actor.email : A.system}</p>
                      </div>
                    );
                  },
                },
                {
                  key: "item",
                  header: A.col.item,
                  align: "end",
                  cell: (e) => {
                    const href = entityHref(e.entity, e.entityId, e.action);
                    const label = A.entities[e.entity] ?? e.entity;
                    return href ? (
                      <Link href={href} className="whitespace-nowrap text-text-secondary underline decoration-border-hover underline-offset-4 hover:text-text-primary hover:decoration-text-primary">
                        {label}
                      </Link>
                    ) : (
                      <span className="whitespace-nowrap text-text-muted">{label}</span>
                    );
                  },
                },
              ]}
            />
            {totalPages > 1 ? (
              <div className="border-t border-border">
                <AdminPagination currentPage={page} totalPages={totalPages} locale={locale} />
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </>
  );
}
