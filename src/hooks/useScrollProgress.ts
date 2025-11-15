import { useEffect, useState } from 'react'

export function useScrollProgress(target?: HTMLElement | null) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = target ?? document.documentElement
    function onScroll() {
      const scrollTop = window.scrollY
      const docHeight = el.scrollHeight - window.innerHeight
      const p = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.max(0, Math.min(100, p)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [target])

  return progress
}


