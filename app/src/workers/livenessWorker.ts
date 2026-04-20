import { FaceDetection } from 'faceplugin-face-recognition-js'

let detector: FaceDetection | null = null

async function init() {
  detector = new FaceDetection()
  await detector.init('/faceplugin-models')
  self.postMessage({ type: 'ready' })
}

self.onmessage = async (e: MessageEvent) => {
  const { type, imageData, width, height } = e.data

  if (type === 'init') {
    try {
      await init()
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
    return
  }

  if (type === 'detect') {
    if (!detector) {
      self.postMessage({ type: 'error', message: 'Detector not initialized' })
      return
    }

    try {
      // Pass raw ImageData pixels to the detector
      const result = await detector.detectLiveness(imageData, width, height)
      self.postMessage({
        type: 'result',
        livenessScore: result.livenessScore,   // 0.0 – 1.0
        faceDetected: result.faceDetected,
        boundingBox: result.boundingBox,        // { x, y, width, height }
      })
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) })
    }
  }
}