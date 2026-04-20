import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as tf from '@tensorflow/tfjs-core';
import * as faceDetection from '@tensorflow-models/face-detection';

let detector: faceDetection.FaceDetector | null = null;

// ── Init ──────────────────────────────────────────────────────────────────
async function init() {
  try {
    await tf.ready();
    detector = await faceDetection.createDetector(
      faceDetection.SupportedModels.MediaPipeFaceDetector,
      { runtime: 'tfjs', maxFaces: 2 },
    );
    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
}

// ── Detect ────────────────────────────────────────────────────────────────
async function detect(bitmap: ImageBitmap) {
  if (!detector) {
    bitmap.close();
    self.postMessage({ type: 'result', status: 'no_face' });
    return;
  }
  try {
    const faces = await detector.estimateFaces(bitmap);
    const { width, height } = bitmap;
    bitmap.close();

    if (faces.length === 0) {
      self.postMessage({ type: 'result', status: 'no_face' });
      return;
    }
    if (faces.length > 1) {
      self.postMessage({ type: 'result', status: 'multiple_faces' });
      return;
    }

    const { xMin, xMax, yMin, yMax } = faces[0].box;
    const boxW = (xMax - xMin) / width;
    const boxH = (yMax - yMin) / height;
    const cx   = ((xMin + xMax) / 2) / width;
    const cy   = ((yMin + yMax) / 2) / height;

    if (boxW < 0.2 || boxH < 0.25) {
      self.postMessage({ type: 'result', status: 'too_far' });
      return;
    }
    if (cx < 0.3 || cx > 0.7) {
      self.postMessage({ type: 'result', status: 'off_center' });
      return;
    }

    self.postMessage({ type: 'result', status: 'ok', confidence: faces[0].score ?? 1, centerX: cx, centerY: cy, bbox: { xMin, yMin, xMax, yMax } });
  } catch {
    self.postMessage({ type: 'result', status: 'no_face' });
  }
}

// ── Message handler ───────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'init')   init();
  if (e.data.type === 'detect') detect(e.data.bitmap);
};