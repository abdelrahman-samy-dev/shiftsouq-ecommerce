import { FilterBarSkeleton, PageHeaderSkeleton, TableSkeleton } from "./components/Skeletons";

/* Shown while an admin page loads: header, filters and a table outline. */
export default function AdminLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton />
    </div>
  );
}
