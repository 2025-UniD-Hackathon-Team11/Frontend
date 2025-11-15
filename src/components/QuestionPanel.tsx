import { useState } from 'react'

export function QuestionPanel(props: {
  messages: { role: 'user' | 'assistant'; content: string }[]
  isListening: boolean
  interimText?: string
  onMicStart: () => void
  onMicStop: () => void
  onSendText: (text: string) => void
  onTextModeStart?: () => void
}) {
  const { messages, isListening, interimText, onMicStart, onMicStop, onSendText, onTextModeStart } = props
  const [isTextMode, setIsTextMode] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 12,
          height: 220,
          overflowY: 'auto',
          boxShadow: '0 4px 14px rgba(17,24,39,0.06)',
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: 13 }}>질문과 답변이 여기에 표시됩니다.</div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: m.role === 'user' ? '#eef2ff' : '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '8px 10px',
                maxWidth: '70%',
                whiteSpace: 'pre-wrap',
                fontSize: 13,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isListening && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
            🎤 듣는 중… {interimText || ''}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {!isListening ? (
            <button
              onClick={() => onMicStart()}
              title="마이크 질문"
              style={{
                background: '#111827',
                color: '#fff',
                border: '1px solid #111827',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 12,
              }}
            >
              🎤 말하기
            </button>
          ) : (
            <button
              onClick={() => onMicStop()}
              title="음성 인식 종료"
              style={{
                background: '#ef4444',
                color: '#fff',
                border: '1px solid #ef4444',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 12,
              }}
            >
              ⏹ 종료
            </button>
          )}
          <button
            onClick={() => {
              setIsTextMode((v) => {
                const next = !v
                if (next) onTextModeStart?.()
                return next
              })
            }}
            title="텍스트 질문"
            style={{
              background: 'transparent',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 12,
            }}
          >
            💬 텍스트
          </button>
        </div>
        {isTextMode && (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="텍스트로 질문을 입력하세요"
              style={{
                flex: 1,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 13,
              }}
            />
            <button
              onClick={() => {
                const t = draft.trim()
                if (!t) return
                onSendText(t)
                setDraft('')
                setIsTextMode(false)
              }}
              style={{
                background: '#111827',
                color: '#fff',
                border: '1px solid #111827',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 12,
              }}
            >
              전송
            </button>
          </>
        )}
      </div>
    </div>
  )
}


