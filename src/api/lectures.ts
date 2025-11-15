import type { LectureSummary } from '../types'

// In-memory mock lectures; progress persisted to localStorage for the demo
const LECTURES: LectureSummary[] = [
  {
    id: 'tcp101',
    title: 'TCP 기초 입문',
    description: 'TCP의 기본 개념과 통신 흐름을 빠르게 훑어봅니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 480,
    lastWatchedSec: 0,
    progress: 0,
  },
  {
    id: 'tcp-handshake',
    title: 'TCP 3-way Handshake',
    description: 'SYN, SYN-ACK, ACK의 교환 과정을 시각적으로 이해합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 360,
    lastWatchedSec: 60,
    progress: 60 / 360,
  },
  {
    id: 'tcp-flow',
    title: '흐름 제어와 혼잡 제어',
    description: '윈도우 사이즈, AIMD 등 핵심 개념을 다룹니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 540,
    lastWatchedSec: 270,
    progress: 0.5,
  },
]

const LS_KEY = 'dailyfit_lecture_progress'

function loadProgress(): Record<string, number> {
  try {
    const s = localStorage.getItem(LS_KEY)
    return s ? JSON.parse(s) : {}
  } catch {
    return {}
  }
}

function saveProgress(map: Record<string, number>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {}
}

export async function fetchLectureList(): Promise<LectureSummary[]> {
  await delay(200)
  const progressMap = loadProgress()
  return LECTURES.map((L) => {
    const last = progressMap[L.id] ?? L.lastWatchedSec
    const clamped = Math.max(0, Math.min(L.durationSec, last))
    const prog = L.durationSec ? Math.min(1, clamped / L.durationSec) : 0
    return { ...L, lastWatchedSec: clamped, progress: prog }
  })
}

export async function fetchLectureDetail(lectureId: string): Promise<LectureSummary> {
  await delay(150)
  const all = await fetchLectureList()
  const found = all.find((l) => l.id === lectureId)
  if (!found) throw new Error('Lecture not found')
  return found
}

export async function updateLectureProgress(
  lectureId: string,
  currentTimeSec: number
): Promise<void> {
  const map = loadProgress()
  map[lectureId] = currentTimeSec
  saveProgress(map)
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}


