// Shell-shaped skeleton that appears instantly on every (auth) navigation
// instead of freezing the old page while the new server segment renders.

export default function AuthLoading() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-56 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-80 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-gray-200 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
          >
            <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="h-7 w-16 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
                <div className="h-2.5 w-2/3 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
