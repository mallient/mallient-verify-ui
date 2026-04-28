import { useRef, useState, useEffect, useCallback } from "react";
import * as ort from 'onnxruntime-web';
import { Button } from "../ui/button";
import {
    analyseFrame,
    type FeedbackState, type FeedbackIssue, type FaceResult,
} from "@/lib/imageFeedback";

/** Crop face from video frame and run liveness ONNX inference. Returns score in [0,1]. */
async function runLivenessInference(
    session: ort.InferenceSession,
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    bbox: { xMin: number; yMin: number; xMax: number; yMax: number },
): Promise<number> {
    const SCALE = 2.7;
    const cx = (bbox.xMin + bbox.xMax) / 2;
    const cy = (bbox.yMin + bbox.yMax) / 2;
    const bw = (bbox.xMax - bbox.xMin) * SCALE;
    const bh = (bbox.yMax - bbox.yMin) * SCALE;
    const sx = Math.max(0, cx - bw / 2);
    const sy = Math.max(0, cy - bh / 2);
    const sw = Math.min(video.videoWidth - sx, bw);
    const sh = Math.min(video.videoHeight - sy, bh);

    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 128, 128);
    const id = ctx.getImageData(0, 0, 128, 128);

    // Convert RGBA ImageData → CHW float32 [1, 3, 128, 128] (raw 0-255)
    const float32 = new Float32Array(3 * 128 * 128);
    for (let i = 0; i < 128 * 128; i++) {
        float32[i]                 = id.data[i * 4];     // R
        float32[128 * 128 + i]     = id.data[i * 4 + 1]; // G
        float32[2 * 128 * 128 + i] = id.data[i * 4 + 2]; // B
    }

    const inputTensor = new ort.Tensor('float32', float32, [1, 3, 128, 128]);
    const results = await session.run({ input: inputTensor });
    const logits = results['output'].data as Float32Array;

    // Softmax — class 0 is the liveness (live) score
    const maxLogit = Math.max(logits[0], logits[1]);
    const e0 = Math.exp(logits[0] - maxLogit);
    const e1 = Math.exp(logits[1] - maxLogit);
    return e0 / (e0 + e1);
}

const LIVENESS_THRESHOLD = 0.70;
const REQUIRED_LIVENESS_FRAMES = 2;

const SELFIE_STATE_STYLE: Record<string, { border: string; glow: string; pill: string }> = {
    scanning: {
        border: "rgba(139,92,246,0.65)",
        glow:   "0 0 0 9999px rgba(0,0,0,0.55), 0 0 28px 6px rgba(139,92,246,0.3)",
        pill:   "bg-violet-950/70 border border-violet-500/40 text-violet-100 backdrop-blur-sm",
    },
    ready: {
        border: "rgba(16,185,129,0.95)",
        glow:   "0 0 0 9999px rgba(0,0,0,0.45), 0 0 40px 10px rgba(16,185,129,0.5)",
        pill:   "bg-emerald-950/70 border border-emerald-500/40 text-emerald-100 backdrop-blur-sm",
    },
    warning: {
        border: "rgba(245,158,11,0.95)",
        glow:   "0 0 0 9999px rgba(0,0,0,0.55), 0 0 28px 6px rgba(245,158,11,0.4)",
        pill:   "bg-amber-950/70 border border-amber-500/40 text-amber-100 backdrop-blur-sm",
    },
    error: {
        border: "rgba(239,68,68,0.95)",
        glow:   "0 0 0 9999px rgba(0,0,0,0.55), 0 0 28px 6px rgba(239,68,68,0.4)",
        pill:   "bg-rose-950/70 border border-rose-500/40 text-rose-100 backdrop-blur-sm",
    },
};

interface SelfieCaptureProps {
    onCapture: (imageData: string, score: number, livenessScore: number, facialBiometricsToken: string | null) => void;
    onCancel: () => void;
    instructions: string;
    guidanceText?: string;
}

