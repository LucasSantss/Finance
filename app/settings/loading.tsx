export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg bg-muted" />
        <div className="h-4 w-60 rounded-lg bg-muted" />
      </div>

      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-4">
          <div className="h-5 w-28 rounded bg-muted" />
          {[...Array(3)].map((_, j) => (
            <div key={j} className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-40 rounded bg-muted" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
