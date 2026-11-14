import { Skeleton } from "@/components/ds";

/* Loading state for policy, help and contact pages: same header and measure as LegalArticle. */
export default function ArticleSkeleton() {
  return (
    <div className="container-x py-14 md:py-20" aria-busy="true">
      <div className="border-b border-border pb-10 md:pb-14">
        <div className="flex max-w-3xl flex-col gap-5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-12 w-3/4 md:h-14" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-2/3 max-w-xl" />
        </div>
      </div>
      <div className="flex max-w-2xl flex-col gap-4 pt-10 md:pt-14 lg:ms-[calc(15rem+5rem)]">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
