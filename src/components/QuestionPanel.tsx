import { useState } from 'react'

export function QuestionPanel(props: {
  messages: { role: 'user' | 'assistant'; content: string }[]
  isListening: boolean
  interimText?: string
  onMicStart: () => void
  onMicStop: () => void
  onSendText: (text: string) => void
}) {
  const { messages, isListening, interimText, onMicStart, onMicStop, onSendText } = props
  const [isTextMode, setIsTextMode] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 10,
          height: 240,
          overflowY: 'auto',
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#999' }}>질문과 답변이 여기에 표시됩니다.</div>
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
                background: m.role === 'user' ? '#e6f7ff' : '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                padding: '6px 8px',
                maxWidth: '70%',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isListening && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#ad8b00' }}>
            🎤 듣는 중… {interimText || ''}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {!isListening ? (
          <button
            onClick={() => onMicStart()}
            style={{ background: '#ffd666', border: '1px solid #ffe58f' }}
            title="마이크 질문"
          >
            🎤
          </button>
        ) : (
          <button onClick={() => onMicStop()} title="음성 인식 종료">
            ⏹
          </button>
        )}
        <button onClick={() => setIsTextMode((v) => !v)} title="텍스트 질문">
          💬
        </button>
        {isTextMode && (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="텍스트로 질문을 입력하세요"
              style={{ flex: 1 }}
            />
            <button
              onClick={() => {
                const t = draft.trim()
                if (!t) return
                onSendText(t)
                setDraft('')
                setIsTextMode(false)
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


