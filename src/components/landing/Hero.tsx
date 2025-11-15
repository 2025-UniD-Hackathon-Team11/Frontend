import { BackgroundOrbs } from './effects/BackgroundOrbs'
import { GlassObjects } from './effects/GlassObjects'
import { useInView } from '../../hooks/useInView'

export function Hero() {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <section className="relative w-full bg-white">
      <div className="absolute inset-0">
        <BackgroundOrbs />
      </div>
      <GlassObjects />
      <div ref={ref} className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36 md:py-44">
        <div className="flex">
          <span className={`inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-600 transition-all ${inView ? 'opacity-100' : 'opacity-0'}`}>
            ✨ UrunFit Beta
          </span>
        </div>
        <div className={`mx-auto mt-4 max-w-3xl rounded-3xl border border-ink-300/60 bg-white/80 p-10 shadow-subtle backdrop-blur transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <h1 className="text-4xl leading-[1.15] tracking-[-0.02em] text-ink-900 sm:text-5xl md:text-6xl font-light">
            <span className="block">강의에 맞추지 마세요.</span>
            <span className="block">이제 강의가 당신에게 맞춥니다.</span>
          </h1>
          <p className="mt-6 text-ink-500 text-base sm:text-lg">
            오늘의 나에 맞춰 조절되는 AI 강의 경험, UrunFit입니다.
          </p>
          <div className="mt-10 flex gap-3">
            <a
              href="/lectures"
              className="group relative inline-flex items-center overflow-hidden rounded-md bg-gradient-to-r from-brand-500 to-sky-400 px-5 py-3 text-sm text-white shadow-glow"
            >
              <span className="relative z-10">시작하기</span>
              <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-white/20 transition-transform duration-700 group-hover:translate-x-[120%]" />
            </a>
            <a
              href="/lectures"
              className="group relative inline-flex items-center overflow-hidden rounded-md border border-ink-300 px-5 py-3 text-sm text-ink-900"
            >
              <span className="relative z-10">데모 보기</span>
              <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-black/5 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}


