import { useEffect, useRef, useState } from 'react'

export function useAudioPlayer(audioUrl?: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (audioUrl && audioUrl !== urlRef.current) {
      if (audioRef.current) {
        try {
          audioRef.current.pause()
        } catch {}
      }
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      urlRef.current = audioUrl
      audio.onended = () => {
        setIsPlaying(false)
      }
    }
    // cleanup when unmount
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause()
        } catch {}
      }
    }
  }, [audioUrl])

  const play = async () => {
    const a = audioRef.current
    if (!a) return
    try {
      await a.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }

  const stop = () => {
    const a = audioRef.current
    if (!a) return
    try {
      a.pause()
      a.currentTime = 0
    } catch {}
    setIsPlaying(false)
  }

  return { isPlaying, play, stop, audioRef }
}


