import DiscoverGrid from "@/components/DiscoverGrid";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">dig.art</h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5 uppercase tracking-widest">
                music discovery
              </p>
            </div>
          </div>
          <nav className="flex gap-6 text-sm text-zinc-500">
            <span className="text-amber-400 font-medium">Discover</span>
            <span className="cursor-not-allowed opacity-40">My DNA</span>
            <span className="cursor-not-allowed opacity-40">Crates</span>
            <span className="cursor-not-allowed opacity-40">DJ Prep</span>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">
            Discover
          </h2>
          <p className="text-zinc-500 mt-1">
            Fresh finds for diggers & curators. Click to preview.
          </p>
        </div>
        <DiscoverGrid />
      </div>
    </main>
  );
}
