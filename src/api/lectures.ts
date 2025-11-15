import type { LectureSummary } from '../types'

// Backend endpoint (public)
const BACKEND_BASE =
  (import.meta as any)?.env?.VITE_BACKEND_BASE?.replace(/\/$/, '') ||
  'http://home.rocknroll17.com:8000'
const LECTURE_LIST_URL = `${BACKEND_BASE}/api/lectures`
function toAbsoluteUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) return `${BACKEND_BASE}${path}`
  return `${BACKEND_BASE}/${path}`
}

// In-memory mock lectures; progress persisted to localStorage for the demo
const LECTURES: LectureSummary[] = [
  {
    id: 'tcp101',
    title: 'TCP 기초 입문',
    description: 'TCP의 기본 개념과 통신 흐름을 빠르게 훑어봅니다.',
    thumbnailUrl: '/imgs/1.png',
    durationSec: 480,
    lastWatchedSec: 0,
    progress: 0,
    category: '컴퓨터네트워크'
  },
  {
    id: 'tcp-handshake',
    title: 'TCP 3-way Handshake',
    description: 'SYN, SYN-ACK, ACK의 교환 과정을 시각적으로 이해합니다.',
    thumbnailUrl: '/imgs/2.png',
    durationSec: 360,
    lastWatchedSec: 60,
    progress: 60 / 360,
    category: '컴퓨터네트워크'
  },
  {
    id: 'tcp-flow',
    title: '흐름 제어와 혼잡 제어',
    description: '윈도우 사이즈, AIMD 등 핵심 개념을 다룹니다.',
    thumbnailUrl: '/imgs/3.png',
    durationSec: 540,
    lastWatchedSec: 270,
    progress: 0.5,
    category: '컴퓨터네트워크'
  },
  {
    id: 'fe101',
    title: 'HTML & CSS 기본기',
    description: '웹 페이지 구조와 스타일링의 기초를 다집니다.',
    thumbnailUrl: '/imgs/4.png',
    durationSec: 600,
    lastWatchedSec: 0,
    progress: 0,
    category: '프론트엔드'
  },
  {
    id: 'fe201',
    title: 'JavaScript ES6 핵심 문법',
    description: 'let·const부터 화살표 함수까지 필수 문법을 정리합니다.',
    thumbnailUrl: '/imgs/5.png',
    durationSec: 780,
    lastWatchedSec: 0,
    progress: 0,
    category: '프론트엔드'
  },
  {
    id: 'fe301',
    title: 'React 기초: 컴포넌트와 상태',
    description: 'React의 철학과 상태 관리 기본을 익힙니다.',
    thumbnailUrl: '/imgs/6.png',
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
    thumbnailUrl: '/imgs/7.png',
    durationSec: 720,
    lastWatchedSec: 0,
    progress: 0,
    category: '백엔드'
  },
  {
    id: 'be201',
    title: 'Express 라우팅 & 미들웨어',
    description: '실무 서버에서 필수적인 라우터 구성과 미들웨어 흐름을 배웁니다.',
    thumbnailUrl: '/imgs/8.png',
    durationSec: 880,
    lastWatchedSec: 0,
    progress: 0,
    category: '백엔드'
  },
  {
    id: 'be301',
    title: 'REST API 설계의 원칙',
    description: '자원·엔드포인트·HTTP 메서드의 정확한 사용법을 정리합니다.',
    thumbnailUrl: '/imgs/9.png',
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
    thumbnailUrl: '/imgs/11.png',
    durationSec: 600,
    lastWatchedSec: 0,
    progress: 0,
    category: 'DB'
  },
  {
    id: 'db201',
    title: '인덱스가 동작하는 방식',
    description: 'B-Tree 기반 인덱싱 구조와 성능 차이를 이해합니다.',
    thumbnailUrl: '/imgs/12.png',
    durationSec: 950,
    lastWatchedSec: 0,
    progress: 0,
    category: 'DB'
  },
  {
    id: 'db301',
    title: '트랜잭션 & 격리 수준',
    description: 'ACID, 격리 레벨, 데드락을 실전 예제로 설명합니다.',
    thumbnailUrl: '/imgs/13.png',
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
    thumbnailUrl: '/imgs/14.png',
    durationSec: 650,
    lastWatchedSec: 0,
    progress: 0,
    category: '운영체제'
  },
  {
    id: 'os201',
    title: '메모리 관리: 페이징과 세그먼테이션',
    description: '현대 OS의 메모리 관리 전략을 시각적으로 배웁니다.',
    thumbnailUrl: '/imgs/15.png',
    durationSec: 920,
    lastWatchedSec: 0,
    progress: 0,
    category: '운영체제'
  },
  {
    id: 'os150',
    title: '스케줄링 알고리즘 완전 정복',
    description: 'FCFS, SJF, Priority, Round Robin 등 프로세스 스케줄링 방식을 비교하여 이해합니다.',
    thumbnailUrl: '/imgs/16.png',
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
    thumbnailUrl: '/imgs/17.png',
    durationSec: 700,
    lastWatchedSec: 0,
    progress: 0,
    category: 'Mobile'
  },
  {
    id: 'mb201',
    title: 'iOS Swift 기초 문법',
    description: 'Swift의 기본 타입과 함수, 구조체를 배웁니다.',
    thumbnailUrl: '/imgs/18.png',
    durationSec: 780,
    lastWatchedSec: 0,
    progress: 0,
    category: 'Mobile'
  },
  {
    id: 'mb150',
    title: '안드로이드 Jetpack Compose 기초',
    description: 'Compose의 UI 선언형 구조와 기본 컴포넌트 사용법을 빠르게 익힙니다.',
    thumbnailUrl: '/imgs/19.png',
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
  try {
    // eslint-disable-next-line no-console
    console.log('[api] fetchLectureList ->', LECTURE_LIST_URL)
  } catch {}
  const progressMap = loadProgress()
  try {
    const res = await fetch(LECTURE_LIST_URL, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: Array<{
      id: number
      title: string
      thumbnail: string
      duration: number
      last_position: number
    }> = await res.json()
    const remoteMapped: LectureSummary[] = data.map((it) => {
      const id = String(it.id)
      const durationSec = it.duration ?? 0
      const lastWatchedSec = typeof progressMap[id] === 'number' ? progressMap[id] : (it.last_position ?? 0)
      const progress = durationSec > 0 ? Math.min(1, Math.max(0, lastWatchedSec / durationSec)) : 0
      // Normalize thumbnail path to absolute URL (supports http(s), '/path', or 'path')
      const thumbnailUrl = toAbsoluteUrl(`/api/lectures/${it.id}/thumbnail`)
      return {
        id,
        title: it.title,
        description: '', // backend payload has no description; keep minimal
        thumbnailUrl,
        durationSec,
        lastWatchedSec,
        progress,
        // backend에는 카테고리가 없으므로 기본값
        category: '전체' as any,
      }
    })
    // Local list with persisted progress
    const localWithProgress: LectureSummary[] = LECTURES.map((L) => {
      const last = progressMap[L.id] ?? L.lastWatchedSec ?? 0
      const clamped = Math.max(0, Math.min(L.durationSec, last))
      const prog = L.durationSec ? Math.min(1, clamped / L.durationSec) : 0
      return { ...L, lastWatchedSec: clamped, progress: prog }
    })
    // Merge local and remote (local first, remote overrides same id)
    const byId = new Map<string, LectureSummary>()
    for (const item of localWithProgress) byId.set(item.id, item)
    for (const item of remoteMapped) byId.set(item.id, item)
    const mapped = Array.from(byId.values())
    try {
      // eslint-disable-next-line no-console
      console.log('[api] fetchLectureList OK (merged):', mapped.map((m) => m.id))
    } catch {}
    return mapped
  } catch {
    // Fallback to static mock if backend is unreachable
    const list = LECTURES
    return list.map((L) => {
      const last = progressMap[L.id] ?? L.lastWatchedSec
      const clamped = Math.max(0, Math.min(L.durationSec, last))
      const prog = L.durationSec ? Math.min(1, clamped / L.durationSec) : 0
      return { ...L, lastWatchedSec: clamped, progress: prog }
    })
  }
}

export async function fetchLectureDetail(lectureId: string): Promise<LectureSummary> {
  const all = await fetchLectureList()
  const found = all.find((l) => l.id === lectureId)
  if (found) {
    try {
      // eslint-disable-next-line no-console
      console.log('[api] fetchLectureDetail found:', lectureId)
    } catch {}
    return found
  }
  // Not found: log available ids and attempt legacy fallback ids
  try {
    // eslint-disable-next-line no-console
    console.warn('[api] fetchLectureDetail not found:', lectureId, 'available:', all.map((x) => x.id))
  } catch {}
  const legacy = LECTURES.find((l) => l.id === lectureId)
  if (legacy) {
    try {
      // eslint-disable-next-line no-console
      console.warn('[api] using legacy fallback for id:', lectureId)
    } catch {}
    return legacy
  }
  throw new Error('Lecture not found')
}

export async function updateLectureProgress(
  lectureId: string,
  currentTimeSec: number
): Promise<void> {
  const map = loadProgress()
  map[lectureId] = currentTimeSec
  saveProgress(map)
}

// Report today's learning status (daily mode) to backend
export async function reportDailyMode(mode: 'tired' | 'normal' | 'focus'): Promise<void> {
  const modeCode = mode === 'tired' ? 1 : mode === 'normal' ? 2 : 3
  const DAILY_MODE_URL =
    (import.meta as any)?.env?.VITE_DAILY_MODE_URL?.replace(/\/$/, '') ||
    `${BACKEND_BASE}/api/user/daily-mode`
  const body = {
    mode: modeCode,
    mode_text: mode,
    timestamp: new Date().toISOString(),
  }
  try {
    // eslint-disable-next-line no-console
    console.log('[api] reportDailyMode ->', DAILY_MODE_URL, body)
  } catch {}
  try {
    const res = await fetch(DAILY_MODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const cloned = res.clone()
      const text = await cloned.text().catch(() => '')
      try {
        // eslint-disable-next-line no-console
        console.warn('[api] reportDailyMode non-OK:', {
          status: res.status,
          url: DAILY_MODE_URL,
          snippet: text.slice(0, 200),
        })
      } catch {}
    }
  } catch (e) {
    try {
      // eslint-disable-next-line no-console
      console.warn('[api] reportDailyMode failed:', e)
    } catch {}
  }
}

export type LectureFrame = { timeSec: number; url: string; audioUrl?: string; text?: string }

// Fetch timeline/frames metadata for a lecture
export async function fetchLectureMetadata(lectureNumericId: number): Promise<LectureFrame[]> {
  const url = `${BACKEND_BASE}/api/lectures/${lectureNumericId}/metadata`
  try {
    // eslint-disable-next-line no-console
    console.log('[api] fetchLectureMetadata ->', url)
  } catch {}
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const raw = await res.json()
  try {
    // eslint-disable-next-line no-console
    console.log(
      '[api] fetchLectureMetadata raw:',
      Array.isArray(raw) ? `array(len=${raw.length})` : Object.keys(raw || {}),
      JSON.stringify(raw).slice(0, 600)
    )
  } catch {}
  // Accept a few common shapes and normalize
  let frames: LectureFrame[] = []
  if (Array.isArray(raw)) {
    frames = raw.map((it: any, idx: number) => ({
      timeSec: Number(it.timeSec ?? it.time_sec ?? it.t ?? idx) || idx,
      url: toAbsoluteUrl(String(it.url ?? it.frame ?? it.path ?? '')),
    }))
  } else if (raw && Array.isArray(raw.frames)) {
    frames = raw.frames.map((it: any, idx: number) => {
      const name = it.name ? String(it.name) : undefined
      const urlFromName = name ? `${BACKEND_BASE}/api/lectures/${lectureNumericId}/frame/${name}` : ''
      const audioName = it.audio ? String(it.audio) : undefined
      const audioFromName = audioName ? `${BACKEND_BASE}/api/lectures/${lectureNumericId}/audio/${audioName}` : ''
      // Normalize audio: if only filename is provided, always build absolute /api/lectures/{id}/audio/{file}
      let normalizedAudio = ''
      if (audioName) {
        if (/^https?:\/\//i.test(audioName) || audioName.includes('/')) {
          normalizedAudio = toAbsoluteUrl(audioName)
        } else {
          normalizedAudio = audioFromName
        }
      } else if (it.audioUrl || it.audio_url) {
        normalizedAudio = toAbsoluteUrl(String(it.audioUrl ?? it.audio_url))
      }
      return {
        timeSec: Number(it.start ?? it.timeSec ?? it.time_sec ?? it.time ?? it.t ?? idx) || idx,
        url: toAbsoluteUrl(String(it.url ?? it.frame ?? it.path ?? urlFromName)),
        audioUrl: normalizedAudio,
        text: typeof it.text === 'string' ? it.text : (typeof it.caption === 'string' ? it.caption : undefined),
      }
    })
    // If narrations array exists, ensure each narration has an exact frame at its start time
    if (Array.isArray(raw.narrations)) {
      try {
        // eslint-disable-next-line no-console
        console.log('[api] narrations count:', (raw.narrations as any[]).length)
      } catch {}
      type Narr = { audio?: string; text?: string; start?: number }
      const narrs = (raw.narrations as Narr[]).map(n => ({
        audio: n.audio,
        text: n.text,
        start: Number(n.start ?? 0) || 0,
      })).sort((a, b) => a.start - b.start)
      // ensure frames sorted
      frames.sort((a, b) => a.timeSec - b.timeSec)
      const byTime = new Map<number, LectureFrame>()
      for (const f of frames) byTime.set(f.timeSec, f)
      let inserted = 0
      for (const n of narrs) {
        const audioName = n.audio ? String(n.audio) : undefined
        const audioAbs = audioName
          ? `${BACKEND_BASE}/api/lectures/${lectureNumericId}/audio/${audioName}`
          : undefined
        const existing = byTime.get(n.start)
        if (existing) {
          if (audioAbs) existing.audioUrl = audioAbs
          if (typeof n.text === 'string' && n.text.trim().length > 0) existing.text = n.text
          continue
        }
        // find nearest preceding frame to borrow its image url
        let urlPrev = frames.length ? frames[0].url : ''
        for (let i = 0; i < frames.length; i++) {
          if (frames[i].timeSec <= n.start) urlPrev = frames[i].url
          else break
        }
        const nf: LectureFrame = {
          timeSec: n.start,
          url: urlPrev,
          audioUrl: audioAbs,
          text: typeof n.text === 'string' ? n.text : undefined,
        }
        frames.push(nf)
        byTime.set(n.start, nf)
        inserted += 1
      }
      frames.sort((a, b) => a.timeSec - b.timeSec)
      try {
        // eslint-disable-next-line no-console
        console.log(
          '[api] narrations ensured -> inserted:',
          inserted,
          'total frames:',
          frames.length
        )
      } catch {}
    }
  } else if (raw && Array.isArray(raw.times) && raw.pattern) {
    // Shape: { pattern: "/api/lectures/1/frame/frame_%d.jpg", times: [0,2,4,...] }
    const pattern: string = String(raw.pattern)
    const times: any[] = raw.times
    frames = times.map((t: any, i: number) => {
      const urlPat = pattern
        .replace('%d', String(i))
        .replace('{index}', String(i))
        .replace('{i}', String(i))
      return {
        timeSec: Number(t) || i,
        url: toAbsoluteUrl(urlPat),
      }
    })
  } else if (raw && raw.pattern && (Number.isFinite(raw.count) || Array.isArray(raw.indices))) {
    // Shape: { pattern, count, intervalSec? } or { pattern, indices: [0,1,2], intervalSec? }
    const pattern: string = String(raw.pattern)
    const intervalSec = Number(raw.intervalSec ?? raw.interval_sec ?? 1) || 1
    const indices: number[] = Array.isArray(raw.indices)
      ? raw.indices.map((x: any) => Number(x) || 0)
      : Array.from({ length: Number(raw.count) || 0 }, (_, i) => i)
    frames = indices.map((i, k) => {
      const urlPat = pattern
        .replace('%d', String(i))
        .replace('{index}', String(i))
        .replace('{i}', String(i))
      return { timeSec: k * intervalSec, url: toAbsoluteUrl(urlPat) }
    })
  }
  frames = frames.filter((f) => !!f.url).sort((a, b) => a.timeSec - b.timeSec)
  try {
    // eslint-disable-next-line no-console
    console.log('[api] fetchLectureMetadata OK frames:', frames.length)
  } catch {}
  if (frames.length === 0) {
    // Fallback: synthesize a simple timeline using a conventional pattern
    const fallbackPattern = `${BACKEND_BASE}/api/lectures/${lectureNumericId}/frame/frame_%d.jpg`
    const fallbackCount = 60 // 60 frames, 1s interval → 1 minute demo
    const fallbackInterval = 1
    const generated: LectureFrame[] = Array.from({ length: fallbackCount }, (_, i) => ({
      timeSec: i * fallbackInterval,
      url: fallbackPattern.replace('%d', String(i)),
    }))
    try {
      // eslint-disable-next-line no-console
      console.warn('[api] metadata empty → using fallback pattern:', fallbackPattern, 'count=', fallbackCount)
    } catch {}
    return generated
  }
  return frames
}

export const getVideoPosition = async (lastPosition:Number) => {
  const json = await(await fetch(`${BACKEND_BASE}/api/lectures/1/last-position`, {method: 'PUT', body: JSON.stringify({last_position: lastPosition})})).json();
  console.log(json);
  return json;
}


