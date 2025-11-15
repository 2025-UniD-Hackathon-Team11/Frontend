import { Tilt } from './effects/Tilt'
import { useInView } from '../../hooks/useInView'

export function Solution() {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <section className="w-full bg-white">
      <div ref={ref} className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-medium text-ink-900">DailyFit Lecture가 바꾸는 것</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Tilt className={`rounded-xl border border-ink-300 bg-white/90 p-6 shadow-sm transition-all duration-500 hover:shadow ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <span className="inline-block h-5 w-5 rounded-md border border-ink-300" />
              일일 맞춤형 강의 조절
            </h3>
            <p className="mt-2 text-ink-500">
              오늘의 말 속도, 템포, 피로도에 맞춰<br />
              강의 방식이 달라집니다.
            </p>
          </Tilt>
          <Tilt className={`rounded-xl border border-ink-300 bg-white/90 p-6 shadow-sm transition-all duration-500 delay-100 hover:shadow ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <span className="inline-block h-5 w-5 rounded-md border border-ink-300" />
              듣고 반응하는 AI 교수자
            </h3>
            <p className="mt-2 text-ink-500">
              질문하면 즉시 멈추고<br />
              귀 기울여 듣는 아바타.
            </p>
          </Tilt>
          <Tilt className={`rounded-xl border border-ink-300 bg-white/90 p-6 shadow-sm transition-all duration-500 delay-200 hover:shadow ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <span className="inline-block h-5 w-5 rounded-md border border-ink-300" />
              맥락 기반 답변 + 자연스러운 이어가기
            </h3>
            <p className="mt-2 text-ink-500">
              지금 보고 있던 강의를 기반으로<br />
              LLM이 설명하고 자연스럽게 이어갑니다.
            </p>
          </Tilt>
        </div>
      </div>
    </section>
  )
}


