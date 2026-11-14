import { Skeleton } from "@/components/ds";
import { FilterBarSkeleton, PageHeaderSkeleton, TableSkeleton } from "../components/Skeletons";

/* Orders list placeholder: header, queue tabs, filters, table. */
export default function OrdersLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <PageHeaderSkeleton />
      <div className="mb-4 flex h-11 items-center gap-6 border-b border-border" aria-hidden="true">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
      <FilterBarSkeleton />
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}
