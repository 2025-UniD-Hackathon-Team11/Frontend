// General app-wide types for the hackathon MVP
export type DailyMode = 'tired' | 'normal' | 'focus' | null
export type DifficultyMode = 'basic' | 'normal' | 'advanced'

export type LectureSummary = {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  durationSec: number
  lastWatchedSec?: number
  progress: number // 0 ~ 1
  category?: string
}

export type AnswerResponse = {
  answerText: string
  ttsUrl: string
  relatedFrames: { startSec: number; endSec: number }[]
  resumePlan?: {
    freezeSec: number
    resumeSec: number
  }
}

export type PlayerAvatarState = 'idle' | 'listening' | 'thinking' | 'talking'

export type PlayerState = {
  lectureId: string
  videoCurrentTime: number
  isPlaying: boolean
  avatarState: PlayerAvatarState
  dailyMode: DailyMode
  difficultyMode: DifficultyMode
  questionMode: 'mic' | 'text' | null
}

// Legacy types from the prior single-page MVP (kept if needed elsewhere)
export type LectureMode = 'idle' | 'calibrating' | 'teaching' | 'listening' | 'answering'
export type LectureSegment = {
  id: number
  title: string
  content: string
  durationMs: number
}


