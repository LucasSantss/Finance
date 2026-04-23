export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg bg-muted" />
        <div className="h-4 w-72 rounded-lg bg-muted" />
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="h-6 w-32 rounded-lg bg-muted" />
        <div className="h-9 w-9 rounded-lg bg-muted" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-3">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-8 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Transaction list */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
