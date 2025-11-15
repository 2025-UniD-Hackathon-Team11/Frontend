import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import Navigation from '../components/landing/Navigation'
import ValueCard from '../components/landing/ValueCard'
import FeatureCard from '../components/landing/FeatureCard'
import GlassScore from '../components/landing/GlassScore'
import ScrollSnap from '../components/landing/ScrollSnap'
import { useNavigate } from 'react-router-dom'

export default function GlassHome() {
  const [activeSection, setActiveSection] = useState('hero')
  const [scrollProgress, setScrollProgress] = useState(0)
  const navigate = useNavigate()
  const sections = ['hero', 'philosophy', 'about', 'features', 'values', 'score', 'cta']

  const [heroRef, heroInView] = useInView({ threshold: 0.3 })
  const [philosophyRef, philosophyInView] = useInView({ threshold: 0.2 })
  const [aboutRef, aboutInView] = useInView({ threshold: 0.2 })
  const [featuresRef, featuresInView] = useInView({ threshold: 0.2 })
  const [valuesRef, valuesInView] = useInView({ threshold: 0.2 })
  const [scoreRef, scoreInView] = useInView({ threshold: 0.2 })
  const [ctaRef, ctaInView] = useInView({ threshold: 0.2 })

  useEffect(() => {
    if (ctaInView) setActiveSection('cta')
    else if (scoreInView) setActiveSection('score')
    else if (valuesInView) setActiveSection('values')
    else if (featuresInView) setActiveSection('features')
    else if (aboutInView) setActiveSection('about')
    else if (philosophyInView) setActiveSection('philosophy')
    else if (heroInView) setActiveSection('hero')
  }, [heroInView, philosophyInView, aboutInView, featuresInView, valuesInView, scoreInView, ctaInView])

  return (
    <>
      <div className="fixed left-0 top-0 z-40 h-0.5 w-full">
        <div className="h-full bg-black/80 transition-[width] duration-150" style={{ width: `${scrollProgress}%` }} />
      </div>
      <Navigation activeSection={activeSection} />
      <ScrollSnap
        sections={sections}
        onSectionChange={setActiveSection}
        onScrollProgress={setScrollProgress}
        snapThreshold={0.1}
        scrollDelay={200}
      >
        {/* Hero */}
        <section id="hero" ref={heroRef as any} className="snap-start min-h-[100dvh] grid place-items-center relative">
          {/* Subtle background gradients */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-[#f6f9ff] via-white to-[#f6fbff] opacity-70" />
            {/* Decorative orbs */}
            <div className="absolute -top-20 -left-10 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_60%)] blur-2xl" />
            <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.18),transparent_60%)] blur-2xl" />
            {/* Faint grid */}
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(17,24,39,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.12) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: heroInView ? 1 : 0, y: heroInView ? 0 : 30 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl rounded-3xl border border-ink-200 bg-white/80 p-10 shadow-subtle backdrop-blur relative"
          >
            {/* Logo slot (top-left inside hero card). Put your file in public/logo.svg or logo.png */}
            <div className="absolute -top-4 -left-4">
              
            </div>
            <TypedHeadline
              text={'강의에 맞추지 마세요.\n이제 강의가 당신에게 맞춥니다.'}
              start={heroInView}
              className="text-4xl md:text-5xl font-light text-ink-900 leading-[1.1]"
              containerClassName="min-h-[5.2rem] md:min-h-[6.8rem] overflow-hidden"
            />
            <p className="mt-6 text-ink-500">오늘의 나에 맞춰 조절되는 AI 강의 경험, 당신의 학습 여정에 깔끔하게 스며듭니다.</p>
            <div className="mt-8 flex gap-2">
            
            </div>
          </motion.div>
        </section>

        {/* Flow section removed by request */}

        {/* Philosophy */}
        <section id="philosophy" ref={philosophyRef as any} className="snap-start min-h-[100dvh] grid place-items-center bg-mist-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: philosophyInView ? 1 : 0, y: philosophyInView ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl px-6 text-center"
          >
            <div className="text-ink-900 text-2xl font-medium">왜 필요한가요?</div>
            <p className="mt-6 text-ink-500 whitespace-pre-line">
              같은 강의라도 매일 컨디션이 달라요.{'\n'}
              질문하려면 되돌리고 검색하느라 흐름이 끊기죠.{'\n'}
              UrunFit은 오늘의 나에게 맞춰 강의가 변화합니다.
            </p>
          </motion.div>
        </section>

        {/* About */}
        <section id="about" ref={aboutRef as any} className="snap-start min-h-[100dvh] grid place-items-center">
          <div className="mx-auto max-w-6xl px-6 w-full">
            <div className="mx-auto max-w-3xl text-center mb-8">
              <div className="text-ink-900 text-2xl font-medium">핵심 기능</div>
              <p className="mt-2 text-ink-500">
                오늘의 컨디션에 맞춰 속도를 조절하고, 질문에 즉시 반응하며, 설명이 끝난 뒤에도 자연스럽게 흐름을 이어갑니다.
              </p>
              <div className="mx-auto mt-5 h-px w-16 rounded-full bg-gradient-to-r from-brand-500/40 to-sky-400/40" />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <ValueCard icon="🕒" title="일일 맞춤 속도" description="오늘의 말 속도, 템포, 피로도에 맞게" />
              <ValueCard icon="👂" title="듣고 반응" description="질문하면 즉시 멈추고 귀 기울여 듣는 아바타" />
              <ValueCard icon="🔗" title="자연스러운 이어가기" description="맥락 기반 답변 후 끊긴 부분부터 다시" />
            </div>
            <div className="mx-auto max-w-3xl text-center mt-6">
             
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" ref={featuresRef as any} className="snap-start min-h-[100dvh] grid place-items-center bg-mist-50">
          <div className="mx-auto max-w-6xl px-6 w-full">
            <div className="mx-auto max-w-3xl text-center mb-8">
              <div className="text-ink-900 text-2xl font-medium">기술적 요소</div>
              <p className="mt-2 text-ink-500">
                STT · LLM · TTS · A‑B 브릿지 로직으로 이루어진 핵심 기술 레이어를 간결하게 구성했습니다.
              </p>
              <div className="mx-auto mt-5 h-px w-16 rounded-full bg-gradient-to-r from-brand-500/40 to-sky-400/40" />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <FeatureCard icon="🎯" title="컨디션 감지" description="말하기로 WPM 추정 → 오늘 모드 설정" />
              <FeatureCard icon="🎤" title="질문 흐름" description="Mic → STT → LLM 답변 → TTS 재생" />
              <FeatureCard icon="🧭" title="A‑B 브리지" description="freezeSec/resumeSec로 자연스럽게 연결" />
            </div>
          </div>
        </section>

        {/* Values */}
        <section id="values" ref={valuesRef as any} className="snap-start min-h-[100dvh] grid place-items-center">
          <div className="mx-auto max-w-6xl px-6 w-full">
            <div className="mx-auto max-w-3xl text-center mb-8">
              <div className="text-ink-900 text-2xl font-medium">우리가 지키는 가치</div>
              <p className="mt-2 text-ink-500">
                화면을 복잡하게 만들지 않으면서, 배움의 본질을 돋보이게 합니다.
              </p>
              <div className="mx-auto mt-5 h-px w-16 rounded-full bg-gradient-to-r from-brand-500/40 to-sky-400/40" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {/* 개인화 - flip tile */}
              <FlipTile
                number="01"
                iconBgClass="border-yellow-200 bg-yellow-50 text-yellow-600"
                icon="🧩"
                title="개인화"
                frontText=""
                backText="선호도와 난이도에 맞춰 설명 깊이·예시·속도를 조정합니다."
              />
              {/* 몰입 - flip tile */}
              <FlipTile
                number="02"
                iconBgClass="border-sky-200 bg-sky-50 text-sky-600"
                icon="🎧"
                title="몰입"
                frontText=""
                backText="WPM·집중도 징후를 바탕으로 속도와 깊이를 매일 재조정합니다."
              />
              {/* 명료성 - flip tile */}
              <FlipTile
                number="03"
                iconBgClass="border-emerald-200 bg-emerald-50 text-emerald-600"
                icon="🗣️"
                title="명료성"
                frontText=""
                backText="어렵지 않은 말로 핵심만. 불필요한 군더더기를 줄입니다."
              />
              {/* 연결성 - flip tile */}
              <FlipTile
                number="04"
                iconBgClass="border-violet-200 bg-violet-50 text-violet-600"
                icon="🔗"
                title="연결성"
                frontText=""
                backText="질문 시점 t_q에서 freezeSec/resumeSec로 자연스럽게 이어갑니다."
              />
            </div>
          </div>
        </section>

        {/* Score */}
        <section id="score" ref={scoreRef as any} className="snap-start min-h-[100dvh] grid place-items-center bg-mist-50">
          <div className="mx-auto max-w-6xl px-6 w-full">
            <div className="mx-auto max-w-3xl rounded-2xl border border-ink-300/60 bg-white/80 p-8 shadow-subtle backdrop-blur">
              <div className="text-ink-900 text-2xl font-medium">오늘의 학습 지표</div>
              <div className="mx-auto mt-3 mb-2 h-px w-16 rounded-full bg-gradient-to-r from-brand-500/40 to-sky-400/40" />
              <div className="mt-6 grid gap-6 sm:grid-cols-2 items-center">
                <div className="grid place-items-center">
                  <GlassScore score={78
                  } label="" caption="" />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-lg border border-ink-300/70 bg-white/90 px-4 py-3">
                    <div className="text-sm text-ink-500">오늘 모드</div>
                    <div className="text-sm font-semibold text-ink-900">normal</div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-ink-300/70 bg-white/90 px-4 py-3">
                    <div className="text-sm text-ink-500">권장 속도</div>
                    <div className="text-sm font-semibold text-ink-900">x1.0</div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-ink-300/70 bg-white/90 px-4 py-3">
                    <div className="text-sm text-ink-500">답변 길이</div>
                    <div className="text-sm font-semibold text-ink-900">기본</div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-ink-500 text-sm">마이크로 간단한 문장을 말하면 오늘의 학습 모드를 추정해 강의 속도와 답변 스타일을 조절합니다.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" ref={ctaRef as any} className="snap-start min-h-[100dvh] grid place-items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: ctaInView ? 1 : 0, y: ctaInView ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="text-3xl font-medium text-ink-900">오늘의 나에게 맞춘 AI 강의</div>
            <p className="mt-3 text-ink-500">마이크만 허용하면 바로 데모를 체험할 수 있어요</p>
            <div className="mt-6">
              <button className="inline-flex items-center rounded-md bg-black text-white px-6 py-3 text-sm" onClick={() => navigate('/lectures')}>
                데모 시작
              </button>
            </div>
          </motion.div>
        </section>
      </ScrollSnap>
    </>
  )
}

