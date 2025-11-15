import { Hero } from '../components/landing/Hero'
import { Problem } from '../components/landing/Problem'
import { Solution } from '../components/landing/Solution'
import { HowItWorks } from '../components/landing/HowItWorks'
import { Demo } from '../components/landing/Demo'
import { Vision } from '../components/landing/Vision'
import { Footer } from '../components/landing/Footer'
import { Navbar } from '../components/landing/Navbar'
import { ScrollProgress } from '../components/landing/effects/ScrollProgress'

export function LandingPage() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <div className="h-10 bg-black" />
      <div className="h-[100dvh] snap-y snap-mandatory overflow-y-auto">
        <section className="snap-start min-h-[100dvh]">
          <main className="min-h-[100dvh] bg-gradient-to-b from-white via-white to-mist-50 text-ink-900">
            <Hero />
          </main>
        </section>
        <section className="snap-start min-h-[100dvh] flex items-center">
          <div className="mx-auto max-w-6xl px-6 w-full">
            <div className="rounded-2xl border border-ink-300/70 bg-white/70 p-2 sm:p-4 shadow-sm ring-1 ring-black/0">
              <Problem />
            </div>
          </div>
        </section>
        <section className="snap-start min-h-[100dvh] flex items-center">
          <div className="mx-auto max-w-6xl px-6 w-full">
            <div className="rounded-2xl border border-ink-300/70 bg-white/70 p-2 sm:p-4 shadow-sm">
              <Solution />
            </div>
          </div>
        </section>
        <section className="snap-start min-h-[100dvh] flex items-center">
          <div className="mx-auto max-w-6xl px-6 w-full">
            <div className="rounded-2xl border border-ink-300/70 bg-white/70 p-2 sm:p-4 shadow-sm">
              <HowItWorks />
            </div>
          </div>
        </section>
        <section className="snap-start min-h-[100dvh] flex items-center">
          <div className="mx-auto max-w-6xl px-6 w-full">
            <div className="rounded-2xl border border-ink-300/70 bg-white/80 p-2 sm:p-4 shadow-sm">
              <Demo />
            </div>
          </div>
        </section>
        <section className="snap-start min-h-[100dvh] flex items-center">
          <div className="mx-auto max-w-4xl px-6 w-full">
            <div className="rounded-2xl border border-ink-300/70 bg-white/90 p-2 sm:p-4 shadow-sm">
              <Vision />
            </div>
          </div>
        </section>
        <Footer />
      </div>
    </>
  )
}


