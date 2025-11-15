import type { DailyMode, DifficultyMode, PlayerAvatarState } from '../types'

export function AvatarProfessor(props: {
  state: PlayerAvatarState
  dailyMode: DailyMode
  difficultyMode: DifficultyMode
  speakingTextSnippet?: string
}) {
  const { state, speakingTextSnippet, dailyMode, difficultyMode } = props

  const label =
    state === 'idle'
      ? '강의를 진행 중입니다.'
      : state === 'listening'
      ? '지금 질문을 듣고 있어요.'
      : state === 'thinking'
      ? '질문에 대해 생각 중이에요…'
      : '질문에 답변하는 중입니다.'

  const accent =
    state === 'listening'
      ? '#FFD666'
      : state === 'talking'
      ? '#91D5FF'
      : '#B7EB8F'

  return (
    <div
      style={{
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 180,
            height: 200,
            position: 'relative',
            background:
              state === 'talking'
                ? 'linear-gradient(180deg, #e6f7ff, #ffffff)'
                : 'linear-gradient(180deg, #f6ffed, #ffffff)',
            borderRadius: 12,
            border: `2px solid ${accent}`,
          }}
        >
          {/* Head */}
          <div
            style={{
              position: 'absolute',
              top: 22,
              left: 60,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#FFE7BA',
              border: '2px solid #d9d9d9',
              transform: state === 'listening' ? 'rotate(-6deg)' : state === 'idle' ? 'rotate(3deg)' : 'none',
              transition: 'transform 200ms ease',
            }}
          />
          {/* Body */}
          <div
            style={{
              position: 'absolute',
              top: 78,
              left: 38,
              width: 104,
              height: 96,
              borderRadius: 12,
              background: '#F0F5FF',
              border: '2px solid #d6e4ff',
            }}
          />
          {/* Left arm (pointer) */}
          <div
            style={{
              position: 'absolute',
              top: 96,
              left: 18,
              width: 60,
              height: 10,
              borderRadius: 5,
              background: '#ffd6e7',
              transform: state === 'idle' ? 'rotate(-15deg)' : state === 'talking' ? 'rotate(-5deg)' : 'rotate(0deg)',
              transformOrigin: 'right',
              transition: 'transform 180ms ease',
            }}
          />
          {/* Right arm (listening) */}
          <div
            style={{
              position: 'absolute',
              top: 96,
              right: 18,
              width: 60,
              height: 10,
              borderRadius: 5,
              background: '#ffd6e7',
              transform:
                state === 'listening' ? 'rotate(25deg)' : 'rotate(5deg)',
              transformOrigin: 'left',
              transition: 'transform 180ms ease',
            }}
          />

          {/* Chat bubble for answering */}
          {state === 'talking' && speakingTextSnippet ? (
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 10,
                right: 10,
                fontSize: 12,
                background: '#ffffff',
                border: '1px solid #e6f7ff',
                borderRadius: 8,
                padding: '6px 8px',
                color: '#0050b3',
                maxHeight: 48,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={speakingTextSnippet}
            >
              {speakingTextSnippet}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontWeight: 600,
          color: '#595959',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#8c8c8c' }}>
        {state === 'idle'
          ? '핵심 개념을 차근차근 설명 중입니다.'
          : state === 'listening'
          ? '마이크로 질문을 말씀해 주세요.'
          : state === 'thinking'
          ? '곧 답변을 준비해 드릴게요.'
          : '질문에 대한 답을 말하고 있어요.'}
      </div>

      <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#8c8c8c' }}>
        오늘 모드: {dailyMode ?? 'normal'} · 난이도: {difficultyMode}
      </div>
    </div>
  )
}


