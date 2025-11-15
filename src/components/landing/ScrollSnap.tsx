import type { PropsWithChildren } from 'react'
import { useEffect, useRef } from 'react'

type Props = {
  sections: string[]
  onSectionChange?: (id: string) => void
  onScrollProgress?: (p: number) => void
  snapThreshold?: number
  scrollDelay?: number
}

export default function ScrollSnap(props: PropsWithChildren<Props>) {
  const { sections, onSectionChange, onScrollProgress, children } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      if (onScrollProgress) {
        const scrollTop = el.scrollTop
        const doc = el.scrollHeight - el.clientHeight
        const p = doc > 0 ? (scrollTop / doc) * 100 : 0
        onScrollProgress(Math.max(0, Math.min(100, p)))
      }
      if (lockRef.current) return
      const secs = sections.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
      let current = sections[0]
      let minDist = Number.POSITIVE_INFINITY
      const mid = el.scrollTop + el.clientHeight / 2
      for (let i = 0; i < secs.length; i++) {
        const r = secs[i].getBoundingClientRect()
        const top = r.top + el.scrollTop
        const center = top + r.height / 2
        const dist = Math.abs(center - mid)
        if (dist < minDist) {
          minDist = dist
          current = sections[i]
        }
      }
      onSectionChange?.(current)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [sections, onSectionChange, onScrollProgress])

  return (
    <div ref={containerRef} className="h-[100dvh] overflow-y-auto snap-y snap-mandatory">
      {children}
    </div>
  )
}


