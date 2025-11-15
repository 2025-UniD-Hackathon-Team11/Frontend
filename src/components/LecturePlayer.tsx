import { useEffect, useMemo, useRef } from 'react'
import type { DailyMode, LectureMode, LectureSegment } from '../types'

export function LecturePlayer(props: {
  lectureSegments: LectureSegment[]
  currentSegmentIndex: number
  dailyMode: DailyMode
  lectureMode: LectureMode
  isPaused: boolean
  onAdvance: () => void
  onTogglePause: () => void
  onMicPressed: () => void
}) {
  const {
    lectureSegments,
    currentSegmentIndex,
    dailyMode,
    lectureMode,
    isPaused,
    onAdvance,
    onTogglePause,
    onMicPressed,
  } = props

  const current = lectureSegments[currentSegmentIndex]
  const total = lectureSegments.length
  const progress = (currentSegmentIndex + 1) / total

  const adjustedDuration = useMemo(() => {
    const base = current?.durationMs ?? 4000
    const factor = dailyMode === 'tired' ? 1.3 : dailyMode === 'focus' ? 0.7 : 1.0
    return Math.max(1200, Math.floor(base * factor))
  }, [current?.durationMs, dailyMode])

  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (lectureMode !== 'teaching' || isPaused) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }
    // start timer for current segment
    timerRef.current = window.setTimeout(() => {
      onAdvance()
    }, adjustedDuration)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [lectureMode, isPaused, adjustedDuration, onAdvance])

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: 12,
        padding: 16,
        minHeight: 260,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{current?.title ?? '강의'}</div>
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          {currentSegmentIndex + 1} / {total}
        </div>
      </div>
      <div
        style={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          color: '#434343',
          minHeight: 96,
        }}
      >
        {current?.content ?? ''}
      </div>
      <div style={{ marginTop: 12, background: '#f5f5f5', height: 8, borderRadius: 6, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            background: '#91d5ff',
            transition: 'width 400ms ease',
          }}
        />
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={onTogglePause}>
          {isPaused ? '재생' : '일시정지'}
        </button>
        <button
          onClick={onMicPressed}
          disabled={lectureMode === 'listening' || lectureMode === 'answering'}
          style={{
            background: '#ffd666',
            border: '1px solid #ffe58f',
          }}
          title="질문을 하려면 마이크를 눌러주세요"
        >
          🎤 질문하기
        </button>
      </div>
    </div>
  )
}


