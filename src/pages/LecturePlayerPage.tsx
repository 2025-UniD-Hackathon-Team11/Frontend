import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchLectureDetail, fetchLectureMetadata, updateLectureProgress } from '../api/lectures'
import { sendQuestion } from '../api/qa'
import { AvatarProfessor } from '../components/AvatarProfessor'
import { QuestionPanel } from '../components/QuestionPanel'
import { VideoPlayer, type VideoPlayerHandle } from '../components/VideoPlayer'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import type {
  AnswerResponse,
  DailyMode,
  DifficultyMode,
  PlayerAvatarState,
  PlayerState,
} from '../types'
import { getVideoPosition } from '../api/lectures'

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

export function LecturePlayerPage() {
  const { lectureId = '' } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof fetchLectureDetail>
  > | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const videoRef = useRef<VideoPlayerHandle | null>(null)
  const [timer, setTimer] = useState(0.0);

  const [playerState, setPlayerState] = useState<PlayerState>({
    lectureId,
    videoCurrentTime: 0,
    isPlaying: false,
    avatarState: 'idle',
    dailyMode: 'normal',
    difficultyMode: 'normal',
    questionMode: null,
  })

  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([])
  const [questionTimeSec, setQuestionTimeSec] = useState<number | null>(null)
  const [, setCurrentAnswerResponse] = useState<AnswerResponse | null>(null)

  const [showOverlay, setShowOverlay] = useState<{
    startSec: number
    endSec: number
  } | null>(null)
  const [frames, setFrames] = useState<Array<{ timeSec: number; url: string; audioUrl?: string; text?: string }>>([])
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(-1)
  const frameTimerRef = useRef<number | null>(null)
  const frameAudioRef = useRef<HTMLAudioElement | null>(null)
  const [subtitle, setSubtitle] = useState<string>('')
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false)
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null)
  const [isPlayheadPaused, setIsPlayheadPaused] = useState<boolean>(false)
  const micBusyRef = useRef<boolean>(false)
  const lastOnEndTsRef = useRef<number>(0)
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const cachedOrderRef = useRef<string[]>([])
  // Calibration (오늘의 학습 상태) state
  const [showCalibration, setShowCalibration] = useState<boolean>(true)
  const [calStartAtMs, setCalStartAtMs] = useState<number | null>(null)
  const [calWpm, setCalWpm] = useState<number>(0)
  const [calMode, setCalMode] = useState<DailyMode | null>(null)
  const MIN_SPEAK_MS = 3000
  const MIN_WORDS = 4
  const WPM_TIRED_MAX = 90
  const WPM_NORMAL_MAX = 140
  const WPM_ABSURD_MAX = 1000
  const autoSkippedRef = useRef<boolean>(false)
  // Debounce for mic start/stop to avoid rapid toggle causing hook churn
  const lastMicClickRef = useRef<number>(0)
  const MIC_DEBOUNCE_MS = 300
  const micFinalizeTimerRef = useRef<number | null>(null)

  // log playhead pause/resume toggles
  useEffect(() => {
    try { console.log('[playhead] paused =', isPlayheadPaused) } catch {}
  }, [isPlayheadPaused])

  const { isListening, text, start, stop } = useSpeechRecognition({
    lang: 'ko-KR',
    // 질문 모드도 연속으로 듣고, 사용자가 종료를 눌러야만 끝내도록
    continuous: true,
    onEnd: (finalText) => {
      // Prevent double onEnd in React StrictMode
      const now = performance.now()
      if (now - lastOnEndTsRef.current < 300) {
        try { console.log('[STT:onEnd] ignored (dup)') } catch {}
        return
      }
      lastOnEndTsRef.current = now
      try { console.log('[STT:onEnd] finalText=', finalText) } catch {}
      finalizeMicQuestion(finalText)
    },
  })

  

  const finalizeMicQuestion = async (finalText: string) => {
    const question = (finalText || '').trim()
    if (question.length === 0) {
      setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
      videoRef.current?.play()
      setIsPlayheadPaused(false)
      micBusyRef.current = false
      return
    }
    if (questionTimeSec == null) {
      setQuestionTimeSec(playerState.videoCurrentTime)
    }
    setChatMessages((msgs) => [...msgs, { role: 'user', content: question }])
    setPlayerState((s) => ({ ...s, avatarState: 'thinking' }))
    videoRef.current?.pause();
    ;(async () => {
      const res = await sendQuestion({
        lectureId,
        videoTimeSec: questionTimeSec ?? playerState.videoCurrentTime,
        question,
        mode: 'mic',
        difficultyMode: playerState.difficultyMode,
        dailyMode: playerState.dailyMode,
      })
      setCurrentAnswerResponse(res)
      setChatMessages((msgs) => [...msgs, { role: 'assistant', content: res.answerText }])
      setPlayerState((s) => ({ ...s, avatarState: 'talking' }))
      let r;
      if (res.relatedFrames?.length) {
        const f = res.relatedFrames[0]
        // stoppedTime = videoRef.current?.getCurrentTime();
        // console.log(`스톱 시간: ${stoppedTime}`);
        setShowOverlay(f)
      }
      setCurrentAnswerAudioUrl(res.ttsUrl)
      await play()
      if (res.resumePlan && (questionTimeSec ?? null) != null) {
        await runBridgePhase(questionTimeSec as number, res.resumePlan)
      }
      setShowOverlay(null)
      setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
      setIsPlayheadPaused(false)
      micBusyRef.current = false
    })()
  }
  const { play, stop: stopAudio, audioRef } = useAudioPlayer()
  const [currentAnswerAudioUrl, setCurrentAnswerAudioUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    // tie url to player
    if (!currentAnswerAudioUrl) return
    // recreate audio element inside hook by updating src via ref
    const a = new Audio(currentAnswerAudioUrl)
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch {}
    }
    audioRef.current = a
    a.onended = () => {
      // noop, we chain after play() awaited above
    }
  }, [currentAnswerAudioUrl, audioRef])

  // Pause playhead while calibration is shown
  useEffect(() => {
    if (showCalibration) {
      setIsPlayheadPaused(true)
      try { frameAudioRef.current?.pause() } catch {}
    }
  }, [showCalibration])

  // Secondary STT for calibration
  const {
    isListening: isCalListening,
    text: calText,
    start: calStart,
    stop: calStop,
  } = useSpeechRecognition({
    lang: 'ko-KR',
    // Keep listening until user explicitly stops, to avoid instant onend/no-speech toggles
    continuous: true,
    onEnd: (finalText) => {
      const endMs = performance.now()
      const started = calStartAtMs ?? endMs
      const elapsedMs = Math.max(1, endMs - started)
      const totalWords = (finalText || '').trim().split(/\s+/).filter(Boolean).length
      const minutes = elapsedMs / 60000
      const wpmRaw = totalWords / (minutes || 1)
      const wpm = Number.isFinite(wpmRaw) ? wpmRaw : 0
      // Only consider autoskip for absurd values after enough speech; avoid early tiny-denominator spikes
      if (
        wpm >= WPM_ABSURD_MAX &&
        elapsedMs >= MIN_SPEAK_MS &&
        totalWords >= Math.max(2, MIN_WORDS - 1) &&
        !autoSkippedRef.current
      ) {
        autoSkippedRef.current = true
        try { console.warn('[calibration] absurd wpm detected -> autoskip', wpm) } catch {}
        startLectureAfterCalibration()
        return
      }
      let mode: DailyMode | null = null
      // Require minimum speaking time and words to reduce misclassification
      if (elapsedMs >= MIN_SPEAK_MS && totalWords >= MIN_WORDS) {
        if (wpm < WPM_TIRED_MAX) mode = 'tired'
        else if (wpm <= WPM_NORMAL_MAX) mode = 'normal'
        else mode = 'focus'
      } else {
        mode = null
      }
      setCalWpm(Math.round(wpm))
      setCalMode(mode)
      if (mode) {
        setPlayerState((s) => ({ ...s, dailyMode: mode }))
      }
      try { console.log('[calibration] end:', { wpm, mode, totalWords, elapsedMs }) } catch {}
    },
  })

  const beginCalibration = () => {
    autoSkippedRef.current = false
    setCalWpm(0)
    setCalMode(null)
    setCalStartAtMs(performance.now())
    calStart()
  }
  const finishCalibration = () => {
    calStop()
  }
  const startLectureAfterCalibration = () => {
    // If a mode is detected live, persist it before leaving
    if (calMode) {
      setPlayerState((s) => ({ ...s, dailyMode: calMode as DailyMode }))
    }
    setShowCalibration(false)
    // unlock audio after user interaction
    setAudioUnlocked(true)
    setIsPlayheadPaused(false)
  }

  // Preload multiple audios during calibration (lookahead)
  useEffect(() => {
    if (!showCalibration || !frames.length) return
    const preloadUrl = (url: string) => {
      if (!url) return
      let el = audioCacheRef.current.get(url)
      if (!el) {
        el = new Audio()
        el.preload = 'auto'
        try { (el as any).crossOrigin = null } catch {}
        el.muted = false
        el.volume = 1
        el.src = url
        el.load()
        audioCacheRef.current.set(url, el)
        cachedOrderRef.current.push(url)
        if (cachedOrderRef.current.length > 32) {
          const oldKey = cachedOrderRef.current.shift()
          if (oldKey) {
            try { audioCacheRef.current.get(oldKey)?.pause() } catch {}
            audioCacheRef.current.delete(oldKey)
          }
        }
        try { console.log('[audio] preloading(calibration):', url) } catch {}
      }
    }
    // Preload first 8 narration audios
    let count = 0
    for (let i = 0; i < frames.length && count < 8; i++) {
      const u = frames[i].audioUrl
      if (u) {
        preloadUrl(u)
        count++
      }
    }
  }, [showCalibration, frames])

  // Live WPM update during calibration based on accumulated calText
  useEffect(() => {
    if (!showCalibration) return
    if (!calStartAtMs) return
    const elapsedMs = Math.max(1, performance.now() - calStartAtMs)
    const words = (calText || '').trim().split(/\s+/).filter(Boolean).length
    const minutes = elapsedMs / 60000
    const wpmRaw = words / (minutes || 1)
    const wpm = Number.isFinite(wpmRaw) ? wpmRaw : 0
    setCalWpm(Math.round(wpm))
    if (
      wpm >= WPM_ABSURD_MAX &&
      elapsedMs >= MIN_SPEAK_MS &&
      words >= Math.max(2, MIN_WORDS - 1) &&
      !autoSkippedRef.current
    ) {
      autoSkippedRef.current = true
      try { console.warn('[calibration] absurd wpm detected (live) -> autoskip', wpm) } catch {}
      startLectureAfterCalibration()
      return
    }
    // Update suggested mode live, but do not set playerState until user confirms
    if (elapsedMs >= MIN_SPEAK_MS && words >= MIN_WORDS) {
      let liveMode: DailyMode
      if (wpm < WPM_TIRED_MAX) liveMode = 'tired'
      else if (wpm <= WPM_NORMAL_MAX) liveMode = 'normal'
      else liveMode = 'focus'
      setCalMode(liveMode)
    } else {
      setCalMode(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calText, showCalibration, calStartAtMs])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[page] LecturePlayerPage load id=', lectureId)
        const d = await fetchLectureDetail(lectureId)
        if (!mounted) return
        setDetail(d)
        const numId = Number(d.id)
        if (Number.isFinite(numId)) {
          try {
            const meta = await fetchLectureMetadata(numId)
            if (!mounted) return
            if (meta && meta.length) {
              const sorted = meta.slice().sort((a, b) => a.timeSec - b.timeSec)
              // eslint-disable-next-line no-console
              console.log('[page] metadata frames loaded:', {
                count: sorted.length,
                first5: sorted.slice(0, 5),
              })
              setFrames(sorted)
              setCurrentFrameIndex(-1) // start with poster until first start time
              setSubtitle('')
            } else {
              // eslint-disable-next-line no-console
              console.warn('[page] metadata empty for lecture', numId)
              setFrames([])
              setCurrentFrameIndex(-1)
              setSubtitle('')
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[page] metadata fetch failed:', e)
          }
        }
      } catch (e: any) {
        if (!mounted) return
        const msg = e?.message || String(e)
        setLoadError(msg)
        try {
          // eslint-disable-next-line no-console
          console.error('[page] load error:', msg)
        } catch {}
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [lectureId])
  // Drive frame switching based on an internal "playhead" timer
  useEffect(() => {
    if (!frames.length) return
    if (frameTimerRef.current) {
      window.clearInterval(frameTimerRef.current)
      frameTimerRef.current = null
    }
    // choose a base tick (500ms) and advance to the frame whose timeSec <= elapsed
    const startedAt = performance.now()
    const prevIdxRef = { current: -1 }
    frameTimerRef.current = window.setInterval(() => {
      if (isPlayheadPaused) return
      const elapsedSec = (performance.now() - startedAt) / 1000
      // Find the largest index with timeSec <= elapsedSec
      let idx = -1
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].timeSec <= elapsedSec) idx = i
        else break
      }
      // eslint-disable-next-line no-console
      console.log(
        '[page] frame-timer',
        'elapsed=', elapsedSec.toFixed(2),
        'idx=', idx,
        'frameTime=', idx >= 0 ? frames[idx]?.timeSec : null
      )
      setTimer(elapsedSec);
      if (idx !== prevIdxRef.current) {
        // eslint-disable-next-line no-console
        console.log('[page] switch frame ->', idx, idx >= 0 ? frames[idx]?.url : '(poster)')
        prevIdxRef.current = idx
      }
      setCurrentFrameIndex(idx)
    }, 500)
    return () => {
      if (frameTimerRef.current) {
        window.clearInterval(frameTimerRef.current)
        frameTimerRef.current = null
      }
    }
  }, [frames, isPlayheadPaused])

  // When frame changes, play audio (if any) and set subtitle
  useEffect(() => {
    if (currentFrameIndex < 0 || currentFrameIndex >= frames.length) {
      setSubtitle('')
      try { console.log('[page] frame-change: idx=', currentFrameIndex, 'no usable frame') } catch {}
      return
    }
    const f = frames[currentFrameIndex]
    setSubtitle(f.text ?? '')
    try {
      console.log('[page] frame-change:', {
        idx: currentFrameIndex,
        timeSec: f.timeSec,
        hasAudio: !!f.audioUrl,
        audioUrl: f.audioUrl,
        text: f.text,
      })
    } catch {}
    if (f.audioUrl) {
      try {
        const baseHost = (() => {
          try {
            if (f.audioUrl.startsWith('http')) return new URL(f.audioUrl).origin
            if (framePosterUrl && framePosterUrl.startsWith('http')) return new URL(framePosterUrl).origin
          } catch {}
          return ''
        })()
        const audioName = (() => {
          try {
            const u = new URL(f.audioUrl, baseHost || undefined)
            return u.pathname.split('/').pop() || f.audioUrl
          } catch {
            const parts = f.audioUrl.split('/')
            return parts[parts.length - 1] || f.audioUrl
          }
        })()
        const numericId = Number(detail?.id)
        const candidates: string[] = []
        try {
          candidates.push(new URL(f.audioUrl, baseHost || window.location.origin).toString())
        } catch {
          if (baseHost) candidates.push(`${baseHost}${f.audioUrl.startsWith('/') ? '' : '/'}${f.audioUrl}`)
          else candidates.push(f.audioUrl)
        }
        if (Number.isFinite(numericId) && baseHost) {
          candidates.push(`${baseHost}/api/lectures/${numericId}/audio/${audioName}`)
          candidates.push(`${baseHost}/api/lectures/${numericId}/frame/${audioName}`)
          candidates.push(`${baseHost}/${audioName}`)
        }
        // eslint-disable-next-line no-console
        console.log('[page] audio candidates:', candidates)

        // Preload next 2 audios (lookahead)
        const preloadUrl = (url: string) => {
          if (!url) return
          let el = audioCacheRef.current.get(url)
          if (!el) {
            el = new Audio()
            el.preload = 'auto'
            try { (el as any).crossOrigin = null } catch {}
            el.muted = false
            el.volume = 1
            el.src = url
            el.load()
            audioCacheRef.current.set(url, el)
            cachedOrderRef.current.push(url)
            // simple LRU trim
            if (cachedOrderRef.current.length > 24) {
              const oldKey = cachedOrderRef.current.shift()
              if (oldKey) {
                try { audioCacheRef.current.get(oldKey)?.pause() } catch {}
                audioCacheRef.current.delete(oldKey)
              }
            }
            try { console.log('[audio] preloading:', url) } catch {}
          }
        }
        // current and lookahead
        preloadUrl(candidates[0])
        const n1 = frames[currentFrameIndex + 1]?.audioUrl
        const n2 = frames[currentFrameIndex + 2]?.audioUrl
        if (n1) preloadUrl(n1)
        if (n2) preloadUrl(n2)

        const tryPlay = async (idx: number): Promise<void> => {
          if (idx >= candidates.length) {
            // eslint-disable-next-line no-console
            console.warn('[page] audio: all candidates failed')
            setPendingAudioUrl(candidates[0] || null)
            return
          }
          const url = candidates[idx]
          if (!audioUnlocked) {
            setPendingAudioUrl(url)
            try { console.log('[audio] pending (locked):', url) } catch {}
            return
          }
          let el = audioCacheRef.current.get(url)
          if (!el) {
            el = new Audio()
            el.preload = 'auto'
            try { (el as any).crossOrigin = null } catch {}
            el.muted = false
            el.volume = 1
            el.src = url
            el.load()
            audioCacheRef.current.set(url, el)
            cachedOrderRef.current.push(url)
          }
          frameAudioRef.current = el
          try { el.pause() } catch {}
          el.currentTime = 0
          // attach verbose event handlers
          el.oncanplaythrough = () => { try { console.log('[audio] canplaythrough:', el.src) } catch {} }
          el.onloadedmetadata = () => { try { console.log('[audio] loadedmetadata:', el.duration) } catch {} }
          el.onwaiting = () => { try { console.log('[audio] waiting') } catch {} }
          el.onstalled = () => { try { console.log('[audio] stalled') } catch {} }
          el.onsuspend = () => { try { console.log('[audio] suspend') } catch {} }
          el.onplay = () => { try { console.log('[audio] onplay:', el.src) } catch {} }
          el.onended = () => { try { console.log('[audio] onended:', el.src) } catch {} }
          el.onerror = (ev) => { try { console.warn('[audio] onerror:', el.src, ev) } catch {} }
          // eslint-disable-next-line no-console
          console.log('[page] try play ->', url)
          try {
            await el.play()
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[page] play() rejected for url:', url, e)
            await tryPlay(idx + 1)
          }
        }
        void tryPlay(0)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[page] audio error', e)
      }
    }
    return () => {
      // do not pause on every change; allow overlap if desired
    }
  }, [currentFrameIndex, frames])

  useEffect(() => {
    return () => {
      try {
        frameAudioRef.current?.pause()
      } catch {}
    }
  }, [])

  // On user click unlock, try to resume pending audio
  const handleUnlockAudio = () => {
    setAudioUnlocked(true)
    const tryUrl = pendingAudioUrl || (currentFrameIndex >= 0 ? frames[currentFrameIndex]?.audioUrl : null)
    if (tryUrl) {
      try {
        if (!frameAudioRef.current) {
          frameAudioRef.current = new Audio()
        }
        const el = frameAudioRef.current
        if (!el.onplay) el.onplay = () => { try { console.log('[audio] onplay:', el.src) } catch {} }
        if (!el.onpause) el.onpause = () => { try { console.log('[audio] onpause:', el.src) } catch {} }
        if (!el.onended) el.onended = () => { try { console.log('[audio] onended:', el.src) } catch {} }
        if (!el.onerror) el.onerror = (ev) => { try { console.warn('[audio] onerror:', el.src, ev) } catch {} }
        el.preload = 'auto'
        el.crossOrigin = 'anonymous'
        el.muted = false
        el.volume = 1
        frameAudioRef.current.src = tryUrl
        frameAudioRef.current.currentTime = 0
        try { console.log('[audio] unlock play ->', tryUrl) } catch {}
        void frameAudioRef.current.play().catch((e) => { try { console.warn('[audio] unlock play failed', e) } catch {} })
        setPendingAudioUrl(null)
      } catch {}
    }
  }


  // progress persistence every 5s
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!playerState.lectureId) return
      updateLectureProgress(playerState.lectureId, playerState.videoCurrentTime)
    }, 5000)
    return () => window.clearInterval(id)
  }, [playerState.lectureId, playerState.videoCurrentTime])

  useEffect(() => {
    return () => {
      // persist on unmount
      if (playerState.lectureId) {
        updateLectureProgress(playerState.lectureId, playerState.videoCurrentTime)
      }
      try {
        stopAudio()
      } catch {}
    }
  }, [])

  const videoSrc = useMemo(() => {
    // demo video
    return 'https://www.w3schools.com/html/mov_bbb.mp4'
  }, [])
  const framePosterUrl = useMemo(() => {
    if (!detail?.id) return undefined
    // Backend serves frames like: /api/lectures/:id/frame/frame_266.jpg
    const numericId = Number(detail.id)
    if (!Number.isFinite(numericId)) return undefined
    return `http://home.rocknroll17.com:8000/api/lectures/${numericId}/frame/frame_266.jpg`
  }, [detail?.id])
  const showImageInsteadOfVideo = useMemo(() => {
    return !!framePosterUrl
  }, [framePosterUrl])

  async function runBridgePhase(
    t_q: number,
    plan: { freezeSec: number; resumeSec: number }
  ) {
    // Freeze phase: show frame at t_q
    videoRef.current?.seekTo(t_q)
    videoRef.current?.pause()
    await wait(plan.freezeSec * 1000)
    // Resume phase: play from t_q for resumeSec
    videoRef.current?.seekTo(t_q)
    videoRef.current?.play()
    await wait(plan.resumeSec * 1000)
  }

  if (loading || !detail) {
    return (
      <div style={{ padding: 16 }}>
        {loading ? '로딩 중…' : loadError ? (
          <div>
            <div style={{ marginBottom: 8, color: '#d4380d' }}>불러오는 중 오류: {loadError}</div>
            <a href="/lectures" style={{ textDecoration: 'underline' }}>강의 목록으로 돌아가기</a>
          </div>
        ) : '데이터 없음'}
      </div>
    )
  }

  const onMicStart = () => {
    const now = performance.now()
    if (now - lastMicClickRef.current < MIC_DEBOUNCE_MS) {
      try { console.log('[Mic] ignored: debounce') } catch {}
      return
    }
    lastMicClickRef.current = now
    if (micBusyRef.current) {
      try { console.log('[Mic] ignored: busy') } catch {}
      return
    }
    if (isListening) {
      try { console.log('[Mic] start ignored: already listening') } catch {}
      return
    }
    const t_q = videoRef.current?.getCurrentTime() ?? 0
    try {
      // eslint-disable-next-line no-console
      console.log('[Mic] start at t_q=', t_q)
    } catch {}
    setQuestionTimeSec(t_q)
    videoRef.current?.pause()
    setPlayerState((s) => ({ ...s, avatarState: 'listening', questionMode: 'mic' }))
    setIsPlayheadPaused(true)
    try { frameAudioRef.current?.pause() } catch {}
    micBusyRef.current = true
    start()
  }

  const onMicStop = () => {
    // Allow immediate stop (no debounce)
    if (micFinalizeTimerRef.current) {
      window.clearTimeout(micFinalizeTimerRef.current)
      micFinalizeTimerRef.current = null
    }
    try {
      // eslint-disable-next-line no-console
      console.log('[Mic] stop requested')
    } catch {}
    stop()
    // Fallback finalize if onEnd doesn't arrive in time
    micFinalizeTimerRef.current = window.setTimeout(() => {
      setPlayerState((s) => {
        if (s.avatarState === 'listening') {
          try { console.warn('[Mic] finalize fallback (onEnd not fired)') } catch {}
          finalizeMicQuestion(text || '')
        }
        return s
      })
      micFinalizeTimerRef.current = null
    }, 800)
    micBusyRef.current = false
  }

  const onSendText = async (textQ: string) => {
    // text flow: do not pause video
    console.log(videoRef);
    const time = videoRef.current?.getCurrentTime();
    const position = await getVideoPosition(time as number);
    console.log(position);
    setChatMessages((msgs) => [...msgs, { role: 'user', content: textQ }])
    setPlayerState((s) => ({ ...s, avatarState: 'thinking', questionMode: 'text' }))
    setIsPlayheadPaused(true)
    try { frameAudioRef.current?.pause() } catch {}
    ;(async () => {
      const res = await sendQuestion({
        lectureId,
        videoTimeSec: videoRef.current?.getCurrentTime() ?? 0,
        question: textQ,
        mode: 'text',
        difficultyMode: playerState.difficultyMode,
        dailyMode: playerState.dailyMode,
      })
      setCurrentAnswerResponse(res)
      setChatMessages((msgs) => [...msgs, { role: 'assistant', content: res.answerText }])
      setPlayerState((s) => ({ ...s, avatarState: 'talking' }))
      // For text mode, keep playing video; just play TTS
      setCurrentAnswerAudioUrl(res.ttsUrl)
      await play()
      setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
      setIsPlayheadPaused(false)
      videoRef.current?.seekTo(Number(position['last_position']));
      videoRef.current?.play();
    })()
  }

  const overlay =
    showOverlay && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
          color: 'white',
          fontWeight: 600,
          borderRadius: 8,
        }}
      >
        관련 장면: {showOverlay.startSec} ~ {showOverlay.endSec} 초
      </div>
    )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <h3 style={{ marginTop: 0, fontSize: 18 }}>{detail.title}</h3>
        <button
          onClick={() => navigate('/lectures')}
          style={{
            background: 'transparent',
            border: '1px solid #e5e7eb',
            color: '#111827',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
          }}
          title="강의 목록으로 이동"
        >
          ← 강의 목록
        </button>
      </div>

      {/* Difficulty selector */}
      <div
        style={{
          marginBottom: 12,
          padding: 10,
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          boxShadow: '0 4px 14px rgba(17,24,39,0.06)',
        }}
      >
        <div style={{ fontWeight: 600, color: '#111827' }}>난이도 선택:</div>
        {(['basic', 'normal', 'advanced'] as DifficultyMode[]).map((m) => (
          <button
            key={m}
            onClick={() =>
              setPlayerState((s) => ({
                ...s,
                difficultyMode: m,
              }))
            }
            style={{
              background: playerState.difficultyMode === m ? '#eef2ff' : 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 12,
              color: '#111827',
            }}
          >
            {m === 'basic' ? '처음 배우는 내용' : m === 'advanced' ? '빠르게/깊게' : '보통'}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ position: 'relative' }}>
          {!audioUnlocked ? (
            <button
              onClick={handleUnlockAudio}
              style={{
                marginBottom: 8,
                background: '#111827',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
              }}
              title="브라우저 자동재생 정책으로 인해 클릭하여 오디오를 활성화해주세요"
            >
              🔊 오디오 활성화
            </button>
          ) : null}
          {showImageInsteadOfVideo ? (
            <div
              style={{
                width: '100%',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#000',
                maxHeight: '56vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {frames.length > 0 && currentFrameIndex >= 0 ? (
                <img
                  src={frames[Math.min(currentFrameIndex, frames.length - 1)].url}
                  alt="lecture frame"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : framePosterUrl ? (
                <img
                  src={framePosterUrl}
                  alt="lecture frame"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : null}
            </div>
          ) : (
            <VideoPlayer
              ref={videoRef}
              src={videoSrc}
              initialTimeSec={detail.lastWatchedSec}
              isPausedExternally={playerState.avatarState !== 'idle'}
              posterUrl={framePosterUrl}
              onTimeUpdate={(t) =>
                setPlayerState((s) => ({ ...s, videoCurrentTime: t }))
              }
              onReady={() => {}}
              calWpm={calWpm}
            />
          )}
          {subtitle ? (
            <div
              style={{
                marginTop: 8,
                background: '#f7f7f7',
                color: '#111',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 14,
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              {subtitle}
            </div>
          ) : null}
          {overlay}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AvatarProfessor
            state={playerState.avatarState as PlayerAvatarState}
            dailyMode={playerState.dailyMode as DailyMode}
            difficultyMode={playerState.difficultyMode as DifficultyMode}
          />
          <QuestionPanel
            messages={chatMessages}
            isListening={isListening}
            interimText={text}
            onMicStart={onMicStart}
            onMicStop={onMicStop}
            onSendText={onSendText}
            onTextModeStart={() => {
              setIsPlayheadPaused(true)
              try { frameAudioRef.current?.pause() } catch {}
            }}
          />
        </div>
      </div>
    {showCalibration ? (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 520,
            borderRadius: 16,
            background: 'white',
            padding: 20,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            오늘의 학습 상태 체크
          </div>
          <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>
            마이크 버튼을 눌러 8–10초 동안 오늘 공부 계획에 대해 말해보세요.
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => (isCalListening ? finishCalibration() : beginCalibration())}
              style={{
                background: isCalListening ? '#ef4444' : '#111827',
                color: 'white',
                borderRadius: 999,
                padding: '10px 18px',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {isCalListening ? '녹음 종료' : '마이크 시작'}
            </button>
            <button
              onClick={() => {
                setShowCalibration(false)
                setAudioUnlocked(true)
                setIsPlayheadPaused(false)
                try { console.log('[calibration] skipped -> audio unlocked, playhead resumed') } catch {}
              }}
              style={{
                background: 'transparent',
                color: '#111827',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
              }}
              title="건너뛰기"
            >
              건너뛰기
            </button>
          </div>
          <div
            style={{
              marginTop: 12,
              minHeight: 72,
              background: '#f9fafb',
              border: '1px solid #f3f4f6',
              borderRadius: 8,
              padding: 10,
              color: '#374151',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}
          >
            {calText || '녹음이 시작되면 여기에 인식된 텍스트가 표시됩니다.'}
          </div>
          {calWpm != null ? (
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div>
                <div style={{ color: '#111827', fontSize: 14 }}>
                  추정 WPM: <b>{calWpm}</b>{' '}
                  {calMode ? (
                    <>
                      / 오늘 모드: <b>{calMode}</b>
                    </>
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 6 }}>
                      (더 말해주세요: 최소 {Math.round(MIN_SPEAK_MS / 1000)}초 · {MIN_WORDS}단어 이상)
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 6, color: '#6b7280', fontSize: 12 }}>
                  기준: tired {'<'} {WPM_TIRED_MAX}, normal {WPM_TIRED_MAX}–{WPM_NORMAL_MAX}, focus {'>'} {WPM_NORMAL_MAX} (WPM)
                </div>
                {calMode ? (
                  <div style={{ marginTop: 8, color: '#374151', fontSize: 13 }}>
                    {calMode === 'tired' && '조금 느슨해도 괜찮아요. 제가 더 천천히 도와줄게요.'}
                    {calMode === 'normal' && '평소 컨디션이에요. 편안한 속도로 함께 가볼게요.'}
                    {calMode === 'focus' && '집중력이 아주 좋아 보여요! 오늘은 조금 더 깊게 가볼까요?'}
                  </div>
                ) : null}
              </div>
              {calMode ? (
                <button
                  onClick={startLectureAfterCalibration}
                  style={{
                    background: '#111827',
                    color: 'white',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  학습하러 가볼까요?
                </button>
              ) : (
                <button
                  onClick={beginCalibration}
                  style={{
                    background: 'transparent',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                  }}
                >
                  조금 더 말하기
                </button>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 12, color: '#6b7280', fontSize: 12 }}>
              녹음을 종료하면 WPM을 기반으로 오늘의 모드가 설정됩니다.
            </div>
          )}
        </div>
      </div>
    ) : null}
    </div>
  )
}


