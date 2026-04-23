export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-72 rounded-lg bg-muted" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Chart + form */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="h-4 w-40 rounded bg-muted mb-4" />
          <div className="h-48 w-full rounded-lg bg-muted" />
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
