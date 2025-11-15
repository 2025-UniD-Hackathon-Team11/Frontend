import type { AnswerResponse, DailyMode, DifficultyMode, QuizItem } from '../types'

const BACKEND_BASE = 'http://home.rocknroll17.com:8000'

export async function sendQuestion(params: {
  lectureId: string
  videoTimeSec: number
  question: string
  mode: 'mic' | 'text'
  difficultyMode: DifficultyMode
  dailyMode: DailyMode
}): Promise<AnswerResponse> {
  const url = `${BACKEND_BASE}/api/llm/ask`
  try {
    // eslint-disable-next-line no-console
    console.log('[qa] POST', url, params)
  } catch {}
  try {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const body = {
      lecture_id: params.lectureId,
      video_time_sec: params.videoTimeSec,
      question: params.question,
      daily_mode: params.dailyMode,
      // Include numeric condition mapping alongside existing daily_mode string
      condition: params.dailyMode === 'tired' ? 1 : params.dailyMode === 'normal' ? 2 : 3,
      condition_text: params.dailyMode,
      difficulty_mode: params.difficultyMode,
      mode: params.mode,
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
    const cloned = res.clone()
    const rawText = await cloned.text().catch(() => '')
    try {
      // eslint-disable-next-line no-console
      console.log('[qa] POST status', res.status, 'in', Math.round(elapsedMs), 'ms')
      // eslint-disable-next-line no-console
      console.log('[qa] request body', body)
      // eslint-disable-next-line no-console
      console.log('[qa] response snippet', rawText.slice(0, 240))
    } catch {}
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(data)}`)
    // Normalize possible shapes
    const answerText: string =
      data.answerText || data.answer_text || data.answer || '답변을 생성했어요.'
    const ttsUrl: string | undefined = data.ttsUrl || data.tts_url || data.audioUrl || data.audio_url
    const relatedFrames =
      data.relatedFrames ||
      data.related_frames ||
      (data.highlight?.startSec
        ? [{ startSec: data.highlight.startSec, endSec: data.highlight.endSec ?? data.highlight.startSec + 3 }]
        : [])
    const resumePlan =
      data.resumePlan ||
      data.resume_plan || (data.bridge ? { freezeSec: data.bridge.freezeSec ?? 3, resumeSec: data.bridge.resumeSec ?? 3 } : undefined)
    const normalized: AnswerResponse = {
      answerText,
      ttsUrl: ttsUrl || createBeepFallback(),
      relatedFrames: Array.isArray(relatedFrames) ? relatedFrames : [],
      resumePlan,
    }
    try { console.log('[qa] normalized response', normalized) } catch {}
    return normalized
  } catch (e) {
    try { console.warn('[qa] fallback due to error:', e) } catch {}
    // Fallback to local mock if backend unavailable
    const { question, videoTimeSec, difficultyMode } = params
    await delay(600)

    const answerText =
      difficultyMode === 'basic'
        ? `좋은 질문이에요. 간단히 설명해보면, TCP는 데이터를 순서대로, 빠지지 않게 전달하기 위해 확인 응답과 재전송 같은 메커니즘을 사용해요. 질문 "${truncate(
            question,
            48
          )}" 에 대해 기본 개념부터 차근차근 정리했어요. `
        : difficultyMode === 'advanced'
        ? `흥미로운 포인트예요. 혼잡 제어는 AIMD를 기반으로 해서 네트워크의 포화 상태를 피하면서도 최대 처리량을 추구하죠. 질문 "${truncate(
            question,
            48
          )}" 에 대해 핵심과 함정을 빠르게 짚어볼게요. `
        : `좋은 질문입니다. TCP는 신뢰성과 흐름 제어, 혼잡 제어를 통해 안정적인 전송을 보장합니다. 질문 "${truncate(
            question,
            48
          )}" 에 대해 중요한 부분 위주로 설명할게요. `

    const beepUrl = createBeepUrl(3)

    const relatedFrames = [
      { startSec: Math.max(0, Math.floor(videoTimeSec - 5)), endSec: Math.floor(videoTimeSec) },
    ]

    const resumePlan = {
      freezeSec: 3,
      resumeSec: 3,
    }

    return {
      answerText: `${answerText} 방금 이야기하던 부분과 연결해서 이어가볼게요.`,
      ttsUrl: beepUrl,
      relatedFrames,
      resumePlan,
    }
  }
}

