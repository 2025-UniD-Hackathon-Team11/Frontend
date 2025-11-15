import { useEffect, useState } from 'react'
import { fetchLectureList } from '../api/lectures'
import type { LectureSummary } from '../types'
import { Link } from 'react-router-dom'

export function LectureListPage() {
  const [items, setItems] = useState<LectureSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchLectureList()
      .then((list) => {
        if (!mounted) return
        setItems(list)
      })
      .finally(() => setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>DailyFit Lecture</h2>
      {loading && <div>로딩 중…</div>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {items.map((L) => (
          <Link
            key={L.id}
            to={`/lecture/${L.id}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div style={{ height: 140, background: '#f5f5f5' }}>
              <img
                src={L.thumbnailUrl}
                alt={L.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 700 }}>{L.title}</div>
              <div style={{ color: '#8c8c8c', fontSize: 13, margin: '4px 0 8px' }}>
                {L.description}
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                길이: {Math.round(L.durationSec / 60)}분 · 시청: {Math.round(L.progress * 100)}%
              </div>
              <div
                style={{
                  marginTop: 6,
                  background: '#f5f5f5',
                  height: 6,
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.round(L.progress * 100)}%`,
                    height: '100%',
                    background: '#ff4d4f',
                  }}
                />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
                {L.progress === 0
                  ? '처음부터 보기'
                  : L.progress === 1
                  ? '다시 보기'
                  : '이어보기'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}


