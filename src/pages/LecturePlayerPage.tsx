import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchLectureDetail, fetchLectureMetadata, updateLectureProgress, reportDailyMode } from '../api/lectures'
import { sendQuestion, generateQuiz } from '../api/qa'
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
import type { QuizItem } from '../types'

export function LecturePlayerPage() {
  const { lectureId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof fetchLectureDetail>
  > | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const videoRef = useRef<VideoPlayerHandle | null>(null)
 

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
  const isFrameAudioPlayingRef = useRef<boolean>(false)
  const audioPlaySeqRef = useRef<number>(0)
  const [subtitle, setSubtitle] = useState<string>('')
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false)
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null)
  const [isPlayheadPaused, setIsPlayheadPaused] = useState<boolean>(false)
  const micBusyRef = useRef<boolean>(false)
  const lastOnEndTsRef = useRef<number>(0)
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const cachedOrderRef = useRef<string[]>([])
  // Focus question (집중도 질문) state
  const [showFocusQuestion, setShowFocusQuestion] = useState<boolean>(true)
  const [focusQuestionAnswer, setFocusQuestionAnswer] = useState<number | null>(null) // 1: 피곤, 2: 보통, 3: 집중
  // 반응 속도 게임 state
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'ready' | 'finished'>('idle')
  const [gameRound, setGameRound] = useState<number>(0)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [readyTime, setReadyTime] = useState<number | null>(null)
  const gameTimeoutRef = useRef<number | null>(null)
  const TOTAL_ROUNDS = 5
  // Calibration (오늘의 학습 상태) state
  const [showCalibration, setShowCalibration] = useState<boolean>(false)
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

  // Quiz state
  const [showQuiz, setShowQuiz] = useState<boolean>(false)
  const [quizLoading, setQuizLoading] = useState<boolean>(false)
  const [quizItems, setQuizItems] = useState<QuizItem[]>([])
  const [quizIndex, setQuizIndex] = useState<number>(0)
  const [quizSelected, setQuizSelected] = useState<Record<string, number>>({})
  const [quizScore, setQuizScore] = useState<number | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [awaitingUnderstanding, setAwaitingUnderstanding] = useState<boolean>(false)
  // Monotonic user-controlled playhead (not resetting on pause/resume)
  const playheadStartMsRef = useRef<number>(performance.now())
  const playheadOffsetSecRef = useRef<number>(0)
  const isPausedRef = useRef<boolean>(false)
  const [timelineDurationSec, setTimelineDurationSec] = useState<number>(0)
  const [savedProgressSec, setSavedProgressSec] = useState<number | null>(null)
  const [displayElapsedSec, setDisplayElapsedSec] = useState<number>(0)
  const getUserElapsedSec = () => {
    return (
      playheadOffsetSecRef.current +
      (isPausedRef.current ? 0 : (performance.now() - playheadStartMsRef.current) / 1000)
    )
  }
  const updatePlayheadPaused = (paused: boolean) => {
    setIsPlayheadPaused(paused)
    if (paused) {
      if (!isPausedRef.current) {
        playheadOffsetSecRef.current += (performance.now() - playheadStartMsRef.current) / 1000
        isPausedRef.current = true
      }
    } else {
      playheadStartMsRef.current = performance.now()
      isPausedRef.current = false
    }
    try {
      console.log('[user-timer] paused=', paused, 'elapsedSec=', getUserElapsedSec().toFixed(2), 'offsetSec=', playheadOffsetSecRef.current.toFixed(2))
    } catch {}
    // Persist progress locally when paused
    if (paused && lectureId) {
      const sec = getUserElapsedSec()
      setSavedProgressSec(sec)
      try {
        localStorage.setItem(`uniD:progress:${lectureId}`, String(sec))
        console.log('[progress] saved local sec=', sec.toFixed(2))
      } catch {}
    }
  }
  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec))
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${String(r).padStart(2, '0')}`
  }
  const getPlaybackRate = (): number => {
    // difficultyMode를 우선적으로 사용 (사용자가 난이도를 선택하면 그에 따라 배속 변경)
    // dailyMode는 유지되지만 배속은 difficultyMode에 따라 결정됨
    const dm = playerState.difficultyMode
    if (dm === 'basic') return 0.75
    if (dm === 'advanced') return 1.25
    return 1.0 // normal
  }
  const addCacheBuster = (u: string): string => {
    try {
      const url = new URL(u, typeof window !== 'undefined' ? window.location.origin : undefined)
      url.searchParams.set('_cb', String(Date.now()))
      return url.toString()
    } catch {
      const hasQuery = u.includes('?')
      return `${u}${hasQuery ? '&' : '?'}_cb=${Date.now()}`
    }
  }
  const pauseAllFrameAudios = () => {
    try {
      frameAudioRef.current?.pause()
    } catch {}
    try {
      audioCacheRef.current.forEach((el) => {
        try { el.pause() } catch {}
      })
    } catch {}
    isFrameAudioPlayingRef.current = false
  }
  const buildAudioCandidatesFor = (f: { audioUrl?: string } | null | undefined): string[] => {
    if (!f?.audioUrl) return []
    try {
      const baseHost = (() => {
        try {
          if (f.audioUrl!.startsWith('http')) return new URL(f.audioUrl!).origin
          if (framePosterUrl && framePosterUrl.startsWith('http')) return new URL(framePosterUrl).origin
        } catch {}
        return ''
      })()
      const audioName = (() => {
        try {
          const u = new URL(f.audioUrl!, baseHost || undefined)
          return u.pathname.split('/').pop() || f.audioUrl!
        } catch {
          const parts = f.audioUrl!.split('/')
          return parts[parts.length - 1] || f.audioUrl!
        }
      })()
      const numericId = Number(detail?.id)
      const candidates: string[] = []
      try {
        candidates.push(addCacheBuster(new URL(f.audioUrl!, baseHost || window.location.origin).toString()))
      } catch {
        if (baseHost) candidates.push(addCacheBuster(`${baseHost}${f.audioUrl!.startsWith('/') ? '' : '/'}${f.audioUrl}`))
        else candidates.push(addCacheBuster(f.audioUrl!))
      }
      if (Number.isFinite(numericId) && baseHost) {
        candidates.push(addCacheBuster(`${baseHost}/api/lectures/${numericId}/audio/${audioName}`))
        candidates.push(addCacheBuster(`${baseHost}/api/lectures/${numericId}/frame/${audioName}`))
        candidates.push(addCacheBuster(`${baseHost}/${audioName}`))
      }
      return candidates
    } catch {
      return []
    }
  }
  const startFrameAudioForIndex = (idx: number) => {
    const mySeq = ++audioPlaySeqRef.current
    if (idx < 0 || idx >= frames.length) return
    const f = frames[idx]
    if (!f?.audioUrl) return
    if (isPlayheadPaused || !audioUnlocked) return
    pauseAllFrameAudios()
    const candidates = buildAudioCandidatesFor(f)
    const tryPlay = async (k: number): Promise<void> => {
      if (k >= candidates.length) return
      // If sequence changed or frame changed, abort
      if (mySeq !== audioPlaySeqRef.current) return
      if (idx !== currentFrameIndex) return
      const url = candidates[k]
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
      try { el.pause() } catch {}
      try { el.playbackRate = getPlaybackRate() } catch {}
      el.currentTime = 0
      frameAudioRef.current = el
      try {
        await el.play()
        // verify still current
        if (mySeq !== audioPlaySeqRef.current || idx !== currentFrameIndex) {
          try { el.pause() } catch {}
          return
        }
        isFrameAudioPlayingRef.current = true
        // chain to next frame on end so no TTS is skipped
        el.onended = () => {
          isFrameAudioPlayingRef.current = false
          // guard sequence and paused state
          if (mySeq !== audioPlaySeqRef.current) return
          if (isPlayheadPaused) return
          const nextIdx = idx + 1
          if (nextIdx >= frames.length) return
          // snap internal playhead to next frame start
          const nextTime = frames[nextIdx]?.timeSec ?? (frames[idx]?.timeSec ?? 0)
          playheadOffsetSecRef.current = nextTime
          playheadStartMsRef.current = performance.now()
          // update UI state
          setCurrentFrameIndex(nextIdx)
          setSubtitle(frames[nextIdx]?.text ?? '')
          // start next audio
          startFrameAudioForIndex(nextIdx)
        }
      } catch {
        await tryPlay(k + 1)
      }
    }
    void tryPlay(0)
  }
  const seekToUserTime = (targetSec: number) => {
    const dur = timelineDurationSec || 0
    const clamped = Math.max(0, dur > 0 ? Math.min(targetSec, dur) : targetSec)
    // Prevent overlapping sounds on seek
    pauseAllFrameAudios()
    setPendingAudioUrl(null)
    isFrameAudioPlayingRef.current = false
    // bump sequence to cancel in-flight plays
    audioPlaySeqRef.current += 1
    playheadOffsetSecRef.current = clamped
    playheadStartMsRef.current = performance.now()
    // Update display immediately for responsive UI
    setDisplayElapsedSec(clamped)
    // Immediate frame update for responsiveness
    if (frames.length) {
      let idx = -1
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].timeSec <= clamped) idx = i
        else break
      }
      setCurrentFrameIndex(idx)
      // Immediate subtitle sync
      if (idx >= 0 && idx < frames.length) {
        setSubtitle(frames[idx]?.text ?? '')
        // Immediate audio sync if allowed
        if (!isPlayheadPaused && audioUnlocked) {
          startFrameAudioForIndex(idx)
        }
      }
    }
    if (!showImageInsteadOfVideo) {
      try { videoRef.current?.seekTo(clamped) } catch {}
      if (!isPausedRef.current && playerState.avatarState === 'idle') {
        try { videoRef.current?.play() } catch {}
      }
    }
    try { console.log('[seek] user-target-sec=', clamped.toFixed(2), 'duration=', dur.toFixed(2)) } catch {}
  }

  // log playhead pause/resume toggles
  useEffect(() => {
    try { console.log('[playhead] paused =', isPlayheadPaused) } catch {}
  }, [isPlayheadPaused])
  // continuous user-timer logging
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        console.log(
          '[user-timer] tick elapsedSec=',
          getUserElapsedSec().toFixed(2),
          'paused=',
          isPausedRef.current,
          'offsetSec=',
          playheadOffsetSecRef.current.toFixed(2)
        )
      } catch {}
    }, 500)
    return () => window.clearInterval(id)
  }, [])

  // Update progress bar display every second
  useEffect(() => {
    const id = window.setInterval(() => {
      setDisplayElapsedSec(getUserElapsedSec())
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  // Initialize displayElapsedSec when savedProgressSec is loaded
  useEffect(() => {
    if (savedProgressSec != null) {
      setDisplayElapsedSec(savedProgressSec)
    }
  }, [savedProgressSec])

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

  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false
  }, [playerState]);
  

  const finalizeMicQuestion = async (finalText: string) => {
    const question = (finalText || '').trim()
    if (!isFirstRender.current && question.length === 0) {
      setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
      videoRef.current?.play()
      updatePlayheadPaused(false)
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
      const vtime = questionTimeSec ?? playerState.videoCurrentTime
      const dm = playerState.dailyMode
      const cond = dm === 'tired' ? 1 : dm === 'normal' ? 2 : 3
      try {
        // eslint-disable-next-line no-console
        console.log('[LLM] ask payload:', {
          lectureId,
          videoTimeSec: vtime,
          question,
          mode: 'mic',
          difficulty_mode: playerState.difficultyMode,
          daily_mode: dm,
          condition: cond,
          condition_text: dm,
        })
      } catch {}
      const res = await sendQuestion({
        lectureId,
        videoTimeSec: vtime,
        question,
        mode: 'mic',
        difficultyMode: playerState.difficultyMode,
        dailyMode: playerState.dailyMode,
      })
      setCurrentAnswerResponse(res)
      currentAnswerResponseRef.current = res
      // 질문 시점의 시간 저장
      const stoppedTime = questionTimeSec ?? playerState.videoCurrentTime
      stoppedTimeRef.current = stoppedTime
      setChatMessages((msgs) => [...msgs, { role: 'assistant', content: res.answerText }])
      setPlayerState((s) => ({ ...s, avatarState: 'talking' }))
      // 답변 음성 재생 전에 프레임 오디오 일시정지
      pauseAllFrameAudios()
      if (res.relatedFrames?.length) {
        const f = res.relatedFrames[0]
        setShowOverlay(f)
      }
      // 비디오 일시정지
      videoRef.current?.pause()
      updatePlayheadPaused(true)
      // 답변 음성 재생 (useEffect에서 자동으로 로드되고 재생됨)
      setCurrentAnswerAudioUrl(res.ttsUrl)
      try {
        console.log('[answer-audio] setting url:', res.ttsUrl)
      } catch {}
      // After answer: keep video paused and ask user if they understood
      // 음성 재생이 끝나면 onended에서 resumePlan에 따라 자동으로 재개됨
      setShowOverlay(null)
      setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
      setAwaitingUnderstanding(true)
      micBusyRef.current = false
    })()
  }
  const { play, stop: stopAudio, audioRef } = useAudioPlayer()
  const [currentAnswerAudioUrl, setCurrentAnswerAudioUrl] = useState<string | undefined>(undefined)
  const currentAnswerResponseRef = useRef<AnswerResponse | null>(null)
  const stoppedTimeRef = useRef<number | null>(null)
  useEffect(() => {
    // tie url to player
    if (!currentAnswerAudioUrl) return
    
    // 이전 오디오 정리
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.oncanplaythrough = null
        audioRef.current.onloadeddata = null
      } catch {}
    }
    
    // URL 처리: blob, data URL은 그대로, 상대 경로는 절대 경로로 변환
    let audioUrl = currentAnswerAudioUrl
    if (!audioUrl.startsWith('blob:') && !audioUrl.startsWith('data:') && !audioUrl.startsWith('http')) {
      // 상대 경로인 경우 절대 경로로 변환
      try {
        const baseUrl = 'http://home.rocknroll17.com:8000'
        audioUrl = audioUrl.startsWith('/') 
          ? `${baseUrl}${audioUrl}`
          : `${baseUrl}/${audioUrl}`
      } catch {
        // 변환 실패 시 원본 사용
      }
    }
    // cache buster 추가 (blob, data URL 제외)
    if (!audioUrl.startsWith('blob:') && !audioUrl.startsWith('data:')) {
      audioUrl = addCacheBuster(audioUrl)
    }
    
    try {
      console.log('[answer-audio] creating audio with url:', audioUrl)
    } catch {}
    
    const a = new Audio(audioUrl)
    a.playbackRate = getPlaybackRate()
    a.volume = 1.0
    a.muted = false
    
    // 에러 핸들링
    a.onerror = (e) => {
      try {
        console.error('[answer-audio] playback error:', e, 'url:', audioUrl, 'error:', a.error)
      } catch {}
    }
    
    audioRef.current = a
    
    // 재생 함수
    const attemptPlay = async () => {
      if (audioRef.current !== a) return
      try {
        await a.play()
        try {
          console.log('[answer-audio] playing successfully, duration:', a.duration)
        } catch {}
      } catch (e: any) {
        try {
          console.error('[answer-audio] play failed:', e?.message || e, 'url:', audioUrl)
          // 재시도
          setTimeout(() => {
            if (audioRef.current === a) {
              a.play().catch((err) => {
                try {
                  console.error('[answer-audio] retry play failed:', err)
                } catch {}
              })
            }
          }, 500)
        } catch {}
      }
    }
    
    // 로드 완료 확인 및 재생 시도
    a.onloadeddata = () => {
      try {
        console.log('[answer-audio] loaded, duration:', a.duration, 'readyState:', a.readyState)
      } catch {}
      attemptPlay()
    }
    
    // Audio가 준비되면 재생
    a.oncanplaythrough = () => {
      try {
        console.log('[answer-audio] can play through, duration:', a.duration)
      } catch {}
      attemptPlay()
    }
    
    a.oncanplay = () => {
      try {
        console.log('[answer-audio] can play, readyState:', a.readyState)
      } catch {}
      // canplay에서도 재생 시도
      if (a.readyState >= 2) {
        attemptPlay()
      }
    }
    
    // 이미 로드된 경우 즉시 재생 시도
    if (a.readyState >= 2) {
      attemptPlay()
    } else {
      // 명시적으로 로드 시작
      a.load()
    }
    
    a.onended = () => {
      try {
        console.log('[answer-audio] ended, resuming video')
      } catch {}
      // 음성 재생이 끝나면 resumePlan에 따라 동영상 재개
      const response = currentAnswerResponseRef.current
      if (response?.resumePlan) {
        const { freezeSec = 0, resumeSec } = response.resumePlan
        // freezeSec 동안 대기 후 resumeSec 위치로 이동하여 재개
        setTimeout(() => {
          const stoppedTime = stoppedTimeRef.current ?? (videoRef.current?.getCurrentTime() ?? 0)
          const targetTime = typeof resumeSec === 'number' 
            ? Math.max(0, stoppedTime - freezeSec + resumeSec)
            : Math.max(0, stoppedTime - freezeSec)
          seekToUserTime(targetTime)
          updatePlayheadPaused(false)
          // 프레임 오디오도 재개
          if (audioUnlocked && currentFrameIndex >= 0) {
            startFrameAudioForIndex(currentFrameIndex)
          }
          videoRef.current?.play()
        }, Math.max(0, freezeSec * 1000))
      } else {
        // resumePlan이 없으면 기존처럼 사용자 입력을 기다림 (awaitingUnderstanding 상태 유지)
        try {
          console.log('[answer-audio] no resumePlan, waiting for user input')
        } catch {}
      }
    }
    
    // cleanup
    return () => {
      try {
        if (a && audioRef.current === a) {
          a.pause()
          a.src = ''
          a.onended = null
          a.onerror = null
          a.oncanplaythrough = null
          a.oncanplay = null
          a.onloadeddata = null
        }
      } catch {}
    }
  }, [currentAnswerAudioUrl, audioRef])

  // Pause playhead while focus question or calibration is shown
  useEffect(() => {
    if (showFocusQuestion || showCalibration) {
      updatePlayheadPaused(true)
      try { frameAudioRef.current?.pause() } catch {}
    }
  }, [showFocusQuestion, showCalibration])

  // When difficulty changes, update playbackRate of any active media
  useEffect(() => {
    const rate = getPlaybackRate()
    try { if (frameAudioRef.current) frameAudioRef.current.playbackRate = rate } catch {}
    try { if (audioRef.current) audioRef.current.playbackRate = rate } catch {}
    // video playbackRate is managed by VideoPlayer prop
  }, [playerState.difficultyMode])

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
  // 반응 속도 게임 함수들
  const startReactionGame = () => {
    setGameState('idle')
    setGameRound(0)
    setReactionTimes([])
    nextGameRound()
  }

  const nextGameRound = () => {
    setGameState('waiting')
    // 1-3초 사이 랜덤 시간 후 ready 상태로 변경
    const randomDelay = 1000 + Math.random() * 2000
    gameTimeoutRef.current = window.setTimeout(() => {
      setGameState('ready')
      setReadyTime(performance.now())
    }, randomDelay)
  }

  const handleGameClick = () => {
    if (gameState === 'ready' && readyTime != null) {
      const reactionTime = performance.now() - readyTime
      setReactionTimes((prev) => {
        const newTimes = [...prev, reactionTime]
        const nextRound = newTimes.length
        setGameState('idle')
        setReadyTime(null)
        // 다음 라운드로
        if (nextRound >= TOTAL_ROUNDS) {
          setTimeout(() => {
            finishGame(newTimes)
          }, 500)
        } else {
          setGameRound(nextRound)
          setTimeout(() => {
            nextGameRound()
          }, 500)
        }
        return newTimes
      })
    } else if (gameState === 'waiting') {
      // 너무 빨리 클릭한 경우 (페널티)
      setReactionTimes((prev) => {
        const newTimes = [...prev, 10000] // 매우 느린 시간으로 기록
        const nextRound = newTimes.length
        setGameState('idle')
        if (gameTimeoutRef.current) {
          window.clearTimeout(gameTimeoutRef.current)
          gameTimeoutRef.current = null
        }
        if (nextRound >= TOTAL_ROUNDS) {
          setTimeout(() => {
            finishGame(newTimes)
          }, 500)
        } else {
          setGameRound(nextRound)
          setTimeout(() => {
            nextGameRound()
          }, 500)
        }
        return newTimes
      })
    }
  }

  const finishGame = (times: number[]) => {
    setGameState('finished')
    // 평균 반응 시간 계산
    const validTimes = times.filter((t) => t < 5000) // 5초 이상은 무효
    if (validTimes.length === 0) {
      setFocusQuestionAnswer(2) // 기본값
      return
    }
    const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length
    // 반응 시간에 따라 집중도 평가 (빠를수록 집중)
    if (avgTime < 250) {
      setFocusQuestionAnswer(3) // 매우 빠름 = 집중
    } else if (avgTime < 400) {
      setFocusQuestionAnswer(2) // 보통
    } else {
      setFocusQuestionAnswer(1) // 느림 = 피곤
    }
  }

  // 질문 답변 후 WPS 측정 모달로 이동
  const proceedToWPSMeasurement = () => {
    if (focusQuestionAnswer == null && gameState !== 'finished') return
    if (gameTimeoutRef.current) {
      window.clearTimeout(gameTimeoutRef.current)
      gameTimeoutRef.current = null
    }
    setShowFocusQuestion(false)
    setShowCalibration(true)
  }

  const startLectureAfterCalibration = () => {
    // 질문 답변과 WPS를 함께 고려하여 최종 집중도 결정
    let finalMode: DailyMode = 'normal' // 기본값
    
    // 질문 답변 점수 (1: 매우 피곤, 2: 보통, 3: 매우 집중)
    const questionScore = focusQuestionAnswer ?? 2
    
    // WPS 기반 모드 (calMode가 있으면 사용, 없으면 WPM으로 계산)
    let wpsMode: DailyMode | null = calMode
    if (!wpsMode && calWpm > 0) {
      if (calWpm < WPM_TIRED_MAX) wpsMode = 'tired'
      else if (calWpm <= WPM_NORMAL_MAX) wpsMode = 'normal'
      else wpsMode = 'focus'
    }
    
    // 질문 답변과 WPS를 종합하여 최종 모드 결정
    // 두 값을 평균하여 결정 (1=tired, 2=normal, 3=focus)
    const wpsScore = wpsMode === 'tired' ? 1 : wpsMode === 'focus' ? 3 : 2
    const combinedScore = (questionScore + wpsScore) / 2
    
    if (combinedScore < 1.5) {
      finalMode = 'tired'
    } else if (combinedScore > 2.5) {
      finalMode = 'focus'
    } else {
      finalMode = 'normal'
    }
    
    // WPS가 없고 질문만 있는 경우 질문 답변을 우선 사용
    if (!wpsMode && focusQuestionAnswer != null) {
      if (focusQuestionAnswer === 1) finalMode = 'tired'
      else if (focusQuestionAnswer === 3) finalMode = 'focus'
      else finalMode = 'normal'
    }
    
    try {
      const code = finalMode === 'tired' ? 1 : finalMode === 'normal' ? 2 : 3
      // eslint-disable-next-line no-console
      console.log('[page] final mode decision:', {
        questionAnswer: focusQuestionAnswer,
        wpsMode,
        calWpm,
        combinedScore,
        finalMode,
        mode_code: code
      })
    } catch {}
    
    // 집중도에 따라 난이도도 자동으로 설정
    let difficultyMode: DifficultyMode = 'normal'
    if (finalMode === 'tired') {
      difficultyMode = 'basic'
    } else if (finalMode === 'focus') {
      difficultyMode = 'advanced'
    }
    
    setPlayerState((s) => ({ ...s, dailyMode: finalMode, difficultyMode }))
    setShowCalibration(false)
    // unlock audio after user interaction
    setAudioUnlocked(true)
    // hold playhead; a timed start will kick in after calibration
    // if resume is requested, we'll resume immediately
    const wantResume = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('resume') : null
    if (wantResume) {
      updatePlayheadPaused(false)
    } else {
      updatePlayheadPaused(true)
    }
    // Report today's learning status to backend (tired->1, normal->2, focus->3)
    void reportDailyMode(finalMode)
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
        // Load saved local progress if exists
        try {
          const raw = lectureId ? localStorage.getItem(`uniD:progress:${lectureId}`) : null
          if (raw != null && mounted) {
            const v = parseFloat(raw)
            if (Number.isFinite(v) && v >= 0) {
              setSavedProgressSec(v)
              console.log('[progress] loaded local sec=', v.toFixed(2))
            }
          }
        } catch {}
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
              const lastSec = sorted.length ? sorted[sorted.length - 1].timeSec : 0
              if (Number.isFinite(lastSec) && lastSec > 0) {
                setTimelineDurationSec(Math.max(lastSec, timelineDurationSec))
              }
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
  // Drive frame switching based on an internal "playhead" timer (monotonic, pause-resilient)
  useEffect(() => {
    if (!frames.length) return
    if (frameTimerRef.current) {
      window.clearInterval(frameTimerRef.current)
      frameTimerRef.current = null
    }
    // Reset base for new frames set, but preserve accumulated offset
    playheadStartMsRef.current = performance.now()
    const prevIdxRef = { current: -1 }
    // Do an immediate sync to avoid skipping the first short frame
    ;(() => {
      const elapsedSec =
        playheadOffsetSecRef.current +
        (isPausedRef.current ? 0 : (performance.now() - playheadStartMsRef.current) / 1000)
      let idx = -1
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].timeSec <= elapsedSec) idx = i
        else break
      }
      prevIdxRef.current = idx
      setCurrentFrameIndex(idx)
    })()
    frameTimerRef.current = window.setInterval(() => {
      // elapsed = accumulated offset + delta since last resume; stays constant while paused
      const elapsedSec =
        playheadOffsetSecRef.current +
        (isPausedRef.current ? 0 : (performance.now() - playheadStartMsRef.current) / 1000)
      // Find the largest index with timeSec <= elapsedSec
      let idx = -1
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].timeSec <= elapsedSec) idx = i
        else break
      }
      // While current frame audio is playing, pin the frame index to avoid skipping the first sentence
      if (isFrameAudioPlayingRef.current && prevIdxRef.current >= 0) {
        idx = prevIdxRef.current
      }
      // eslint-disable-next-line no-console
      console.log(
        '[page] frame-timer',
        'elapsed=', elapsedSec.toFixed(2),
        'idx=', idx,
        'frameTime=', idx >= 0 ? frames[idx]?.timeSec : null
      )
      if (idx !== prevIdxRef.current) {
        // eslint-disable-next-line no-console
        console.log('[page] switch frame ->', idx, idx >= 0 ? frames[idx]?.url : '(poster)')
        prevIdxRef.current = idx
      }
      setCurrentFrameIndex(idx)
    }, 100)
    return () => {
      if (frameTimerRef.current) {
        window.clearInterval(frameTimerRef.current)
        frameTimerRef.current = null
      }
    }
  }, [frames])

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
        if (isPlayheadPaused) {
          try { frameAudioRef.current?.pause() } catch {}
          return
        }
        // Preload lookahead (non-playing)
        const candidates = buildAudioCandidatesFor(f)
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
            if (cachedOrderRef.current.length > 24) {
              const oldKey = cachedOrderRef.current.shift()
              if (oldKey) {
                try { audioCacheRef.current.get(oldKey)?.pause() } catch {}
                audioCacheRef.current.delete(oldKey)
              }
            }
          }
        }
        preloadUrl(candidates[0])
        const n1 = frames[currentFrameIndex + 1]?.audioUrl
        const n2 = frames[currentFrameIndex + 2]?.audioUrl
        if (n1) preloadUrl(n1)
        if (n2) preloadUrl(n2)
        // Play current via unified starter
        if (audioUnlocked) {
          startFrameAudioForIndex(currentFrameIndex)
        } else if (candidates[0]) {
          setPendingAudioUrl((prev) => prev || candidates[0])
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[page] audio error', e)
      }
    }
    return () => {
      // ensure previous audio is stopped when frame changes/unmounts
      try { frameAudioRef.current?.pause() } catch {}
    }
  }, [currentFrameIndex, frames])

  // Pause any frame audio when playhead is paused; auto-play on resume if conditions are met
  useEffect(() => {
    if (isPlayheadPaused) {
      try { frameAudioRef.current?.pause() } catch {}
      isFrameAudioPlayingRef.current = false
    } else {
      // When playhead resumes, play audio for current frame if unlocked and frame is valid
      if (audioUnlocked && currentFrameIndex >= 0 && currentFrameIndex < frames.length) {
        const f = frames[currentFrameIndex]
        if (f?.audioUrl && !isFrameAudioPlayingRef.current) {
          startFrameAudioForIndex(currentFrameIndex)
        }
      }
    }
  }, [isPlayheadPaused, audioUnlocked, currentFrameIndex, frames])

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
    setPendingAudioUrl(null)
    startFrameAudioForIndex(currentFrameIndex)
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
      // save local progress on unmount
      try {
        const sec = getUserElapsedSec()
        if (lectureId) {
          localStorage.setItem(`uniD:progress:${lectureId}`, String(sec))
          console.log('[progress] saved on unmount sec=', sec.toFixed(2))
        }
      } catch {}
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

  // Auto-seek to saved progress when requested from list page (?resume=1)
  const resumeAppliedRef = useRef<boolean>(false)
  useEffect(() => {
    const wantResume = !!searchParams.get('resume')
    if (!wantResume) return
    if (savedProgressSec == null) return
    // Seek once on intent
    seekToUserTime(savedProgressSec)
    try { console.log('[resume] auto-seek to', savedProgressSec.toFixed(2)) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedProgressSec])
  // Ensure resume is applied after frames are loaded (image mode)
  useEffect(() => {
    const wantResume = !!searchParams.get('resume')
    if (!wantResume) return
    if (resumeAppliedRef.current) return
    if (savedProgressSec == null) return
    if (frames.length === 0) return
    seekToUserTime(savedProgressSec)
    resumeAppliedRef.current = true
    try { console.log('[resume] applied after frames load ->', savedProgressSec.toFixed(2)) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames.length, savedProgressSec])
  // Ensure resume is applied after calibration overlay is dismissed
  useEffect(() => {
    const wantResume = !!searchParams.get('resume')
    if (!wantResume) return
    if (resumeAppliedRef.current) return
    if (savedProgressSec == null) return
    if (showFocusQuestion || showCalibration) return
    seekToUserTime(savedProgressSec)
    resumeAppliedRef.current = true
    try { console.log('[resume] applied after calibration ->', savedProgressSec.toFixed(2)) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFocusQuestion, showCalibration, savedProgressSec])

  // After calibration ends (and not resuming), start first sentence 2s later from 0s
  useEffect(() => {
    const wantResume = !!searchParams.get('resume')
    if (showFocusQuestion || showCalibration) return
    if (wantResume) return
    // start only once when calibration is dismissed
    let started = false
    const id = window.setTimeout(() => {
      if (started) return
      started = true
      // reset to beginning and start
      // Update playhead paused state first, then seek to ensure audio plays
      updatePlayheadPaused(false)
      // Use setTimeout to ensure state update is applied before seek
      setTimeout(() => {
        seekToUserTime(0)
        try { console.log('[start] first sentence after calibration (2s delay)') } catch {}
      }, 0)
    }, 2000)
    return () => {
      window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCalibration])

 

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
    updatePlayheadPaused(true)
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
    setChatMessages((msgs) => [...msgs, { role: 'user', content: textQ }])
    setPlayerState((s) => ({ ...s, avatarState: 'thinking', questionMode: 'text' }))
    updatePlayheadPaused(true)
    try { frameAudioRef.current?.pause() } catch {}
    videoRef.current?.pause()
    ;(async () => {
      const vtime = videoRef.current?.getCurrentTime() ?? 0
      const dm = playerState.dailyMode
      const cond = dm === 'tired' ? 1 : dm === 'normal' ? 2 : 3
      try {
        // eslint-disable-next-line no-console
        console.log('[LLM] ask payload:', {
          lectureId,
          videoTimeSec: vtime,
          question: textQ,
          mode: 'text',
          difficulty_mode: playerState.difficultyMode,
          daily_mode: dm,
          condition: cond,
          condition_text: dm,
        })
      } catch {}
      const res = await sendQuestion({
        lectureId,
        videoTimeSec: vtime,
        question: textQ,
        mode: 'text',
        difficultyMode: playerState.difficultyMode,
        dailyMode: playerState.dailyMode,
      })
      setCurrentAnswerResponse(res)
      currentAnswerResponseRef.current = res
      // 질문 시점의 시간 저장
      const stoppedTime = videoRef.current?.getCurrentTime() ?? 0
      stoppedTimeRef.current = stoppedTime
      setChatMessages((msgs) => [...msgs, { role: 'assistant', content: res.answerText }])
      setPlayerState((s) => ({ ...s, avatarState: 'talking' }))
      // 답변 음성 재생 전에 프레임 오디오 일시정지
      pauseAllFrameAudios()
      // 비디오 일시정지
      videoRef.current?.pause()
      updatePlayheadPaused(true)
      // 답변 음성 재생 (useEffect에서 자동으로 로드되고 재생됨)
      setCurrentAnswerAudioUrl(res.ttsUrl)
      try {
        console.log('[answer-audio] setting url:', res.ttsUrl)
      } catch {}
      // After answer: keep video paused and ask user if they understood
      // 음성 재생이 끝나면 onended에서 resumePlan에 따라 자동으로 재개됨
      setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
      setAwaitingUnderstanding(true)
    })()
  }

  const onUnderstood = () => {
    setAwaitingUnderstanding(false)
    updatePlayheadPaused(false)
    videoRef.current?.play()
  }

  const onExplainMore = async () => {
    const followup = '좀 더 자세히 설명해줘.'
    setChatMessages((msgs) => [...msgs, { role: 'user', content: followup }])
    setPlayerState((s) => ({ ...s, avatarState: 'thinking', questionMode: 'text' }))
    updatePlayheadPaused(true)
    videoRef.current?.pause()
    ;(async () => {
      const vtime = (questionTimeSec ?? videoRef.current?.getCurrentTime() ?? 0) as number
      const dm = playerState.dailyMode
      const cond = dm === 'tired' ? 1 : dm === 'normal' ? 2 : 3
      try {
        // eslint-disable-next-line no-console
        console.log('[LLM] follow-up payload:', {
          lectureId,
          videoTimeSec: vtime,
          question: followup,
          mode: 'text',
          difficulty_mode: playerState.difficultyMode,
          daily_mode: dm,
          condition: cond,
          condition_text: dm,
        })
      } catch {}
      const res = await sendQuestion({
        lectureId,
        videoTimeSec: vtime,
        question: followup,
        mode: 'text',
        difficultyMode: playerState.difficultyMode,
        dailyMode: playerState.dailyMode,
      })
      setCurrentAnswerResponse(res)
      currentAnswerResponseRef.current = res
      // 질문 시점의 시간 저장
      const stoppedTime = videoRef.current?.getCurrentTime() ?? 0
      stoppedTimeRef.current = stoppedTime
      setChatMessages((msgs) => [...msgs, { role: 'assistant', content: res.answerText }])
      setPlayerState((s) => ({ ...s, avatarState: 'talking' }))
      // 답변 음성 재생 전에 프레임 오디오 일시정지
      pauseAllFrameAudios()
      // 비디오 일시정지
      videoRef.current?.pause()
      updatePlayheadPaused(true)
      // 답변 음성 재생 (useEffect에서 자동으로 로드되고 재생됨)
      setCurrentAnswerAudioUrl(res.ttsUrl)
      try {
        console.log('[answer-audio] setting url:', res.ttsUrl)
      } catch {}
      // 음성 재생이 끝나면 onended에서 resumePlan에 따라 자동으로 재개됨
      setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
      setAwaitingUnderstanding(true)
    })()
  }

  const onTogglePauseClick = () => {
    if (awaitingUnderstanding) {
      try { console.log('[pause] ignored: awaiting understanding choice') } catch {}
      return
    }
    if (playerState.avatarState !== 'idle') {
      try { console.log('[pause] ignored: avatar busy state', playerState.avatarState) } catch {}
      return
    }
    const nextPaused = !isPausedRef.current && !isPlayheadPaused ? true : !isPlayheadPaused
    if (nextPaused) {
      updatePlayheadPaused(true)
      try { frameAudioRef.current?.pause() } catch {}
      videoRef.current?.pause()
      try { console.log('[pause] -> paused', { elapsed: getUserElapsedSec().toFixed(2) }) } catch {}
    } else {
      updatePlayheadPaused(false)
      // restart current frame sentence from the beginning on resume via unified starter
      if (audioUnlocked) {
        startFrameAudioForIndex(currentFrameIndex)
      }
      videoRef.current?.play()
      try { console.log('[pause] -> resumed', { elapsed: getUserElapsedSec().toFixed(2) }) } catch {}
    }
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
        <h3 style={{ marginTop: 0, fontSize: 18 }}>{detail?.title ?? ''}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={async () => {
              // Open quiz modal and generate quiz via LLM
              setShowQuiz(true)
              setQuizLoading(true)
              setQuizError(null)
              setQuizScore(null)
              setQuizIndex(0)
              setQuizItems([])
              try {
                if (playerState.lectureId) {
                  await updateLectureProgress(playerState.lectureId, playerState.videoCurrentTime)
                }
                try { frameAudioRef.current?.pause() } catch {}
                videoRef.current?.pause()
                const items = await generateQuiz({
                  lectureId,
                  untilTimeSec: playerState.videoCurrentTime,
                  numQuestions: 3,
                  difficultyMode: playerState.difficultyMode,
                  dailyMode: playerState.dailyMode,
                })
                setQuizItems(items)
              } catch (e: any) {
                const msg = e?.message || String(e)
                setQuizError(msg)
              } finally {
                setQuizLoading(false)
              }
            }}
            style={{
              background: '#111827',
              border: '1px solid #111827',
              color: '#ffffff',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
            }}
            title="학습을 마치고 퀴즈로 점검하기"
          >
            학습 마치기
          </button>
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            집중도: <span style={{ fontWeight: 600, color: '#111827' }}>
              {playerState.dailyMode === 'tired' ? '피곤함' : playerState.dailyMode === 'focus' ? '집중' : '보통'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            배속: <span style={{ fontWeight: 600, color: '#111827' }}>
              {getPlaybackRate().toFixed(2)}x
            </span>
          </div>
        </div>
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
              initialTimeSec={(searchParams.get('resume') && savedProgressSec != null) ? savedProgressSec : (detail.lastWatchedSec ?? 0)}
              isPausedExternally={playerState.avatarState !== 'idle' || isPlayheadPaused}
              posterUrl={framePosterUrl}
              playbackRate={getPlaybackRate()}
              onTimeUpdate={(t) =>
                setPlayerState((s) => ({ ...s, videoCurrentTime: t }))
              }
              onReady={(durationSec) => {
                if (Number.isFinite(durationSec) && durationSec > 0) {
                  setTimelineDurationSec(Math.max(timelineDurationSec, durationSec))
                }
              }}
              calWpm={calWpm}
            />
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {!audioUnlocked ? null : (
              <button
                onClick={onTogglePauseClick}
                disabled={awaitingUnderstanding || playerState.avatarState !== 'idle'}
                style={{
                  background: isPlayheadPaused ? '#111827' : 'transparent',
                  color: isPlayheadPaused ? '#fff' : '#111827',
                  border: isPlayheadPaused ? '1px solid #111827' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                }}
                title={isPlayheadPaused ? '재생' : '일시정지'}
              >
                {isPlayheadPaused ? '재생' : '일시정지'}
              </button>
            )}
          </div>
          {/* Seekable progress bar */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280', minWidth: 44, textAlign: 'right' }}>
                {formatTime(displayElapsedSec)}
              </div>
              <div
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                  const target = (timelineDurationSec || (frames.length ? frames[frames.length - 1]?.timeSec ?? 0 : 0)) * ratio
                  seekToUserTime(target)
                }}
                style={{
                  position: 'relative',
                  flex: 1,
                  height: 10,
                  borderRadius: 6,
                  background: '#f5f5f5',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                title="원하는 위치로 이동"
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${(() => {
                      const dur = timelineDurationSec || (frames.length ? frames[frames.length - 1]?.timeSec ?? 0 : 0)
                      const elapsed = displayElapsedSec
                      return dur > 0 ? Math.max(0, Math.min(100, (elapsed / dur) * 100)) : 0
                    })()}%`,
                    background: '#91d5ff',
                    transition: 'width 200ms linear',
                  }}
                />
                {/* saved progress marker */}
                {(() => {
                  const dur = timelineDurationSec || (frames.length ? frames[frames.length - 1]?.timeSec ?? 0 : 0)
                  const sp = savedProgressSec ?? null
                  const show = dur > 0 && sp != null && sp >= 0
                  const leftPct = show ? Math.max(0, Math.min(100, (sp! / dur) * 100)) : 0
                  return show ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${leftPct}%`,
                        width: 2,
                        background: '#f59e0b',
                        transform: 'translateX(-1px)',
                        pointerEvents: 'none',
                      }}
                      title="저장된 진행 위치"
                    />
                  ) : null
                })()}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', minWidth: 44 }}>
                {formatTime(timelineDurationSec || (frames.length ? frames[frames.length - 1]?.timeSec ?? 0 : 0))}
              </div>
            </div>
          </div>
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
              updatePlayheadPaused(true)
              try { frameAudioRef.current?.pause() } catch {}
            }}
          />
          {awaitingUnderstanding && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 10,
              }}
            >
              <button
                onClick={onUnderstood}
                style={{
                  background: '#111827',
                  color: '#ffffff',
                  border: '1px solid #111827',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
                title="이해 완료 후 계속 이어보기"
              >
                이해가 잘 되었어!
              </button>
              <button
                onClick={onExplainMore}
                style={{
                  background: 'transparent',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                }}
                title="좀 더 자세한 설명 듣기"
              >
                좀 더 설명이 필요해!
              </button>
            </div>
          )}
        </div>
      </div>
    {showFocusQuestion ? (
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
            집중도 체크 게임
          </div>
          {gameState === 'idle' && gameRound === 0 ? (
            <>
              <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>
                화면이 초록색으로 변하면 빠르게 클릭하세요!<br />
                총 {TOTAL_ROUNDS}번 반복하여 반응 속도를 측정합니다.
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setFocusQuestionAnswer(2) // 기본값으로 설정하고 진행
                    proceedToWPSMeasurement()
                  }}
                  style={{
                    background: 'transparent',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                  }}
                >
                  건너뛰기
                </button>
                <button
                  onClick={startReactionGame}
                  style={{
                    background: '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  게임 시작
                </button>
              </div>
            </>
          ) : gameState === 'finished' ? (
            <>
              <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>
                게임 완료! 평균 반응 시간: {(() => {
                  const validTimes = reactionTimes.filter((t) => t < 5000)
                  if (validTimes.length === 0) return '측정 불가'
                  const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length
                  return `${avg.toFixed(0)}ms`
                })()}
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setGameState('idle')
                    setGameRound(0)
                    setReactionTimes([])
                  }}
                  style={{
                    background: 'transparent',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                  }}
                >
                  다시 하기
                </button>
                <button
                  onClick={proceedToWPSMeasurement}
                  style={{
                    background: '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  다음
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
                {gameRound + 1} / {TOTAL_ROUNDS} 라운드
              </div>
              <div
                onClick={handleGameClick}
                style={{
                  marginTop: 20,
                  minHeight: 200,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: gameState === 'ready' ? 'pointer' : 'default',
                  background: gameState === 'ready' ? '#22c55e' : gameState === 'waiting' ? '#f3f4f6' : '#e5e7eb',
                  transition: 'background 0.1s',
                  userSelect: 'none',
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: gameState === 'ready' ? 'white' : '#6b7280' }}>
                  {gameState === 'waiting' ? '준비...' : gameState === 'ready' ? '클릭!' : '대기 중'}
                </div>
              </div>
              {gameState === 'waiting' && (
                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
                  화면이 초록색으로 변할 때까지 기다리세요
                </div>
              )}
              {gameState === 'ready' && (
                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                  지금 클릭하세요!
                </div>
              )}
            </>
          )}
        </div>
      </div>
    ) : null}
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
              onClick={startLectureAfterCalibration}
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
    {showQuiz ? (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
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
            maxWidth: 640,
            borderRadius: 16,
            background: 'white',
            padding: 20,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>퀴즈로 마무리</div>
            <button
              onClick={() => setShowQuiz(false)}
              style={{
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                color: '#111827',
              }}
            >
              닫기
            </button>
          </div>
          {quizLoading ? (
            <div style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>퀴즈 생성 중…</div>
          ) : quizError ? (
            <div style={{ marginTop: 12, color: '#d4380d', fontSize: 14 }}>
              퀴즈를 불러오지 못했어요: {quizError}
            </div>
          ) : quizItems.length === 0 ? (
            <div style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>퀴즈가 없습니다.</div>
          ) : quizScore != null ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                점수: {quizScore} / {quizItems.length}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setShowQuiz(false)
                    navigate('/lectures')
                  }}
                  style={{
                    background: '#111827',
                    border: '1px solid #111827',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                  }}
                >
                  강의 목록으로 이동
                </button>
                <button
                  onClick={() => {
                    setQuizScore(null)
                    setQuizIndex(0)
                    setQuizSelected({})
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    color: '#111827',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                  }}
                >
                  다시 풀기
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                총 {quizItems.length}문제 중 {quizIndex + 1}번째 문제
              </div>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 600, color: '#111827', whiteSpace: 'pre-wrap' }}>
                {quizItems[quizIndex].question}
              </div>
              {Array.isArray(quizItems[quizIndex].options) && quizItems[quizIndex].options!.length > 0 ? (
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  {quizItems[quizIndex].options!.map((opt, optIdx) => {
                    const qid = quizItems[quizIndex].id
                    const selected = quizSelected[qid]
                    return (
                      <label
                        key={optIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          padding: '8px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name={`quiz-${qid}`}
                          checked={selected === optIdx}
                          onChange={() => {
                            setQuizSelected((prev) => ({ ...prev, [qid]: optIdx }))
                          }}
                        />
                        <span style={{ fontSize: 14, color: '#111827' }}>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: '#6b7280', fontSize: 14 }}>
                  보기 없이 서술형 문제입니다. 메모해두고 스스로 답을 떠올려 보세요.
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <button
                  onClick={() => setQuizIndex((i) => Math.max(0, i - 1))}
                  disabled={quizIndex === 0}
                  style={{
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    color: '#111827',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                  }}
                >
                  이전
                </button>
                {quizIndex < quizItems.length - 1 ? (
                  <button
                    onClick={() => setQuizIndex((i) => Math.min(quizItems.length - 1, i + 1))}
                    style={{
                      background: '#111827',
                      border: '1px solid #111827',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 13,
                    }}
                  >
                    다음
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // compute score
                      let score = 0
                      for (const q of quizItems) {
                        if (typeof q.correctIndex === 'number' && Array.isArray(q.options)) {
                          const sel = quizSelected[q.id]
                          if (sel === q.correctIndex) score++
                        }
                      }
                      setQuizScore(score)
                    }}
                    style={{
                      background: '#111827',
                      border: '1px solid #111827',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 13,
                    }}
                  >
                    제출하고 채점
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null}
    </div>
  )
}


