export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 rounded-lg bg-muted" />
        <div className="h-4 w-56 rounded-lg bg-muted" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="h-4 w-48 rounded bg-muted mb-4" />
        <div className="h-48 w-full rounded-lg bg-muted" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="h-4 w-52 rounded bg-muted mb-4" />
        <div className="h-64 w-full rounded-lg bg-muted" />
      </div>
    </div>
  );
}
