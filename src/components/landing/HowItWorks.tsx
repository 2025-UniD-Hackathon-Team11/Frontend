import { useEffect, useRef, useState } from 'react'
import { useInView } from '../../hooks/useInView'

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const pulseRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = pulseRef.current
    if (!el) return
    const id = window.setInterval(() => {
      el.style.opacity = '0.2'
      setTimeout(() => (el.style.opacity = '0.5'), 300)
    }, 1200)
    return () => window.clearInterval(id)
  }, [])
  return (
    <section className="w-full bg-white">
      <div ref={ref} className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-medium text-ink-900">어떻게 작동하나요?</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left: video mock with active step highlight */}
          <div className={`relative aspect-video w-full overflow-hidden rounded-xl border border-ink-300 bg-mist-100 transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 gap-1 p-3 opacity-60">
              {Array.from({ length: 72 }).map((_, i) => (
                <div key={i} className="rounded-sm bg-white/40" />
              ))}
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-500 ${step === 2 ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'radial-gradient(ellipse at 40% 60%, rgba(255,215,141,0.35), transparent 60%)' }}
            />
            <div
              className={`absolute inset-0 transition-opacity duration-500 ${step === 3 ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(145,213,255,0.35), transparent 60%)' }}
            />
          </div>
          {/* Right: avatar mock with pulse */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative h-48 w-40 rounded-2xl border border-ink-300 bg-white shadow-sm transition-transform duration-300">
              <div ref={pulseRef} className="absolute -right-2 -top-2 h-3 w-3 rounded-full bg-sky-300 opacity-50" />
              <div className="absolute left-1/2 top-6 h-14 w-14 -translate-x-1/2 rounded-full border-2 border-ink-300 bg-[#FFE7BA]" />
              <div className="absolute left-1/2 top-24 h-20 w-24 -translate-x-1/2 rounded-xl bg-mist-200 border border-ink-300" />
            </div>
            <div className="mt-6 flex gap-2">
              <button
                className={`rounded-full px-3 py-1 text-xs border ${step === 1 ? 'bg-black text-white border-black' : 'border-ink-300'}`}
                onClick={() => setStep(1)}
              >
                1
              </button>
              <button
                className={`rounded-full px-3 py-1 text-xs border ${step === 2 ? 'bg-black text-white border-black' : 'border-ink-300'}`}
                onClick={() => setStep(2)}
              >
                2
              </button>
              <button
                className={`rounded-full px-3 py-1 text-xs border ${step === 3 ? 'bg-black text-white border-black' : 'border-ink-300'}`}
                onClick={() => setStep(3)}
              >
                3
              </button>
            </div>
          </div>
        </div>
        <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <li className={`rounded-xl border border-ink-300 p-6 transition-all duration-300 ${step === 1 ? 'ring-1 ring-black/10' : ''}`}>
            <div className="font-semibold text-ink-900">1. 강의 시작</div>
            <p className="mt-2 text-ink-500">
              오늘의 컨디션에 맞춰 자동으로 조절됩니다.
            </p>
          </li>
          <li className={`rounded-xl border border-ink-300 p-6 transition-all duration-300 ${step === 2 ? 'ring-1 ring-black/10' : ''}`}>
            <div className="font-semibold text-ink-900">2. 질문하기</div>
            <p className="mt-2 text-ink-500">
              마이크를 누르면 강의가 멈추고<br />
              아바타가 귀 기울여 들어요.
            </p>
          </li>
          <li className={`rounded-xl border border-ink-300 p-6 transition-all duration-300 ${step === 3 ? 'ring-1 ring-black/10' : ''}`}>
            <div className="font-semibold text-ink-900">3. 답변 후 자연스러운 재생</div>
            <p className="mt-2 text-ink-500">
              LLM + TTS로 답변하고<br />
              끊긴 부분부터 다시 이어갑니다.
            </p>
          </li>
        </ol>
      </div>
    </section>
  )
}


