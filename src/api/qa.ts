import type { AnswerResponse, DailyMode, DifficultyMode } from '../types'

export async function sendQuestion(params: {
  lectureId: string
  videoTimeSec: number
  question: string
  mode: 'mic' | 'text'
  difficultyMode: DifficultyMode
  dailyMode: DailyMode
}): Promise<AnswerResponse> {
  const { question, videoTimeSec, difficultyMode } = params
  await delay(800 + Math.random() * 800)

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


