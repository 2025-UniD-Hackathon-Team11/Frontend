export default function Navigation(props: { activeSection?: string }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/60 border-b border-ink-300/50 w-full">
      <div className="w-full h-14 px-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-1 text-sm font-medium text-ink-900">
          {/* Logo slot: put your file in public/logo.svg or logo.png */}
          <img
            src="/logo.svg"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            alt="UrunFit logo"
            className="h-7 w-7 object-contain"
          />
          <span className="text-base">UrunFit</span>
        </a>
        <nav className="flex items-center gap-3">
          <a href="/lectures" className="text-xs text-ink-700">강의 목록</a>
          <a
            href="/lectures"
            className="inline-flex items-center rounded-md border border-ink-300 bg-white/90 px-4 py-2 text-xs text-ink-900 hover:bg-ink-50 transition-colors"
          >
            시작하기
          </a>
        </nav>
      </div>
    </header>
  )
}