export const SelfieCapture = ({ onCapture, onCancel, instructions, guidanceText }: SelfieCaptureProps) => {
    const videoRef          = useRef<HTMLVideoElement>(null);
    const canvasRef         = useRef<HTMLCanvasElement>(null);
    const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef         = useRef<MediaStream | null>(null);
    const mountedRef        = useRef(true);
    const animFrameRef      = useRef<number>(0);
    const workerRef         = useRef<Worker | null>(null);
    const faceResultRef     = useRef<FaceResult | null>(null);
    const workerBusyRef     = useRef(false);

    const [isReady, setIsReady]                     = useState(false);
    const [error, setError]                         = useState<string | null>(null);
    const [feedbackState, setFeedbackState]         = useState<FeedbackState | null>(null);
    const [capturedImage, setCapturedImage]         = useState<string | null>(null);
    const [capturedScore, setCapturedScore]         = useState<number>(0);
    const [reviewIssues, setReviewIssues]           = useState<FeedbackIssue[]>([]);

    // Liveness refs
    const livenessSessionRef  = useRef<ort.InferenceSession | null>(null);
    const livenessCanvasRef   = useRef<HTMLCanvasElement | null>(null);
    const livenessRunningRef  = useRef(false);
    const faceBboxRef         = useRef<{ xMin: number; yMin: number; xMax: number; yMax: number } | null>(null);
    const passingFramesRef    = useRef(0);
    const passingScoresRef    = useRef<number[]>([]);
    const hasCapturedRef      = useRef(false);
    const livenessScoreRef    = useRef(0);

    // Feature extraction refs
    const featureSessionRef   = useRef<ort.InferenceSession | null>(null);
    const featureCanvasRef    = useRef<HTMLCanvasElement | null>(null);

    // Liveness state
    const [livenessState, setLivenessState]               = useState<'scanning' | 'passed'>('scanning');
    const [livenessScore, setLivenessScore]               = useState(0);
    const [capturedLivenessScore, setCapturedLivenessScore] = useState(0);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                try {
                    await videoRef.current.play();
                    if (mountedRef.current) setIsReady(true);
                } catch (e) {
                    if (e instanceof Error && e.name === "AbortError") return;
                    throw e;
                }
            }
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            if (mountedRef.current) setError("Unable to access camera. Please grant camera permissions.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    // Camera start/stop
    useEffect(() => {
        mountedRef.current = true;
        startCamera();
        return () => { mountedRef.current = false; stopCamera(); };
    }, [startCamera, stopCamera]);

    // Face worker lifecycle
    useEffect(() => {
        const worker = new Worker(
            new URL("../../lib/faceWorker.ts", import.meta.url),
            { type: "module" }
        );
        worker.onmessage = (e) => {
            if (e.data.type === "result") {
                faceResultRef.current = e.data as FaceResult;
                faceBboxRef.current = e.data.status === 'ok' ? (e.data.bbox ?? null) : null;
                workerBusyRef.current = false;
            }
            if (e.data.type === "error") {
                console.error("Face worker:", e.data.message);
                workerBusyRef.current = false;
            }
        };
        worker.onerror = (e) => {
            console.error("Face worker uncaught:", e.message);
            workerBusyRef.current = false;
        };
        worker.postMessage({ type: "init" });
        workerRef.current = worker;
        return () => { worker.terminate(); workerRef.current = null; };
    }, []);

    // Load liveness ONNX model
    useEffect(() => {
        livenessCanvasRef.current = document.createElement('canvas');
        featureCanvasRef.current  = document.createElement('canvas');
        let cancelled = false;
        ort.InferenceSession.create('/faceplugin-models/fr_liveness.onnx', {
            executionProviders: ['wasm'],
        }).then(session => {
            if (!cancelled) livenessSessionRef.current = session;
        }).catch(err => console.error('Failed to load liveness model:', err));
        ort.InferenceSession.create('/faceplugin-models/fr_feature.onnx', {
            executionProviders: ['wasm'],
        }).then(session => {
            if (!cancelled) featureSessionRef.current = session;
        }).catch(err => console.error('Failed to load feature model:', err));
        return () => {
            cancelled = true;
            livenessSessionRef.current = null;
            livenessCanvasRef.current = null;
            featureSessionRef.current = null;
            featureCanvasRef.current = null;
        };
    }, []);

    // Feedback loop ~15 fps
    useEffect(() => {
        if (!isReady) return;
        const analysisCanvas = analysisCanvasRef.current;
        const video = videoRef.current;
        if (!analysisCanvas || !video) return;

        analysisCanvas.width  = 320;
        analysisCanvas.height = 240;

        const INTERVAL = 66;
        let last = 0;

        const loop = (now: DOMHighResTimeStamp) => {
            if (!mountedRef.current) return;
            if (now - last >= INTERVAL) {
                last = now;
                // Send frame to face worker when free
                if (workerRef.current && !workerBusyRef.current && video.readyState >= 2) {
                    workerBusyRef.current = true;
                    createImageBitmap(video)
                        .then(bmp => workerRef.current?.postMessage({ type: "detect", bitmap: bmp }, [bmp]))
                        .catch(() => { workerBusyRef.current = false; });
                }
                // Run liveness inference when face bbox is available
                const livenessCanvas = livenessCanvasRef.current;
                const bbox = faceBboxRef.current;
                if (livenessSessionRef.current && !livenessRunningRef.current && bbox && livenessCanvas && video.readyState >= 2) {
                    livenessRunningRef.current = true;
                    runLivenessInference(livenessSessionRef.current, video, livenessCanvas, bbox)
                        .then(score => {
                            if (!mountedRef.current) return;
                            console.log('Liveness score:', score);
                            setLivenessScore(score);
                            if (score >= LIVENESS_THRESHOLD) {
                                passingFramesRef.current += 1;
                                passingScoresRef.current.push(score);
                                if (passingFramesRef.current >= REQUIRED_LIVENESS_FRAMES) {
                                    const avg = passingScoresRef.current.reduce((a, b) => a + b, 0) / passingScoresRef.current.length;
                                    console.log('Liveness passed — scores:', passingScoresRef.current, 'avg:', avg);
                                    livenessScoreRef.current = avg;
                                    setLivenessState('passed');
                                }
                            } else {
                                passingFramesRef.current = 0;
                                passingScoresRef.current = [];
                            }
                        })
                        .catch(e => console.error('Liveness inference error:', e))
                        .finally(() => { livenessRunningRef.current = false; });
                }
                try {
                    const state = analyseFrame(
                        video, analysisCanvas, "face",
                        faceResultRef.current,
                    );
                    setFeedbackState(state);
                } catch { /* ignore */ }
            }
            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [isReady]);

    const captureImage = useCallback(async () => {
        if (hasCapturedRef.current) return;
        hasCapturedRef.current = true;

        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) { hasCapturedRef.current = false; return; }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        // Mirror to match the mirrored video preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);

        const allIssues = feedbackState?.allIssues ?? [];
        const score = Math.round((feedbackState?.readinessScore ?? 1) * 100);
        const liveness = livenessScoreRef.current;
        cancelAnimationFrame(animFrameRef.current);
        stopCamera();

        // Extract facial biometrics token from face region
        let facialBiometricsToken: string | null = null;
        const bbox = faceBboxRef.current;
        const featureSession = featureSessionRef.current;
        const featureCanvas  = featureCanvasRef.current;
        if (featureSession && featureCanvas && bbox) {
            try {
                const SIZE = 112;
                featureCanvas.width  = SIZE;
                featureCanvas.height = SIZE;
                const fctx = featureCanvas.getContext('2d')!;
                const bw = bbox.xMax - bbox.xMin;
                const bh = bbox.yMax - bbox.yMin;
                // Expand crop 40% around the bounding box for alignment context
                const pad = 0.4;
                const sx = Math.max(0, bbox.xMin - bw * pad);
                const sy = Math.max(0, bbox.yMin - bh * pad);
                const sw = Math.min(canvas.width  - sx, bw * (1 + pad * 2));
                const sh = Math.min(canvas.height - sy, bh * (1 + pad * 2));
                // Draw face region onto feature canvas (un-mirrored — canvas is already final)
                fctx.save();
                fctx.scale(-1, 1);
                fctx.drawImage(canvas, sx, sy, sw, sh, -SIZE, 0, SIZE, SIZE);
                fctx.restore();
                const id = fctx.getImageData(0, 0, SIZE, SIZE);
                // CHW float32 normalized to [-1, 1]
                const float32 = new Float32Array(3 * SIZE * SIZE);
                for (let i = 0; i < SIZE * SIZE; i++) {
                    float32[i]                = (id.data[i * 4]     / 127.5) - 1;
                    float32[SIZE * SIZE + i]  = (id.data[i * 4 + 1] / 127.5) - 1;
                    float32[2 * SIZE * SIZE + i] = (id.data[i * 4 + 2] / 127.5) - 1;
                }
                const inputTensor = new ort.Tensor('float32', float32, [1, 3, SIZE, SIZE]);
                const output = await featureSession.run({ input: inputTensor });
                const embedding = output[Object.keys(output)[0]].data as Float32Array;
                facialBiometricsToken = btoa(
                    String.fromCharCode(...new Uint8Array(embedding.buffer))
                );
            } catch (err) {
                console.error('[SelfieCapture] Feature extraction failed (non-fatal):', err);
            }
        }

        if (allIssues.some(i => i.severity === "block")) {
            setCapturedImage(imageData);
            setCapturedScore(score);
            setCapturedLivenessScore(liveness);
            setReviewIssues(allIssues);
        } else {
            onCapture(imageData, score, liveness, facialBiometricsToken);
        }
    }, [feedbackState, stopCamera, onCapture]);

    // Auto-capture when liveness passes
    useEffect(() => {
        if (livenessState === 'passed' && isReady && !capturedImage) {
            captureImage();
        }
    }, [livenessState, isReady, capturedImage, captureImage]);

    const status     = feedbackState?.status ?? "scanning";
    const ovalStyle  = SELFIE_STATE_STYLE[livenessState === 'passed' ? 'ready' : status] ?? SELFIE_STATE_STYLE.scanning;

    // ── Review screen ─────────────────────────────────────────────────────
    if (capturedImage) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
                <div className="flex-1 relative overflow-hidden">
                    <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-contain" />
                </div>
                <div className="p-4 bg-black/80">
                    {reviewIssues.filter(i => i.severity === "block").length > 0 && (
                        <div className="mb-3">
                            <p className="text-white text-sm font-medium mb-2">Issues detected:</p>
                            {reviewIssues.filter(i => i.severity === "block").map(issue => (
                                <p key={issue.code} className="text-red-400 text-sm mb-1">• {issue.message}</p>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-3">
                        <Button
                            onClick={() => {
                                setCapturedImage(null);
                                setReviewIssues([]);
                                faceResultRef.current = null;
                                hasCapturedRef.current = false;
                                passingFramesRef.current = 0;
                                faceBboxRef.current = null;
                                setLivenessState('scanning');
                                setIsReady(false);
                                startCamera();
                            }}
                            variant="outline"
                            className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                            Retake
                        </Button>
                        <Button
                            onClick={() => onCapture(capturedImage!, capturedScore, capturedLivenessScore, null)}
                            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Use Anyway
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error screen ──────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black">
                <p className="text-red-500 text-center mb-4">{error}</p>
                <Button onClick={onCancel} variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
            {/* Mirrored video feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={analysisCanvasRef} className="hidden" />

            {/* Oval cutout overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" />
                <div
                    className="relative bg-transparent z-10 transition-all duration-500"
                    style={{
                        width: "80%",
                        height: "70%",
                        borderRadius: "50%",
                        border: `2.5px solid ${ovalStyle.border}`,
                        boxShadow: ovalStyle.glow,
                    }}
                />
            </div>

            {/* Instructions */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20" style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}>
                <p className="text-white text-center text-lg font-medium drop-shadow-lg">{instructions}</p>
                {guidanceText && (
                    <p className="text-gray-300 text-center text-sm mt-2 drop-shadow">{guidanceText}</p>
                )}
            </div>

            {/* Feedback banner & liveness indicator */}
            {isReady && (
                <div className="absolute top-1/4 left-0 right-0 flex flex-col items-center gap-3 z-20 px-6">
                    {feedbackState?.primaryIssue && livenessState !== 'passed' && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${SELFIE_STATE_STYLE[status]?.pill ?? "bg-black/60 text-white"}`}>
                            {status === "warning" && (
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                            )}
                            {status === "error" && (
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            <span>{feedbackState.primaryIssue.message}</span>
                        </div>
                    )}
                    {livenessState === 'passed' ? (
                        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-semibold shadow-lg shadow-emerald-500/30">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Liveness confirmed — capturing…
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm border border-violet-500/30 text-violet-100 text-sm">
                            <span className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </span>
                            <span>Verifying your face…</span>
                        </div>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20" style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}>
                <div className="flex items-center justify-center">
                    <Button onClick={onCancel} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};
