// Settings-scoped skeleton so cross-tab settings navigation keeps the settings
// sidebar visually intact instead of falling back to the parent (auth) skeleton.

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 space-y-2">
        <div className="h-6 w-40 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-72 rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-full rounded-md bg-gray-100 animate-pulse" />
          ))}
        </aside>
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-2.5 w-24 rounded bg-gray-100 animate-pulse" />
                <div className="h-9 w-full rounded-md bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="pt-2 flex justify-end">
            <div className="h-9 w-28 rounded-lg bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