export async function generateQuiz(params: {
  lectureId: string
  untilTimeSec: number
  numQuestions?: number
  difficultyMode: DifficultyMode
  dailyMode: DailyMode
}): Promise<QuizItem[]> {
  const QUIZ_URL =
    (import.meta as any)?.env?.VITE_QUIZ_URL?.replace(/\/$/, '') ||
    `${BACKEND_BASE}/api/llm/quiz`
  const body = {
    lecture_id: params.lectureId,
    until_time_sec: params.untilTimeSec,
    num_questions: params.numQuestions ?? 3,
    difficulty_mode: params.difficultyMode,
    daily_mode: params.dailyMode,
    condition: params.dailyMode === 'tired' ? 1 : params.dailyMode === 'normal' ? 2 : 3,
    condition_text: params.dailyMode,
  }
  try {
    // eslint-disable-next-line no-console
    console.log('[qa] generateQuiz -> POST', QUIZ_URL, body)
  } catch {}
  try {
    const res = await fetch(QUIZ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const rawText = await res.clone().text().catch(() => '')
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${rawText.slice(0, 240)}`)
    }
    const data: any = await res.json().catch(() => ({}))
    // Accept flexible shapes:
    // { items: [{ id, question, options, correct_index, explanation }]}
    // or array directly.
    const arr: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
    const normalized: QuizItem[] = arr.map((q: any, i: number) => ({
      id: String(q.id ?? `q${i + 1}`),
      question: String(q.question ?? q.q ?? '문제가 전달되지 않았습니다.'),
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : (Array.isArray(q.choices) ? q.choices.map((o: any) => String(o)) : undefined),
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : (typeof q.correct_index === 'number' ? q.correct_index : undefined),
      explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
    }))
    try {
      // eslint-disable-next-line no-console
      console.log('[qa] generateQuiz normalized:', normalized)
    } catch {}
    return normalized
  } catch (e) {
    try { console.warn('[qa] generateQuiz fallback due to error:', e) } catch {}
    // Simple mock quiz fallback
    const base: QuizItem[] = [
      {
        id: 'q1',
        question: '방금 강의에서 다룬 핵심 개념은 무엇이었나요?',
        options: ['TCP 3-way Handshake', 'Bubble Sort', '메모리 페이징', '디자인 패턴 팩토리'],
        correctIndex: 0,
        explanation: '예시 문제입니다. 실제 환경에서는 LLM이 생성합니다.',
      },
      {
        id: 'q2',
        question: '핵심 용어와 가장 관련이 깊은 선택지를 고르세요.',
        options: ['SYN/ACK', 'map/filter', 'linear regression', 'kernel trick'],
        correctIndex: 0,
      },
      {
        id: 'q3',
        question: '다음 중 강의에서 설명된 개념의 목적은?',
        options: ['연결 성립과 신뢰성 확보', '정렬 최적화', 'GPU 가속', '암호화'],
        correctIndex: 0,
      },
    ]
    return base.slice(0, Math.max(1, Math.min(5, params.numQuestions ?? 3)))
  }
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function createBeepUrl(seconds: number): string {
  const blob = generateToneWav(seconds, 660, 0.06)
  return URL.createObjectURL(blob)
}

function createBeepFallback(): string {
  return createBeepUrl(2)
}

// Simple 16-bit PCM WAV generator (sine)
function generateToneWav(
  seconds: number,
  frequency = 440,
  volume = 0.06,
  sampleRate = 44100
): Blob {
  const numSamples = Math.floor(seconds * sampleRate)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, numSamples * 2, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * frequency * t)
    const s = Math.max(-1, Math.min(1, sample)) * volume
    view.setInt16(offset, s * 0x7fff, true)
    offset += 2
  }
  return new Blob([view], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}


