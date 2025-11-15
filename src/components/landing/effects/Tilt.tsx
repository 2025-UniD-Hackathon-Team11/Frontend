import type { PropsWithChildren } from 'react'
import { useRef, useState } from 'react'

export function Tilt(props: PropsWithChildren<{ max?: number; scale?: number; className?: string }>) {
  const { children, max = 8, scale = 1.02, className } = props
  const ref = useRef<HTMLDivElement | null>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rx = (py - 0.5) * (max * 2)
    const ry = (0.5 - px) * (max * 2)
    setStyle({
      transform: `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
    })
  }
  const onLeave = () => {
    setStyle({ transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)' })
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transition: 'transform 200ms ease',
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </div>
  )
}


