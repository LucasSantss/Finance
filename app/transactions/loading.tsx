export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-lg bg-muted" />
        <div className="h-4 w-64 rounded-lg bg-muted" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(6)].map((_, i) => (
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
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-full rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
