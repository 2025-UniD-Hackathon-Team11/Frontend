import { useEffect, useRef, useState } from 'react'

// Minimal Web Speech API type declarations to satisfy TS
// These are intentionally lightweight for the MVP
declare interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  // Optional event handlers for extra logging/diagnostics
  onstart?: ((this: SpeechRecognition, ev: Event) => any) | null
  onaudiostart?: ((this: SpeechRecognition, ev: Event) => any) | null
  onsoundstart?: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechstart?: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechend?: ((this: SpeechRecognition, ev: Event) => any) | null
  onsoundend?: ((this: SpeechRecognition, ev: Event) => any) | null
  onaudioend?: ((this: SpeechRecognition, ev: Event) => any) | null
  onnomatch?: ((this: SpeechRecognition, ev: Event) => any) | null
}
declare interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
declare interface SpeechRecognitionErrorEvent extends Event {
  error:
    | 'aborted'
    | 'audio-capture'
    | 'bad-grammar'
    | 'language-not-supported'
    | 'network'
    | 'no-speech'
    | 'not-allowed'
    | 'service-not-allowed'
}
declare interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
declare interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  0: SpeechRecognitionAlternative
}
declare interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

type UseSpeechRecognitionOptions = {
  lang?: string // default: "ko-KR"
  continuous?: boolean // default: false
  interimResults?: boolean // default: true
  onResult?: (text: string) => void // live interim updates
  onEnd?: (finalText: string) => void // final transcript
}

export function useSpeechRecognition(options?: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false)
  const [text, setText] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTextRef = useRef<string>('')
  const isSupportedRef = useRef<boolean>(true)
  const forcedStopRef = useRef<boolean>(false)
  const restartCountRef = useRef<number>(0)
  const restartTimerRef = useRef<number | null>(null)
  const isStartingRef = useRef<boolean>(false)
  const onEndLockRef = useRef<boolean>(false)
  const onEndUnlockTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      isSupportedRef.current = false
      return
    }
    const rec: SpeechRecognition = new SpeechRecognitionCtor()
    // Force default language to Korean; callers can still override explicitly
    rec.lang = options?.lang ?? 'ko-KR'
    rec.continuous = options?.continuous ?? false
    rec.interimResults = options?.interimResults ?? true
    rec.maxAlternatives = 1

    rec.onresult = (event: SpeechRecognitionEvent) => {
      // Accumulate final results while exposing interim (live) text
      let interim = ''
      let finalAccumulated = finalTextRef.current
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        // Debug: log raw transcript segments to inspect recognition input
        try {
          // eslint-disable-next-line no-console
          console.log('[STT:onresult]', i, transcript)
        } catch {}
        if (result.isFinal) {
          finalAccumulated += transcript
        } else {
          interim += transcript
        }
      }
      finalTextRef.current = finalAccumulated
      const combined = (finalAccumulated + (interim ? ' ' + interim : '')).trim()
      setText(combined)
      // Per spec: pass interim (live) text to onResult
      options?.onResult?.(interim)
    }

    rec.onend = () => {
      // prevent duplicate onend bursts (StrictMode/browser quirks)
      if (onEndLockRef.current) {
        try { console.log('[STT:onend] ignored (dup)') } catch {}
        return
      }
      onEndLockRef.current = true
      if (onEndUnlockTimerRef.current) window.clearTimeout(onEndUnlockTimerRef.current)
      onEndUnlockTimerRef.current = window.setTimeout(() => {
        onEndLockRef.current = false
      }, 300)
      const shouldKeepListening = (options?.continuous ?? false) && !forcedStopRef.current
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onend]', { shouldKeepListening, forcedStop: forcedStopRef.current })
      } catch {}
      if (shouldKeepListening) {
        scheduleRestart()
        return
      }
      // Finalize onEnd only when user requested stop (or non-continuous mode)
      clearRestartTimer()
      setIsListening(false)
      options?.onEnd?.(finalTextRef.current || text)
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      // Common errors: 'no-speech' | 'audio-capture' | 'not-allowed'
      // eslint-disable-next-line no-console
      console.warn('[useSpeechRecognition] error:', e.error)
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onerror] code:', e.error)
      } catch {}
      const shouldKeepListening = (options?.continuous ?? false) && !forcedStopRef.current
      if (shouldKeepListening) {
        // attempt to recover with a restart backoff
        scheduleRestart()
        return
      }
      clearRestartTimer()
      setIsListening(false)
      // If not auto-restarting (non-continuous or user forced stop), propagate end
      try {
        options?.onEnd?.('')
      } catch {}
    }

    // Extra lifecycle logs to diagnose microphone and speech flow
    rec.onstart = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onstart]')
      } catch {}
    }
    rec.onaudiostart = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onaudiostart]')
      } catch {}
    }
    rec.onsoundstart = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onsoundstart]')
      } catch {}
    }
    rec.onspeechstart = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onspeechstart]')
      } catch {}
    }
    rec.onspeechend = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onspeechend]')
      } catch {}
    }
    rec.onsoundend = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onsoundend]')
      } catch {}
    }
    rec.onaudioend = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onaudioend]')
      } catch {}
    }
    rec.onnomatch = () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onnomatch]')
      } catch {}
    }

    recognitionRef.current = rec
    return () => {
      clearRestartTimer()
      rec.onresult = null as any
      rec.onend = null as any
      rec.onerror = null as any
      if (onEndUnlockTimerRef.current) window.clearTimeout(onEndUnlockTimerRef.current)
      rec.onstart = null
      rec.onaudiostart = null
      rec.onsoundstart = null
      rec.onspeechstart = null
      rec.onspeechend = null
      rec.onsoundend = null
      rec.onaudioend = null
      rec.onnomatch = null
      try {
        rec.stop()
      } catch {}
      recognitionRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scheduleRestart = () => {
    // Exponential-ish backoff capped to ~1s
    const delay = Math.min(1000, 200 + restartCountRef.current * 200)
    restartCountRef.current += 1
    clearRestartTimer()
    try {
      // eslint-disable-next-line no-console
      console.log('[STT] scheduling restart in', delay, 'ms')
    } catch {}
    restartTimerRef.current = window.setTimeout(() => {
      if (!recognitionRef.current) return
      if (forcedStopRef.current) return
      if (isStartingRef.current) return
      try {
        isStartingRef.current = true
        recognitionRef.current.start()
        isStartingRef.current = false
        setIsListening(true)
      } catch {
        isStartingRef.current = false
      }
    }, delay)
  }

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    restartCountRef.current = 0
  }

  const start = () => {
    finalTextRef.current = ''
    forcedStopRef.current = false
    const rec = recognitionRef.current
    if (!rec) {
      console.warn('Web Speech API is not supported in this browser.')
      return
    }
    try {
      // eslint-disable-next-line no-console
      console.log('[STT:start] requesting microphone & starting recognition')
      if (isListening) {
        // eslint-disable-next-line no-console
        console.log('[STT:start] ignored, already listening')
        return
      }
      clearRestartTimer()
      setText('')
      setIsListening(true)
      rec.start()
    } catch (e) {
      // already started
    }
  }

  const stop = () => {
    const rec = recognitionRef.current
    if (rec) {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:stop] stop requested')
        // preserve accumulated text as final
        finalTextRef.current = text
        forcedStopRef.current = true
        clearRestartTimer()
        rec.stop()
      } catch {}
    }
  }

  return { isListening, text, start, stop }
}


