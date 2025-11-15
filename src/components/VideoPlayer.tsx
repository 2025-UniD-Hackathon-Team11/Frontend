import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export type VideoPlayerHandle = {
  play: () => void
  pause: () => void
  seekTo: (sec: number) => void
  getCurrentTime: () => number
}

type VideoPlayerProps = {
  src: string
  initialTimeSec: number
  isPausedExternally: boolean
  onTimeUpdate?: (currentTime: number) => void
  onReady?: (durationSec: number) => void
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  (props, ref) => {
    const { src, initialTimeSec, isPausedExternally, onTimeUpdate, onReady } = props
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const readyRef = useRef(false)

    useEffect(() => {
      const v = videoRef.current
      if (!v) return

      const onLoaded = () => {
        try {
          v.currentTime = Math.max(0, Math.min(v.duration || 0, initialTimeSec))
        } catch {}
        readyRef.current = true
        onReady?.(v.duration || 0)
      }
      v.addEventListener('loadedmetadata', onLoaded)
      return () => {
        v.removeEventListener('loadedmetadata', onLoaded)
      }
    }, [initialTimeSec, onReady])

    useEffect(() => {
      const v = videoRef.current
      if (!v) return
      if (isPausedExternally) {
        v.pause()
      }
    }, [isPausedExternally])

    useEffect(() => {
      const v = videoRef.current
      if (!v) return
      const handler = () => {
        onTimeUpdate?.(v.currentTime)
      }
      v.addEventListener('timeupdate', handler)
      return () => v.removeEventListener('timeupdate', handler)
    }, [onTimeUpdate])

    useImperativeHandle(ref, (): VideoPlayerHandle => ({
      play() {
        const v = videoRef.current
        if (!v) return
        v.play()
      },
      pause() {
        const v = videoRef.current
        if (!v) return
        v.pause()
      },
      seekTo(sec: number) {
        const v = videoRef.current
        if (!v) return
        try {
          v.currentTime = sec
        } catch {}
      },
      getCurrentTime() {
        const v = videoRef.current
        return v ? v.currentTime : 0
      },
    }))

    return (
      <div style={{ width: '100%', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          src={src}
          controls
          style={{ width: '100%', display: 'block' }}
        />
      </div>
    )
  }
)


