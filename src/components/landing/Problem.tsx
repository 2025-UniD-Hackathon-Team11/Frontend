import { Tilt } from './effects/Tilt'
import { useInView } from '../../hooks/useInView'

export function Problem() {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <section className="w-full bg-white">
      <div ref={ref} className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-medium text-ink-900">왜 필요한가요?</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Tilt className={`rounded-xl border border-ink-300 bg-white/90 p-6 shadow-sm transition-all duration-500 hover:shadow ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <span className="inline-block h-5 w-5 rounded-md border border-ink-300" />
              1. 같은 강의, 다른 하루
            </h3>
            <p className="mt-2 text-ink-500">
              어떤 날은 잘 되고, 어떤 날은 안 됩니다.<br />
              하지만 강의는 늘 똑같죠.
            </p>
          </Tilt>
          <Tilt className={`rounded-xl border border-ink-300 bg-white/90 p-6 shadow-sm transition-all duration-500 delay-100 hover:shadow ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <span className="inline-block h-5 w-5 rounded-md border border-ink-300" />
              2. 흐름이 끊기는 질문
            </h3>
            <p className="mt-2 text-ink-500">
              궁금하면 되돌려보고 찾고,<br />
              배움이 계속 끊깁니다.
            </p>
          </Tilt>
          <Tilt className={`rounded-xl border border-ink-300 bg-white/90 p-6 shadow-sm transition-all duration-500 delay-200 hover:shadow ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <h3 className="flex items-center gap-2 font-semibold text-ink-900">
              <span className="inline-block h-5 w-5 rounded-md border border-ink-300" />
              3. 나를 이해하지 않는 강의
            </h3>
            <p className="mt-2 text-ink-500">
              요약 서비스는 많지만<br />
              나에게 맞춰 설명해주는 강의는 없습니다.
            </p>
          </Tilt>
        </div>
      </div>
    </section>
  )
}


