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
    category: '컴퓨터네트워크'
  },
  {
    id: 'tcp-handshake',
    title: 'TCP 3-way Handshake',
    description: 'SYN, SYN-ACK, ACK의 교환 과정을 시각적으로 이해합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 360,
    lastWatchedSec: 60,
    progress: 60 / 360,
    category: '컴퓨터네트워크'
  },
  {
    id: 'tcp-flow',
    title: '흐름 제어와 혼잡 제어',
    description: '윈도우 사이즈, AIMD 등 핵심 개념을 다룹니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 540,
    lastWatchedSec: 270,
    progress: 0.5,
    category: '컴퓨터네트워크'
  },
  {
    id: 'fe101',
    title: 'HTML & CSS 기본기',
    description: '웹 페이지 구조와 스타일링의 기초를 다집니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 600,
    lastWatchedSec: 0,
    progress: 0,
    category: '프론트엔드'
  },
  {
    id: 'fe201',
    title: 'JavaScript ES6 핵심 문법',
    description: 'let·const부터 화살표 함수까지 필수 문법을 정리합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 780,
    lastWatchedSec: 0,
    progress: 0,
    category: '프론트엔드'
  },
  {
    id: 'fe301',
    title: 'React 기초: 컴포넌트와 상태',
    description: 'React의 철학과 상태 관리 기본을 익힙니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 900,
    lastWatchedSec: 0,
    progress: 0,
    category: '프론트엔드'
  },

  // --- Backend ---
  {
    id: 'be101',
    title: 'Node.js 서버의 기본 구조',
    description: '이벤트 루프 모델과 기본적인 웹 서버 구조를 이해합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 720,
    lastWatchedSec: 0,
    progress: 0,
    category: '백엔드'
  },
  {
    id: 'be201',
    title: 'Express 라우팅 & 미들웨어',
    description: '실무 서버에서 필수적인 라우터 구성과 미들웨어 흐름을 배웁니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 880,
    lastWatchedSec: 0,
    progress: 0,
    category: '백엔드'
  },
  {
    id: 'be301',
    title: 'REST API 설계의 원칙',
    description: '자원·엔드포인트·HTTP 메서드의 정확한 사용법을 정리합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 760,
    lastWatchedSec: 0,
    progress: 0,
    category: '백엔드'
  },

  // --- Database ---
  {
    id: 'db101',
    title: 'SQL 기본 문법',
    description: 'SELECT, INSERT, UPDATE, DELETE를 빠르게 익힙니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 600,
    lastWatchedSec: 0,
    progress: 0,
    category: 'DB'
  },
  {
    id: 'db201',
    title: '인덱스가 동작하는 방식',
    description: 'B-Tree 기반 인덱싱 구조와 성능 차이를 이해합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 950,
    lastWatchedSec: 0,
    progress: 0,
    category: 'DB'
  },
  {
    id: 'db301',
    title: '트랜잭션 & 격리 수준',
    description: 'ACID, 격리 레벨, 데드락을 실전 예제로 설명합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 1100,
    lastWatchedSec: 0,
    progress: 0,
    category: 'DB'
  },

  // --- OS ---
  {
    id: 'os101',
    title: '프로세스와 스레드의 차이',
    description: '커널이 프로세스와 스레드를 어떻게 다루는지 정리합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 650,
    lastWatchedSec: 0,
    progress: 0,
    category: '운영체제'
  },
  {
    id: 'os201',
    title: '메모리 관리: 페이징과 세그먼테이션',
    description: '현대 OS의 메모리 관리 전략을 시각적으로 배웁니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 920,
    lastWatchedSec: 0,
    progress: 0,
    category: '운영체제'
  },
  {
    id: 'os150',
    title: '스케줄링 알고리즘 완전 정복',
    description: 'FCFS, SJF, Priority, Round Robin 등 프로세스 스케줄링 방식을 비교하여 이해합니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 840,
    lastWatchedSec: 0,
    progress: 0,
    category: '운영체제'
  },

  // --- Mobile ---
  {
    id: 'mb101',
    title: '안드로이드 Activity 생명주기',
    description: 'onCreate부터 onDestroy까지 흐름을 정확히 익힙니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 700,
    lastWatchedSec: 0,
    progress: 0,
    category: 'Mobile'
  },
  {
    id: 'mb201',
    title: 'iOS Swift 기초 문법',
    description: 'Swift의 기본 타입과 함수, 구조체를 배웁니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 780,
    lastWatchedSec: 0,
    progress: 0,
    category: 'Mobile'
  },
  {
    id: 'mb150',
    title: '안드로이드 Jetpack Compose 기초',
    description: 'Compose의 UI 선언형 구조와 기본 컴포넌트 사용법을 빠르게 익힙니다.',
    thumbnailUrl: '/vite.svg',
    durationSec: 780,
    lastWatchedSec: 0,
    progress: 0,
    category: 'Mobile'
  }
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


