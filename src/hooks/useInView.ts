import { useEffect, useRef, useState } from 'react'

export function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true)
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px', ...options }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [options])

  return { ref, inView }
}