function TypedHeadline(props: { text: string; start: boolean; className?: string; speedMs?: number; containerClassName?: string }) {
  const { text, start, className, speedMs = 25, containerClassName } = props
  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (!start) return
    setTyped('')
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setTyped(text.slice(0, i))
      if (i >= text.length) {
        window.clearInterval(id)
      }
    }, speedMs)
    return () => window.clearInterval(id)
  }, [start, text, speedMs])
  return (
    <div className={containerClassName}>
      <h1 className={className}>
        <span style={{ whiteSpace: 'pre-line' }}>
          {start ? typed : text}
        </span>
      </h1>
    </div>
  )
}

function FlipTile(props: {
  number: string
  icon: string
  title: string
  frontText: string
  backText: string
  iconBgClass?: string
}) {
  const { number, icon, title, frontText, backText, iconBgClass } = props
  const [flipped, setFlipped] = useState(false)
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-ink-300/60 bg-white p-0 hover:-translate-y-0.5 hover:shadow-subtle transition cursor-pointer"
      style={{ perspective: 1000 }}
      onClick={() => setFlipped((v) => !v)}
      role="button"
    >
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 600ms ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: 150,
        }}
      >
        {/* front */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            position: 'relative',
            padding: 24,
          }}
        >
          <div className="absolute right-3 top-2 text-6xl sm:text-7xl font-black text-ink-200/40 select-none">
            {number}
          </div>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 grid place-items-center rounded-lg border ${iconBgClass || 'border-ink-200 bg-ink-50 text-ink-600'} text-lg`}>
              {icon}
            </div>
            <div className="text-lg font-semibold text-ink-900">{title}</div>
          </div>
          {frontText ? <p className="mt-3 text-ink-600 text-sm">{frontText}</p> : null}
        </div>
        {/* back */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'relative',
            padding: 24,
          }}
          className="grid items-center"
        >
          <div className="absolute right-3 top-2 text-6xl sm:text-7xl font-black text-ink-200/40 select-none">
            {number}
          </div>
          <div>
            <div className="text-lg font-semibold text-ink-900">{title}</div>
            <p className="mt-3 text-ink-700 text-sm">{backText}</p>
            <div className="mt-4 text-xs text-ink-500">카드를 다시 클릭하면 앞으로 돌아갑니다.</div>
          </div>
        </div>
      </div>
    </div>
  )
}


