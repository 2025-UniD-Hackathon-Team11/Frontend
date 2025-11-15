import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchLectureDetail, updateLectureProgress } from '../api/lectures'
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

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

export function LecturePlayerPage() {
  const { lectureId = '' } = useParams()
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof fetchLectureDetail>
  > | null>(null)
  const [loading, setLoading] = useState(true)
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

  const { isListening, text, start, stop } = useSpeechRecognition({
    lang: 'ko-KR',
    continuous: true,
    onEnd: (finalText) => {
      try {
        // eslint-disable-next-line no-console
        console.log('[STT:onEnd] finalText=', finalText)
      } catch {}
      // Mic flow end: send question
      const question = finalText.trim()
      if (question.length === 0) {
        // resume idle
        setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
        videoRef.current?.play()
        return
      }
      if (questionTimeSec == null) {
        setQuestionTimeSec(playerState.videoCurrentTime)
      }
      setChatMessages((msgs) => [...msgs, { role: 'user', content: question }])
      setPlayerState((s) => ({ ...s, avatarState: 'thinking' }))
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
        // Show related frames overlay and pause at frame start
        if (res.relatedFrames?.length) {
          const f = res.relatedFrames[0]
          videoRef.current?.seekTo(f.startSec)
          videoRef.current?.pause()
          setShowOverlay(f)
        }
        setCurrentAnswerAudioUrl(res.ttsUrl)
        await play()
        // On TTS end: run bridge
        if (res.resumePlan && (questionTimeSec ?? null) != null) {
          await runBridgePhase(questionTimeSec as number, res.resumePlan)
        }
        setShowOverlay(null)
        setPlayerState((s) => ({ ...s, avatarState: 'idle', questionMode: null }))
      })()
    },
  })

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

  useEffect(() => {
    let mounted = true
    fetchLectureDetail(lectureId)
      .then((d) => {
        if (!mounted) return
        setDetail(d)
      })
      .finally(() => setLoading(false))
    return () => {
      mounted = false
    }
  }, [lectureId])

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
    return <div style={{ padding: 16 }}>로딩 중…</div>
  }

  const onMicStart = () => {
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
    start()
  }

  const onMicStop = () => {
    try {
      // eslint-disable-next-line no-console
      console.log('[Mic] stop requested')
    } catch {}
    stop()
  }

  const onSendText = (textQ: string) => {
    // text flow: do not pause video
    setChatMessages((msgs) => [...msgs, { role: 'user', content: textQ }])
    setPlayerState((s) => ({ ...s, avatarState: 'thinking', questionMode: 'text' }))
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
      <h3 style={{ marginTop: 0 }}>{detail.title}</h3>

      {/* Difficulty selector */}
      <div
        style={{
          marginBottom: 12,
          padding: 10,
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontWeight: 600 }}>난이도 선택:</div>
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
              background: playerState.difficultyMode === m ? '#e6f7ff' : undefined,
            }}
          >
            {m === 'basic' ? '처음 배우는 내용' : m === 'advanced' ? '빠르게/깊게' : '보통'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <VideoPlayer
            ref={videoRef}
            src={videoSrc}
            initialTimeSec={detail.lastWatchedSec}
            isPausedExternally={playerState.avatarState !== 'idle'}
            onTimeUpdate={(t) =>
              setPlayerState((s) => ({ ...s, videoCurrentTime: t }))
            }
            onReady={() => {}}
          />
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
          />
        </div>
      </div>
    </div>
  )
}


