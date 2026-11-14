/* ══════════════════════════════════════════════════════════════
   Admin newsletter — /admin/newsletter
   Subscribers with search, CSV export (formula-safe) and
   unsubscribe (sets unsubscribed_at; the row is kept).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { clampPage, getNewsletterSubscribers } from "@/lib/dal/admin";
import { exportNewsletter, unsubscribeSubscriber } from "@/lib/actions/admin-ops";
import { fill, formatDate, formatInt, getAdminText } from "@/lib/admin/i18n";
import type { NewsletterView } from "@/lib/admin/types";
import { getLocale } from "@/lib/i18n/server";
import { ActionMenu } from "../components/ActionMenu";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSearchInput } from "../components/AdminSearchInput";
import { DataTable } from "../components/DataTable";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { AdminEmptyState, FilterBar, PageHeader, Panel, TabsNav, Tag } from "../components/ui";

export const metadata: Metadata = { title: "Newsletter" };

const VIEWS: NewsletterView[] = ["subscribed", "unsubscribed", "all"];

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; search?: string; page?: string }>;
}) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const t = getAdminText(locale);
  const N = t.newsletter;
  const view: NewsletterView = VIEWS.includes(sp.view as NewsletterView) ? (sp.view as NewsletterView) : "subscribed";
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const page = clampPage(sp.page);
  const { subscribers, count, totalPages, active } = await getNewsletterSubscribers({ view, search, page, pageSize: 30 });
  const exportRows = exportNewsletter.bind(null, view, search);

  const tabHref = (v: NewsletterView) => {
    const params = new URLSearchParams();
    if (v !== "subscribed") params.set("view", v);
    if (search) params.set("search", search);
    const s = params.toString();
    return `/admin/newsletter${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title={N.title}
        description={fill(N.description, { count: formatInt(active, locale) })}
        actions={<ExportCsvButton fetchData={exportRows} filename="newsletter" locale={locale} label={t.common.exportCsv} />}
      />
      <TabsNav label={N.title} className="mb-4" tabs={VIEWS.map((v) => ({ href: tabHref(v), label: N.tabs[v], current: v === view }))} />
      <FilterBar end={<span className="tabular-nums">{fill(t.common.results, { count: formatInt(count, locale) })}</span>}>
        <AdminSearchInput placeholder={N.search} className="sm:w-80" />
      </FilterBar>

      <Panel padded={false}>
        {subscribers.length === 0 ? (
          <AdminEmptyState icon={<Newspaper />} title={search ? N.noMatch : N.emptyTitle} body={search ? undefined : N.emptyBody} />
        ) : (
          <>
            <DataTable
              caption={N.title}
              rows={subscribers}
              rowKey={(s) => s.id}
              columns={[
                {
                  key: "email",
                  header: N.col.email,
                  cell: (s) => (
                    <span className="block max-w-72 truncate text-text-primary">
                      <bdi dir="ltr">{s.email}</bdi>
                    </span>
                  ),
                },
                { key: "lang", header: N.col.language, hideBelow: "sm", cell: (s) => <span className="text-text-secondary">{N.languages[s.locale] ?? s.locale}</span> },
                { key: "source", header: N.col.source, hideBelow: "lg", cell: (s) => <span className="text-text-secondary">{s.source || t.common.none}</span> },
                { key: "date", header: N.col.subscribed, hideBelow: "md", cell: (s) => <span className="whitespace-nowrap text-text-secondary">{formatDate(s.createdAt, locale)}</span> },
                {
                  key: "status",
                  header: N.col.status,
                  cell: (s) =>
                    s.unsubscribedAt ? (
                      <Tag tone="muted">{fill(N.unsubscribedOn, { date: formatDate(s.unsubscribedAt, locale) })}</Tag>
                    ) : (
                      <Tag tone="success" dot>
                        {N.active}
                      </Tag>
                    ),
                },
                {
                  key: "actions",
                  header: <span className="sr-only">{t.common.actions}</span>,
                  align: "end",
                  className: "w-12",
                  cell: (s) =>
                    s.unsubscribedAt ? null : (
                      <ActionMenu
                        label={fill(t.common.rowActions, { name: s.email })}
                        items={[
                          {
                            type: "action",
                            label: N.unsubscribe,
                            tone: "danger",
                            action: unsubscribeSubscriber.bind(null, s.id),
                            success: N.done,
                            errors: N.error,
                            confirm: {
                              title: fill(N.confirmTitle, { email: s.email }),
                              body: N.confirmBody,
                              confirmLabel: N.unsubscribe,
                              cancelLabel: t.common.cancel,
                            },
                          },
                        ]}
                      />
                    ),
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
