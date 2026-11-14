import { Skeleton } from "@/components/ds";

export default function AdminCategoriesLoading() {
  return (
    <div className="pb-16" aria-hidden="true">
      <div className="flex flex-col gap-3 border-b border-border pb-6">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex justify-end py-4">
        <Skeleton className="h-9 w-32" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-3" style={{ paddingInlineStart: i % 3 ? "2.5rem" : undefined }}>
          <Skeleton className="h-10 w-8" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="ms-auto h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}
