export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg bg-muted" />
        <div className="h-4 w-72 rounded-lg bg-muted" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-4">
            <div className="h-5 w-36 rounded bg-muted" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-10 w-full rounded-lg bg-muted" />
            ))}
            <div className="h-10 w-full rounded-lg bg-muted" />
            <div className="space-y-2">
              {[...Array(2)].map((_, k) => (
                <div key={k} className="rounded-lg border border-border p-3 flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted" />
                  </div>
                  <div className="h-5 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
