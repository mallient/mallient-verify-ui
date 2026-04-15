// src/hooks/useFaceLiveness.ts
import { useEffect, useRef, useState, useCallback } from 'react'

export type LivenessState = 'idle' | 'initializing' | 'scanning' | 'passed' | 'failed' | 'error'

interface UseFaceLivenessOptions {
  threshold?: number          // liveness score to pass, default 0.85
  requiredFrames?: number     // consecutive passing frames needed, default 3
  onResult: (score: number) => void
}

export function useFaceLiveness({
  threshold = 0.85,
  requiredFrames = 3,
  onResult,
}: UseFaceLivenessOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const passingFrames = useRef(0)
  const isProcessing = useRef(false)

  const [state, setState] = useState<LivenessState>('idle')
  const [score, setScore] = useState(0)

  // Boot the worker
  useEffect(() => {
    setState('initializing')
    const worker = new Worker(
      new URL('../workers/livenessWorker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (e) => {
      const { type, livenessScore, faceDetected } = e.data

      if (type === 'ready') {
        startCamera()
        return
      }

      if (type === 'result') {
        isProcessing.current = false
        if (!faceDetected) return

        setScore(livenessScore)

        if (livenessScore >= threshold) {
          passingFrames.current += 1
          if (passingFrames.current >= requiredFrames) {
            setState('passed')
            stopAll()
            onResult(livenessScore)
            return
          }
        } else {
          passingFrames.current = 0
        }
      }

      if (type === 'error') {
        setState('error')
        stopAll()
      }
    }

    worker.postMessage({ type: 'init' })

    return () => stopAll()
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setState('scanning')
        startDetectionLoop()
      }
    } catch {
      setState('error')
    }
  }, [])

  const startDetectionLoop = useCallback(() => {
    const loop = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const worker = workerRef.current

      if (!video || !canvas || !worker || isProcessing.current) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const ctx = canvas.getContext('2d')!
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      isProcessing.current = true
      // Transfer the buffer to avoid copying — worker owns it now
      worker.postMessage(
        { type: 'detect', imageData: imageData.data, width: canvas.width, height: canvas.height },
        [imageData.data.buffer]
      )

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    workerRef.current?.terminate()
  }, [])

  return { videoRef, canvasRef, state, score }
}