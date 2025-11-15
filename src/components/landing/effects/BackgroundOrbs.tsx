import { useEffect, useRef } from 'react'

type Orb = { x: number; y: number; r: number; vx: number; vy: number; color: string }

export function BackgroundOrbs() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const orbsRef = useRef<Orb[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(canvas.clientWidth * dpr)
      canvas.height = Math.floor(canvas.clientHeight * dpr)
      ctx.scale(dpr, dpr)
    }
    const initOrbs = () => {
      const colors = ['rgba(199,230,255,0.4)', 'rgba(226,242,255,0.35)', 'rgba(214,237,255,0.3)']
      const count = 10
      const arr: Orb[] = []
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      for (let i = 0; i < count; i++) {
        arr.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 60 + Math.random() * 120,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          color: colors[i % colors.length],
        })
      }
      orbsRef.current = arr
    }
    const step = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      for (const o of orbsRef.current) {
        o.x += o.vx
        o.y += o.vy
        if (o.x < -o.r) o.x = w + o.r
        if (o.x > w + o.r) o.x = -o.r
        if (o.y < -o.r) o.y = h + o.r
        if (o.y > h + o.r) o.y = -o.r
        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r)
        grad.addColorStop(0, o.color)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2)
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(step)
    }
    const onResize = () => {
      resize()
      initOrbs()
    }
    resize()
    initOrbs()
    step()
    window.addEventListener('resize', onResize)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ filter: 'blur(4px)' }}
    />
  )
}


