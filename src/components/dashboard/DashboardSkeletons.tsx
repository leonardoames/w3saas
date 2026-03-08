import { Skeleton } from "@/components/ui/skeleton";

export function KPISkeletonGrid() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 md:p-6 space-y-3">
            <Skeleton className="h-3 w-20 bg-muted/50" />
            <Skeleton className="h-7 w-28 bg-muted/50" />
            <Skeleton className="h-4 w-16 bg-muted/50" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 md:p-6 space-y-3">
            <Skeleton className="h-3 w-20 bg-muted/50" />
            <Skeleton className="h-7 w-28 bg-muted/50" />
            <Skeleton className="h-4 w-16 bg-muted/50" />
          </div>
        ))}
      </div>
    </>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 md:p-6" style={{ borderColor: 'hsla(24, 94%, 53%, 0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      <Skeleton className="h-4 w-40 bg-muted/50 mb-2" />
      <Skeleton className="h-3 w-56 bg-muted/50 mb-4" />
      <Skeleton className="h-[280px] w-full bg-muted/50 rounded-lg" />
    </div>
  );
}

export function GoalSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <Skeleton className="h-4 w-40 bg-muted/50" />
      <Skeleton className="h-2 w-full bg-muted/50" />
      <Skeleton className="h-3 w-32 bg-muted/50" />
    </div>
  );
}
