export function Navbar() {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-ink-300/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-black" />
          UrunFit
        </a>
        <nav className="flex items-center gap-3">
          <a href="/lectures" className="hidden text-sm text-ink-700 sm:inline-block">
            강의 목록
          </a>
          <a
            href="/lectures"
            className="inline-flex items-center rounded-md bg-black px-4 py-2 text-xs text-white"
          >
            시작하기
          </a>
        </nav>
      </div>
    </header>
  )
}


