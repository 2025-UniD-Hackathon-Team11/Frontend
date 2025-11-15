import type { DailyMode, LectureSegment } from '../types'

export async function askLectureAssistant(params: {
  question: string
  currentSegment: LectureSegment | null
  dailyMode: DailyMode
}): Promise<{
  answer: string
  resumeBridge: string
}> {
  const { question, currentSegment, dailyMode } = params

  // Mocked logic with simple tailoring by dailyMode and current segment
  const baseContext = currentSegment
    ? `지금은 "${currentSegment.title}" 파트를 설명하고 있었어요. `
    : ''

  const tone =
    dailyMode === 'tired'
      ? '좀 더 천천히 쉽게 설명해볼게요. '
      : dailyMode === 'focus'
      ? '핵심 위주로 빠르게 정리할게요. '
      : ''

  const genericAnswer =
    'TCP는 신뢰성, 흐름 제어, 혼잡 제어를 통해 안정적인 데이터 전송을 보장합니다. '

  const answer =
    tone +
    baseContext +
    genericAnswer +
    `질문 "${truncate(question, 60)}" 에 대한 답변이 도움이 되었으면 합니다.`

  const resumeBridge =
    dailyMode === 'tired'
      ? '좋은 질문이었어요. 잠깐 쉬었다가, 방금 내용 이어서 천천히 진행할게요.'
      : dailyMode === 'focus'
      ? '좋은 질문입니다. 이어서 핵심 포인트 중심으로 계속 설명할게요.'
      : '좋은 질문이었습니다. 방금 설명과 연결해서 계속 이어갈게요.'

  // simulate small network delay
  await delay(400)
  return { answer, resumeBridge }
}

export async function synthesizeTTS(text: string): Promise<string> {
  // For MVP, generate a short tone WAV as a placeholder TTS
  // Duration approximated by text length and capped
  const minSec = 2
  const maxSec = 10
  const approxSec = Math.min(
    maxSec,
    Math.max(minSec, Math.ceil(text.length / 25))
  )
  const wavBlob = generateToneWav(approxSec, 440, 0.06)
  const url = URL.createObjectURL(wavBlob)
  await delay(120) // simulate fetch latency
  return url
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// Generate simple 16-bit PCM WAV beep
function generateToneWav(
  seconds: number,
  frequency = 440,
  volume = 0.05,
  sampleRate = 44100
): Blob {
  const numSamples = Math.floor(seconds * sampleRate)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // audio format = PCM
  view.setUint16(22, 1, true) // channels = 1
  view.setUint32(24, sampleRate, true) // sample rate
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(view, 36, 'data')
  view.setUint32(40, numSamples * 2, true)

  // PCM samples (sine wave)
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


