export function GlassObjects() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
    >
      <div className="absolute left-6 top-6 h-40 w-40 rounded-3xl bg-white/40 backdrop-blur-md border border-white/60 shadow-lg animate-float-slow" />
      <div className="absolute bottom-10 right-10 h-52 w-52 rounded-full bg-white/30 backdrop-blur-md border border-white/60 shadow-lg animate-float" />
    </div>
  )
}


