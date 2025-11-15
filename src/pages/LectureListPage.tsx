import { useEffect, useState } from 'react'
import { fetchLectureList } from '../api/lectures'
import type { LectureSummary } from '../types'
import { Link } from 'react-router-dom'
import styled from 'styled-components';

const Input = styled.input`
  border: 1px solid black;
  border-radius: 10px;
  padding: 5px;
  outline: none;
  width: 30%;
  background-color: white;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
`;

export function LectureListPage() {
  const [items, setItems] = useState<LectureSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState('');
  const [filtered, setFiltered] = useState<LectureSummary[]>([]);

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

  const ItemContent = ({id, thumbnailUrl, title, description, durationSec, progress}:LectureSummary) => {
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

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto'}}>
      <div style={{marginBottom: '15px', position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: '0', backgroundColor: 'black', width: '100%', padding: '20px', display: 'flex', flexDirection: 'row'}}>
        <h2 style={{ marginTop: 0, fontSize: '20px', fontWeight: 'bolder', color: 'white' }}>DailyFit Lecture</h2>
        <Input value={value} onChange={onChange} placeholder='검색'/>
      </div>
      {loading && <div>로딩 중…</div>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(260px, 1fr))',
          gap: 12,
          marginTop: '80px',
        }}
      >
        { value? filtered.map(f => (
          <ItemContent 
            id={f.id}
            thumbnailUrl={f.thumbnailUrl}
            title={f.title}
            description={f.description}
            durationSec={f.durationSec}
            progress={f.progress}
          />
        )) : items.map((L) => (
            <ItemContent 
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


