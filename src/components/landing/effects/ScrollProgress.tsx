import { useScrollProgress } from '../../../hooks/useScrollProgress'

export function ScrollProgress() {
  const p = useScrollProgress()
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-30 h-0.5 w-full bg-transparent">
      <div
        className="h-full bg-black/80 transition-[width] duration-150 ease-out"
        style={{ width: `${p}%` }}
      />
    </div>
  )
}


