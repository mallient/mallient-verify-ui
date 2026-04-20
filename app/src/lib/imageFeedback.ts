// ---------------------------------------------------------------------------
// Types (unchanged)
// ---------------------------------------------------------------------------
export type FeedbackStatus = 'scanning' | 'warning' | 'error' | 'ready';
export type IssueSeverity  = 'block' | 'warn';
export type CheckMode      = 'document' | 'face';

export interface FeedbackIssue  { code: string; message: string; severity: IssueSeverity; }
export interface FeedbackState  { status: FeedbackStatus; primaryIssue: FeedbackIssue | null; allIssues: FeedbackIssue[]; readinessScore: number; }
export interface BlurResult     { isBlurry: boolean; score: number; }
export interface ExposureResult { tooDark: boolean; tooBright: boolean; hasGlare: boolean; brightness: number; }
export interface DocumentEdgeResult { documentFound: boolean; tooFar: boolean; tooClose: boolean; isTilted: boolean; fillRatio: number; }

export interface FaceResult {
  status: 'ok' | 'no_face' | 'multiple_faces' | 'too_far' | 'off_center';
  confidence?: number;
  centerX?: number;
  centerY?: number;
  bbox?: { xMin: number; yMin: number; xMax: number; yMax: number };
}

// ---------------------------------------------------------------------------
// Issue catalogue (unchanged)
// ---------------------------------------------------------------------------
const ISSUES: Record<string, FeedbackIssue> = {
  BLURRY:           { code: 'blurry',          message: 'Hold still — image is blurry',           severity: 'block' },
  TOO_DARK:         { code: 'too_dark',         message: 'Move to a brighter area',                severity: 'block' },
  TOO_BRIGHT:       { code: 'too_bright',       message: 'Image is overexposed',                   severity: 'block' },
  GLARE:            { code: 'glare',            message: 'Reduce glare on the document',           severity: 'block' },
  NO_DOCUMENT:      { code: 'no_doc',           message: 'Align document within the frame',        severity: 'block' },
  DOC_TOO_FAR:      { code: 'doc_too_far',      message: 'Move document closer',                   severity: 'block' },
  DOC_TOO_CLOSE:    { code: 'doc_too_close',    message: 'Move document further away',             severity: 'warn'  },
  TILTED:           { code: 'tilted',           message: 'Straighten the document',                severity: 'warn'  },
  NO_FACE:      { code: 'no_face',      message: 'Position your face in the oval',    severity: 'block' },
  MULTI_FACE:   { code: 'multi_face',   message: 'Only one person should be visible', severity: 'block' },
  FACE_TOO_FAR: { code: 'face_too_far', message: 'Move closer to the camera',          severity: 'block' },
  OFF_CENTER:   { code: 'off_center',   message: 'Center your face in the frame',      severity: 'block' },
};

const ISSUE_PRIORITY = [
  'no_face','multi_face','no_doc',
  'too_dark','too_bright','glare','blurry',
  'face_too_far','doc_too_far','doc_too_close',
  'off_center','tilted',
];

// ---------------------------------------------------------------------------
// Image utilities (unchanged)
// ---------------------------------------------------------------------------
function toGrayscale(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const b = i * 4;
    gray[i] = 0.299 * data[b] + 0.587 * data[b+1] + 0.114 * data[b+2];
  }
  return gray;
}

function applyKernel(gray: Float32Array, kernel: number[][], w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  const half = Math.floor(kernel.length / 2);
  for (let y = half; y < h - half; y++)
    for (let x = half; x < w - half; x++) {
      let sum = 0;
      for (let ky = 0; ky < kernel.length; ky++)
        for (let kx = 0; kx < kernel.length; kx++)
          sum += gray[(y+ky-half)*w + (x+kx-half)] * kernel[ky][kx];
      out[y*w+x] = sum;
    }
  return out;
}

function computeVariance(data: Float32Array): number {
  let sum = 0, sumSq = 0;
  for (let i = 0; i < data.length; i++) { sum += data[i]; sumSq += data[i]*data[i]; }
  const m = sum / data.length;
  return sumSq / data.length - m * m;
}

export function detectBlur(canvas: HTMLCanvasElement): BlurResult {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { isBlurry: false, score: 999 };
  const id  = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const lap = applyKernel(toGrayscale(id), [[0,1,0],[1,-4,1],[0,1,0]], canvas.width, canvas.height);
  const v   = computeVariance(lap);
  return { isBlurry: v < 100, score: v };
}

export function analyzeExposure(imageData: ImageData): ExposureResult {
  const { data } = imageData;
  let sum = 0, dark = 0, bright = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];
    sum += l;
    if (l < 50)  dark++;
    if (l > 220) bright++;
  }
  const avg = sum / n;
  return { tooDark: avg < 60, tooBright: avg > 200, hasGlare: (bright/n) > 0.15, brightness: avg };
}

