import { useEffect, useState } from 'react'
import { fetchLectureList } from '../api/lectures'
import type { LectureSummary } from '../types'
import { Link, useNavigate } from 'react-router-dom'

const categories = ['전체', '컴퓨터네트워크', '프론트엔드', '백엔드', 'DB', '운영체제', 'Mobile']

export function LectureListPage() {
  const [items, setItems] = useState<LectureSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState('');
  const [filtered, setFiltered] = useState<LectureSummary[]>([]);
  const [categoriedItems, setCitems] = useState<LectureSummary[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('전체')
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    fetchLectureList()
      .then((list) => {
        if (!mounted) return
        // Merge local saved progress into list
        const merged = list.map((L) => {
          try {
            const raw = localStorage.getItem(`uniD:progress:${L.id}`)
            if (raw != null) {
              const sec = parseFloat(raw)
              if (Number.isFinite(sec) && sec >= 0) {
                const pLocal = L.durationSec > 0 ? Math.max(0, Math.min(1, sec / L.durationSec)) : 0
                return {
                  ...L,
                  lastWatchedSec: sec,
                  progress: Math.max(L.progress ?? 0, pLocal),
                }
              }
            }
          } catch {}
          return L
        })
        setItems(merged)
        setCitems(merged)
      })
      .finally(() => setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  const ItemContent = ({id, thumbnailUrl, title, description, durationSec, progress, lastWatchedSec}:LectureSummary) => {
    return (
      <Link
            key={id}
            to={`/lecture/${id}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              background: '#fff',
              border: '1px solid black',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div style={{ height: 140, background: '#f5f5f5' }}>
              <img
                src={thumbnailUrl}
                alt={title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 700 }}>{title}</div>
              <div style={{ color: '#8c8c8c', fontSize: 13, margin: '4px 0 8px' }}>
                {description}
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                길이: {Math.round(durationSec / 60)}분 · 시청: {Math.round(progress * 100)}%
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
                    width: `${Math.round(progress * 100)}%`,
                    height: '100%',
                    background: '#ff4d4f',
                  }}
                />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>
                {progress === 0
                  ? '처음부터 보기'
                  : progress === 1
                  ? '다시 보기'
                  : '이어보기'}
              </div>
              {lastWatchedSec && lastWatchedSec > 0 && progress < 1 ? (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(`/lecture/${id}?resume=1`)
                    }}
                    style={{
                      background: '#111827',
                      color: '#ffffff',
                      border: '1px solid #111827',
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    title="저장된 진행 위치로 이어보기"
                  >
                    저장된 진행 위치로 이어보기
                  </button>
                </div>
              ) : null}
            </div>
          </Link>
    )
  }

  const onChange = (e:React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setValue(value);
    const f = items.filter((item) => {
      return item.title.includes(value);
    })
    console.log(f);
    setFiltered(f);
  }

  const onClick = (e:any) => {
    const val = e.target?.id;
    setSelectedCat(val)
    console.log(val)
    if(val != '전체') {
      const c = items.filter((item) => {
        return item.category == val;
      })
      setCitems(c);
    }
    else setCitems(items);
  }

  return (
    <div
      style={{
        padding: 16,
        maxWidth: 1200,
        margin: '0 auto',
        overflowX: 'hidden',
        background: 'linear-gradient(180deg, #f7fafc 0%, #ffffff 40%, #f5fbff 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Sticky header with search */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: '#111827',
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          border: '1px solid rgba(17,24,39,0.08)',
          boxShadow: '0 8px 24px rgba(17,24,39,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.2 }}>UrunFit</h2>
          <span style={{ color: '#6b7280', fontSize: 12 }}>오늘의 나에게 맞춘 AI 강의</span>
        </div>
        <input
          value={value}
          onChange={onChange}
          placeholder='검색'
          style={{
            border: '1px solid rgba(17,24,39,0.12)',
            borderRadius: 12,
            padding: '10px 12px',
            outline: 'none',
            width: 'min(360px, 50%)',
            backgroundColor: 'white',
            color: '#111827',
            boxShadow: '0 3px 10px rgba(0,0,0,0.04) inset',
          }}
        />
      </div>

      {/* Sticky categories bar */}
      <div
        style={{
          position: 'sticky',
          top: 58,
          zIndex: 2,
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(17,24,39,0.08)',
          borderRadius: 14,
          padding: '10px 12px',
          marginTop: 12,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 18px rgba(17,24,39,0.05)',
        }}
      >
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={onClick}
            id={c}
            style={{
              marginRight: 10,
              cursor: 'pointer',
              background: selectedCat === c ? 'rgba(99,102,241,0.10)' : 'transparent',
              border: selectedCat === c ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
              borderRadius: 999,
              padding: '6px 10px',
              display: 'inline-block',
              color: selectedCat === c ? '#4f46e5' : '#111827',
              fontWeight: selectedCat === c ? ('bold' as any) : 500,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <div style={{ marginTop: 16 }}>로딩 중…</div>}

      {/* Grid list */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 12,
          marginTop: 16,
          alignItems: 'stretch',
        }}
      >
        {(value ? filtered : categoriedItems).map((L) => (
          <ItemContent
            key={L.id}
            id={L.id}
            thumbnailUrl={L.thumbnailUrl}
            title={L.title}
            description={L.description}
            durationSec={L.durationSec}
            progress={L.progress}
          />
        ))}
      </div>
    </div>
  )
}