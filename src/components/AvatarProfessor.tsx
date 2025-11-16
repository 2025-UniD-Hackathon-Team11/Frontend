import type { DailyMode, DifficultyMode, PlayerAvatarState } from '../types'
import {useEffect, useRef} from 'react';

export function AvatarProfessor(props: {
  state: PlayerAvatarState
  dailyMode: DailyMode
  difficultyMode: DifficultyMode
  speakingTextSnippet?: string
}) {
  const { state, speakingTextSnippet, dailyMode, difficultyMode } = props
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, [state]);

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
  const professorRef = useRef<HTMLVideoElement>(null);
  if(state == 'thinking' && !isFirstRender.current) professorRef.current?.play();

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
            height: 180,
            position: 'relative',
            // background:
            // isFirstRender.current? 'url(../public/imgs/professor.png) center/cover no-repeat' : (
            //   state === 'idle'
            //     ? 'url(../public/imgs/smile.png) center/cover no-repeat'
            //     : 'url(../public/imgs/professor.png) center/cover no-repeat'),
            borderRadius: 12,
            border: `2px solid ${accent}`,
          }}
        >
          <video src='../public/video.mp4'  width="180" height="240" style={{ objectFit: 'cover' }} id='professor' ref={professorRef}/>

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