declare const cv: any;

export function detectDocumentEdges(canvas: HTMLCanvasElement): DocumentEdgeResult {
  const fallback: DocumentEdgeResult = { documentFound: false, tooFar: false, tooClose: false, isTilted: false, fillRatio: 0 };
  if (typeof cv === 'undefined' || !cv.imread) return fallback;
  let src: any, gray: any, edges: any, contours: any, hierarchy: any;
  try {
    src = cv.imread(canvas); gray = new cv.Mat(); edges = new cv.Mat();
    contours = new cv.MatVector(); hierarchy = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5,5), 0);
    cv.Canny(gray, edges, 50, 150);
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const imgArea = canvas.width * canvas.height;
    let bestFill = 0, bestAngle = 0, found = false;
    for (let i = 0; i < contours.size(); i++) {
      const approx = new cv.Mat();
      cv.approxPolyDP(contours.get(i), approx, 0.02 * cv.arcLength(contours.get(i), true), true);
      if (approx.rows === 4) {
        const fill = cv.contourArea(approx) / imgArea;
        if (fill > 0.15) {
          found = true;
          if (fill > bestFill) {
            bestFill = fill;
            const pts = Array.from({length:4}, (_,p) => ({ x: approx.intAt(p,0), y: approx.intAt(p,1) }));
            pts.sort((a,b) => a.y - b.y);
            const bot = pts.slice(2).sort((a,b) => a.x - b.x);
            bestAngle = Math.abs(Math.atan2(bot[1].y-bot[0].y, bot[1].x-bot[0].x) * 180/Math.PI);
          }
        }
      }
      approx.delete();
    }
    return { documentFound: found, tooFar: found && bestFill < 0.25, tooClose: found && bestFill > 0.85, isTilted: found && bestAngle > 15, fillRatio: bestFill };
  } catch { return fallback; }
  finally { src?.delete(); gray?.delete(); edges?.delete(); contours?.delete(); hierarchy?.delete(); }
}

// ---------------------------------------------------------------------------
// Frame analyser — accepts face result injected from worker
// ---------------------------------------------------------------------------
export function analyseFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  mode: CheckMode,
  faceResult?: FaceResult | null,
): FeedbackState {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { status: 'error', primaryIssue: null, allIssues: [], readinessScore: 0 };

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const exposure  = analyzeExposure(imageData);
  const blur      = detectBlur(canvas);
  const detected: FeedbackIssue[] = [];

  if (exposure.tooDark)   detected.push(ISSUES.TOO_DARK);
  if (exposure.tooBright) detected.push(ISSUES.TOO_BRIGHT);
  if (exposure.hasGlare)  detected.push(ISSUES.GLARE);
  if (blur.isBlurry)      detected.push(ISSUES.BLURRY);

  if (mode === 'face') {
    if (!faceResult || faceResult.status === 'no_face') {
      detected.push(ISSUES.NO_FACE);
    } else if (faceResult.status === 'multiple_faces') {
      detected.push(ISSUES.MULTI_FACE);
    } else if (faceResult.status === 'too_far') {
      detected.push(ISSUES.FACE_TOO_FAR);
    } else if (faceResult.status === 'off_center') {
      detected.push(ISSUES.OFF_CENTER);
    }
    // status === 'ok' → no issues added → overall status becomes 'ready' → green border
  }

  if (mode === 'document') {
    try {
      if (typeof cv !== 'undefined' && cv?.imread) {
        const doc = detectDocumentEdges(canvas);
        if (!doc.documentFound) detected.push(ISSUES.NO_DOCUMENT);
        if (doc.tooFar)          detected.push(ISSUES.DOC_TOO_FAR);
        if (doc.tooClose)        detected.push(ISSUES.DOC_TOO_CLOSE);
        if (doc.isTilted)        detected.push(ISSUES.TILTED);
      }
    } catch { /* OpenCV not ready */ }
  }

  const sorted      = [...detected].sort((a,b) => (ISSUE_PRIORITY.indexOf(a.code)+1||999) - (ISSUE_PRIORITY.indexOf(b.code)+1||999));
  const primaryIssue    = sorted[0] ?? null;
  const blockingCount   = detected.filter(i=>i.severity==='block').length;
  const warnCount       = detected.filter(i=>i.severity==='warn').length;
  const readinessScore  = Math.max(0, 1 - blockingCount*0.4 - warnCount*0.1);
  const status: FeedbackStatus = blockingCount > 0 ? 'error' : warnCount > 0 ? 'warning' : 'ready';

  return { status, primaryIssue, allIssues: detected, readinessScore };
}