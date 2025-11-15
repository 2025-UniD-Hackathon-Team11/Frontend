import { useEffect, useRef, useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import type { DailyMode } from '../types'

export function VoiceCalibration(props: {
  onComplete: (mode: DailyMode) => void
}) {
  const { onComplete } = props
  const [isSampling, setIsSampling] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const endTimeRef = useRef<number | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [wpmValue, setWpmValue] = useState<number | null>(null)

  const { isListening, text, start, stop } = useSpeechRecognition({
    lang: 'ko-KR',
    continuous: true,
    onEnd: () => {
      endTimeRef.current = performance.now()
      const finalText = text
      try {
        // eslint-disable-next-line no-console
        console.log('[Calibration STT:onEnd] finalText=', finalText)
      } catch {}
      const start = startTimeRef.current ?? performance.now()
      const end = endTimeRef.current ?? performance.now()
      const elapsedMs = Math.max(1, end - start)
      const totalWords = finalText.trim().length > 0 ? finalText.trim().split(/\s+/).length : 0
      const minutes = elapsedMs / 60000
      const wpm = totalWords / minutes
      setWpmValue(Number.isFinite(wpm) ? Math.round(wpm) : 0)

      const mode = mapWpmToMode(wpm)
      setSummary(modeSummary(mode))
      // After small delay, complete
      setTimeout(() => onComplete(mode), 1200)
      setIsSampling(false)
    },
  })

  useEffect(() => {
    if (!isSampling) {
      startTimeRef.current = null
      endTimeRef.current = null
    }
  }, [isSampling])

  const handleStart = () => {
    setSummary('')
    setWpmValue(null)
    setIsSampling(true)
    startTimeRef.current = performance.now()
    try {
      // eslint-disable-next-line no-console
      console.log('[Calibration] start listening')
    } catch {}
    start()
    // auto-stop after 10s
    window.setTimeout(() => {
      if (isListening) {
        try {
          // eslint-disable-next-line no-console
          console.log('[Calibration] auto stop after 10s')
        } catch {}
        stop()
      }
    }, 10000)
  }

  const handleStop = () => {
    try {
      // eslint-disable-next-line no-console
      console.log('[Calibration] stop requested')
    } catch {}
    stop()
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <h2 style={{ marginTop: 0 }}>오늘의 컨디션 체크</h2>
      <p style={{ color: '#595959' }}>
        마이크 버튼을 눌러 10초 동안 오늘 공부 계획에 대해 말해보세요.
      </p>

      <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
        {!isListening ? (
          <button
            onClick={handleStart}
            style={{
              background: '#ffd666',
              border: '1px solid #ffe58f',
            }}
          >
            🎤 시작
          </button>
        ) : (
          <button onClick={handleStop}>정지</button>
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 12,
          minHeight: 80,
          color: '#8c8c8c',
          whiteSpace: 'pre-wrap',
        }}
      >
        {text || (isListening ? '듣고 있어요…' : '여기에 음성 인식 결과가 표시됩니다.')}
      </div>

      {wpmValue !== null && (
        <div style={{ marginTop: 12 }}>
          <strong>추정 WPM:</strong> {wpmValue}
        </div>
      )}

      {summary && (
        <div
          style={{
            marginTop: 12,
            background: '#f6ffed',
            border: '1px solid #d9f7be',
            borderRadius: 8,
            padding: 12,
            color: '#389e0d',
          }}
        >
          {summary}
        </div>
      )}
    </div>
  )
}

function mapWpmToMode(wpm: number): DailyMode {
  if (wpm < 80) return 'tired'
  if (wpm > 130) return 'focus'
  return 'normal'
}

function modeSummary(mode: DailyMode): string {
  switch (mode) {
    case 'tired':
      return '오늘은 조금 피곤해 보이네요. 제가 더 천천히 설명할게요.'
    case 'focus':
      return '오늘은 집중력이 아주 좋네요. 조금 빠르게, 더 깊게 설명할게요.'
    default:
      return '오늘은 보통 컨디션이네요. 평소 속도로 진행할게요.'
  }
}


