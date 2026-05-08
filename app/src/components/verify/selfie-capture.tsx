import { useRef, useState, useEffect, useCallback } from "react";
import * as ort from "onnxruntime-web";
import { Button } from "../ui/button";
import {
    analyseFrame,
    type FeedbackState,
    type FeedbackIssue,
    type FaceResult,
} from "@/lib/imageFeedback";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChallengeKind = "turnLeft" | "turnRight" | "blink" | "nod";

interface Challenge {
    kind: ChallengeKind;
    label: string;
    instruction: string;
    icon: string;
}

type ChallengeStatus = "pending" | "active" | "complete";

interface ChallengeState {
    challenge: Challenge;
    status: ChallengeStatus;
}

type LivenessPhase =
    | "loading"       // ONNX models initialising
    | "positioning"   // waiting for face to be centred
    | "challenge"     // running challenge sequence
    | "capturing"     // MediaRecorder finalising, still frame extraction
    | "done"
    | "error";

interface PoseSnapshot {
    // Normalised cx/cy relative to video dimensions
    cx: number;
    cy: number;
    // bbox width relative to video width — proxy for z-depth / nod
    relW: number;
    // Raw bbox for ONNX crop
    bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
    timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_CHALLENGES: Challenge[] = [
    { kind: "turnLeft",  label: "Turn left",  instruction: "Slowly turn your head to the left",  icon: "←" },
    { kind: "turnRight", label: "Turn right", instruction: "Slowly turn your head to the right", icon: "→" },
    { kind: "blink",     label: "Blink",      instruction: "Blink both eyes naturally",          icon: "👁" },
    { kind: "nod",       label: "Nod",        instruction: "Slowly nod your head down then up",  icon: "↕" },
];

const CHALLENGES_PER_SESSION = 1;
const LIVENESS_THRESHOLD     = 0.70;
// Geometric thresholds — all expressed as fraction of video dimension
const YAW_TURN_THRESHOLD   = 0.06;  // cx drift required for left/right
const NOD_THRESHOLD        = 0.04;  // relW change required for nod
const BLINK_HOLD_FRAMES    = 2;     // consecutive "narrow bbox height" frames
const CHALLENGE_TIMEOUT_MS = 6000;  // max time per challenge
const REQUIRED_ARC_FRAMES  = 3;     // ONNX frames to score per challenge

const ONNX_MODEL_PATH    = "/faceplugin-models/fr_liveness.onnx";
const FEATURE_MODEL_PATH = "/faceplugin-models/fr_feature.onnx";

// ─── Style maps ───────────────────────────────────────────────────────────────

const PHASE_OVAL: Record<string, { border: string; glow: string }> = {
    loading:     { border: "rgba(100,100,120,0.5)",   glow: "0 0 0 9999px rgba(0,0,0,0.6)" },
    positioning: { border: "rgba(139,92,246,0.65)",   glow: "0 0 0 9999px rgba(0,0,0,0.55), 0 0 28px 6px rgba(139,92,246,0.3)" },
    challenge:   { border: "rgba(59,130,246,0.9)",    glow: "0 0 0 9999px rgba(0,0,0,0.5),  0 0 36px 8px rgba(59,130,246,0.4)" },
    capturing:   { border: "rgba(16,185,129,0.95)",   glow: "0 0 0 9999px rgba(0,0,0,0.45), 0 0 48px 12px rgba(16,185,129,0.5)" },
    done:        { border: "rgba(16,185,129,0.95)",   glow: "0 0 0 9999px rgba(0,0,0,0.45), 0 0 48px 12px rgba(16,185,129,0.5)" },
    error:       { border: "rgba(239,68,68,0.95)",    glow: "0 0 0 9999px rgba(0,0,0,0.55), 0 0 28px 6px rgba(239,68,68,0.4)" },
    warning:     { border: "rgba(245,158,11,0.95)",   glow: "0 0 0 9999px rgba(0,0,0,0.55), 0 0 28px 6px rgba(245,158,11,0.4)" },
};

// ─── ONNX helpers ─────────────────────────────────────────────────────────────

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
    const sw = Math.min(video.videoWidth  - sx, bw);
    const sh = Math.min(video.videoHeight - sy, bh);

    canvas.width  = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 128, 128);
    const id = ctx.getImageData(0, 0, 128, 128);

    const float32 = new Float32Array(3 * 128 * 128);
    for (let i = 0; i < 128 * 128; i++) {
        float32[i]                 = id.data[i * 4];
        float32[128 * 128 + i]     = id.data[i * 4 + 1];
        float32[2 * 128 * 128 + i] = id.data[i * 4 + 2];
    }

    const inputTensor = new ort.Tensor("float32", float32, [1, 3, 128, 128]);
    const results = await session.run({ input: inputTensor });
    const logits  = results["output"].data as Float32Array;
    const maxLogit = Math.max(logits[0], logits[1]);
    const e0 = Math.exp(logits[0] - maxLogit);
    const e1 = Math.exp(logits[1] - maxLogit);
    return e0 / (e0 + e1);
}

async function extractFeatureToken(
    session: ort.InferenceSession,
    canvas: HTMLCanvasElement, // the full-res capture canvas (already drawn)
    bbox: { xMin: number; yMin: number; xMax: number; yMax: number },
): Promise<string | null> {
    try {
        const SIZE = 112;
        const fc   = document.createElement("canvas");
        fc.width   = SIZE;
        fc.height  = SIZE;
        const fctx = fc.getContext("2d")!;
        const bw   = bbox.xMax - bbox.xMin;
        const bh   = bbox.yMax - bbox.yMin;
        const pad  = 0.4;
        const sx   = Math.max(0, bbox.xMin - bw * pad);
        const sy   = Math.max(0, bbox.yMin - bh * pad);
        const sw   = Math.min(canvas.width  - sx, bw * (1 + pad * 2));
        const sh   = Math.min(canvas.height - sy, bh * (1 + pad * 2));
        fctx.save();
        fctx.scale(-1, 1);
        fctx.drawImage(canvas, sx, sy, sw, sh, -SIZE, 0, SIZE, SIZE);
        fctx.restore();
        const id = fctx.getImageData(0, 0, SIZE, SIZE);
        const float32 = new Float32Array(3 * SIZE * SIZE);
        for (let i = 0; i < SIZE * SIZE; i++) {
            float32[i]                = (id.data[i * 4]     / 127.5) - 1;
            float32[SIZE * SIZE + i]  = (id.data[i * 4 + 1] / 127.5) - 1;
            float32[2 * SIZE * SIZE + i] = (id.data[i * 4 + 2] / 127.5) - 1;
        }
        const inputTensor = new ort.Tensor("float32", float32, [1, 3, SIZE, SIZE]);
        const output = await session.run({ input: inputTensor });
        const embedding = output[Object.keys(output)[0]].data as Float32Array;
        return btoa(String.fromCharCode(...new Uint8Array(embedding.buffer)));
    } catch {
        return null;
    }
}

// ─── Geometric validators ─────────────────────────────────────────────────────

/** Returns true once enough yaw drift detected in the required direction */
function validateYaw(
    baseline: PoseSnapshot,
    current: PoseSnapshot,
    direction: "left" | "right",
): boolean {
    const drift = current.cx - baseline.cx;
    // Mirrored video: turning left moves centroid right in frame coords
    return direction === "left"
        ? drift >  YAW_TURN_THRESHOLD
        : drift < -YAW_TURN_THRESHOLD;
}

function validateNod(baseline: PoseSnapshot, history: PoseSnapshot[]): boolean {
    // Look for bbox width expansion (face closer) then contraction, or pitch proxy via relW
    const maxRelW = Math.max(...history.map(s => s.relW));
    const minRelW = Math.min(...history.map(s => s.relW));
    return (maxRelW - minRelW) > NOD_THRESHOLD;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function pickChallenges(): Challenge[] {
    const shuffled = [...ALL_CHALLENGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, CHALLENGES_PER_SESSION);
}

function sampleArcFrames<T>(frames: T[]): T[] {
    if (frames.length <= REQUIRED_ARC_FRAMES) return frames;
    const step = (frames.length - 1) / (REQUIRED_ARC_FRAMES - 1);
    return Array.from({ length: REQUIRED_ARC_FRAMES }, (_, i) =>
        frames[Math.round(i * step)]
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SelfieCaptureProps {
    onCapture: (
        imageData: string,
        score: number,
        livenessScore: number,
        facialBiometricsToken: string | null,
        videoBlob: Blob | null,
    ) => void;
    onCancel: () => void;
    instructions: string;
    guidanceText?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SelfieCapture = ({
    onCapture,
    onCancel,
    instructions,
    guidanceText,
}: SelfieCaptureProps) => {

    // ── Refs ────────────────────────────────────────────────────────────────
    const videoRef          = useRef<HTMLVideoElement>(null);
    const canvasRef         = useRef<HTMLCanvasElement>(null);
    const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef         = useRef<MediaStream | null>(null);
    const mountedRef        = useRef(true);
    const animFrameRef      = useRef<number>(0);
    const workerRef         = useRef<Worker | null>(null);
    const faceResultRef     = useRef<FaceResult | null>(null);
    const workerBusyRef     = useRef(false);

    // ONNX
    const livenessSessionRef = useRef<ort.InferenceSession | null>(null);
    const featureSessionRef  = useRef<ort.InferenceSession | null>(null);
    const livenessCanvasRef  = useRef<HTMLCanvasElement | null>(null);
    const onnxBusyRef        = useRef(false);

    // Challenge engine
    const challengesRef          = useRef<ChallengeState[]>([]);
    const currentChallengeIdxRef = useRef(0);
    const baselinePoseRef        = useRef<PoseSnapshot | null>(null);
    const poseHistoryRef         = useRef<PoseSnapshot[]>([]);
    const arcFramesRef           = useRef<PoseSnapshot[]>([]);
    const blinkCounterRef        = useRef(0);
    const challengeStartRef      = useRef<number>(0);
    const allArcScoresRef        = useRef<number[]>([]);
    const hasCapturedRef         = useRef(false);

    // MediaRecorder
    const recorderRef    = useRef<MediaRecorder | null>(null);
    const videoChunksRef = useRef<Blob[]>([]);

    // ── State ───────────────────────────────────────────────────────────────
    const [phase, setPhase]                       = useState<LivenessPhase>("loading");
    const [challengeStates, setChallengeStates]   = useState<ChallengeState[]>([]);
    const [currentIdx, setCurrentIdx]             = useState(0);
    const [feedbackState, setFeedbackState]       = useState<FeedbackState | null>(null);
    const [cameraError, setCameraError]           = useState<string | null>(null);
    const [challengeProgress, setChallengeProgress] = useState(0); // 0–1
    const [capturedImage, setCapturedImage]       = useState<string | null>(null);
    const [reviewIssues, setReviewIssues]         = useState<FeedbackIssue[]>([]);
    const [capturedPayload, setCapturedPayload]   = useState<{
        score: number; liveness: number; token: string | null; video: Blob | null;
    } | null>(null);
    const [modelsReady, setModelsReady]           = useState(false);
    const [cameraReady, setCameraReady]           = useState(false);

    // ── Camera ──────────────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                if (mountedRef.current) setCameraReady(true);
            }
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            if (mountedRef.current) setCameraError("Unable to access camera. Please grant camera permissions.");
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        startCamera();
        return () => { mountedRef.current = false; stopCamera(); };
    }, [startCamera, stopCamera]);

    // ── Face worker ─────────────────────────────────────────────────────────
    useEffect(() => {
        const worker = new Worker(
            new URL("../../lib/faceWorker.ts", import.meta.url),
            { type: "module" },
        );
        worker.onmessage = (e) => {
            if (e.data.type === "result") {
                faceResultRef.current = e.data as FaceResult;
                workerBusyRef.current = false;
            }
            if (e.data.type === "error") {
                workerBusyRef.current = false;
            }
        };
        worker.onerror = () => { workerBusyRef.current = false; };
        worker.postMessage({ type: "init" });
        workerRef.current = worker;
        return () => { worker.terminate(); workerRef.current = null; };
    }, []);

    // ── ONNX model loading ──────────────────────────────────────────────────
    useEffect(() => {
        livenessCanvasRef.current = document.createElement("canvas");
        let cancelled = false;

        Promise.all([
            ort.InferenceSession.create(ONNX_MODEL_PATH,    { executionProviders: ["wasm"] }),
            ort.InferenceSession.create(FEATURE_MODEL_PATH, { executionProviders: ["wasm"] }),
        ]).then(([liveness, feature]) => {
            if (cancelled) return;
            livenessSessionRef.current = liveness;
            featureSessionRef.current  = feature;
            setModelsReady(true);
        }).catch(err => {
            console.error("Failed to load ONNX models:", err);
            if (!cancelled) setPhase("error");
        });

        return () => {
            cancelled = true;
            livenessSessionRef.current = null;
            featureSessionRef.current  = null;
        };
    }, []);

    // ── Transition loading → positioning once both ready ────────────────────
    useEffect(() => {
        if (modelsReady && cameraReady && phase === "loading") {
            setPhase("positioning");
        }
    }, [modelsReady, cameraReady, phase]);

    // ── Challenge initialisation ─────────────────────────────────────────────
    const initChallenges = useCallback(() => {
        const picked = pickChallenges().map(c => ({ challenge: c, status: "pending" as ChallengeStatus }));
        challengesRef.current        = picked;
        currentChallengeIdxRef.current = 0;
        picked[0].status             = "active";
        setChallengeStates([...picked]);
        setCurrentIdx(0);
        baselinePoseRef.current   = null;
        poseHistoryRef.current    = [];
        arcFramesRef.current      = [];
        allArcScoresRef.current   = [];
        blinkCounterRef.current   = 0;
        challengeStartRef.current = performance.now();
        setChallengeProgress(0);
    }, []);

    // ── MediaRecorder ────────────────────────────────────────────────────────
    const startRecording = useCallback(() => {
        if (!streamRef.current) return;
        videoChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm";
        const recorder = new MediaRecorder(streamRef.current, { mimeType });
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) videoChunksRef.current.push(e.data);
        };
        recorder.start(100); // collect chunks every 100ms
        recorderRef.current = recorder;
    }, []);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const recorder = recorderRef.current;
            if (!recorder || recorder.state === "inactive") { resolve(null); return; }
            recorder.onstop = () => {
                const blob = new Blob(videoChunksRef.current, { type: recorder.mimeType });
                resolve(blob.size > 0 ? blob : null);
            };
            recorder.stop();
            recorderRef.current = null;
        });
    }, []);

    // ── Advance to next challenge or finalise ────────────────────────────────
    const advanceChallenge = useCallback(() => {
        const states = challengesRef.current;
        const idx    = currentChallengeIdxRef.current;

        // Mark current complete
        states[idx].status = "complete";
        setChallengeStates([...states]);

        const next = idx + 1;
        if (next < states.length) {
            states[next].status            = "active";
            currentChallengeIdxRef.current = next;
            setCurrentIdx(next);
            setChallengeStates([...states]);
            baselinePoseRef.current   = null;
            poseHistoryRef.current    = [];
            arcFramesRef.current      = [];
            blinkCounterRef.current   = 0;
            challengeStartRef.current = performance.now();
            setChallengeProgress(0);
        } else {
            // All challenges done — move to capture
            setPhase("capturing");
        }
    }, []);

    // ── Finalise: extract still + video blob + feature token ─────────────────
    const finalise = useCallback(async () => {
        if (hasCapturedRef.current) return;
        hasCapturedRef.current = true;

        cancelAnimationFrame(animFrameRef.current);

        const videoBlob = await stopRecording();
        stopCamera();

        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);

        const avgLiveness = allArcScoresRef.current.length > 0
            ? allArcScoresRef.current.reduce((a, b) => a + b, 0) / allArcScoresRef.current.length
            : 0;

        const feedbackSnapshot = feedbackState;
        const allIssues        = feedbackSnapshot?.allIssues ?? [];
        const score            = Math.round((feedbackSnapshot?.readinessScore ?? 1) * 100);
        const bbox             = arcFramesRef.current.at(-1)?.bbox ?? null;

        let token: string | null = null;
        if (featureSessionRef.current && bbox) {
            token = await extractFeatureToken(featureSessionRef.current, canvas, bbox);
        }

        if (allIssues.some(i => i.severity === "block")) {
            setCapturedImage(imageData);
            setReviewIssues(allIssues);
            setCapturedPayload({ score, liveness: avgLiveness, token, video: videoBlob });
        } else {
            onCapture(imageData, score, avgLiveness, token, videoBlob);
        }
    }, [feedbackState, stopCamera, stopRecording, onCapture]);

    useEffect(() => {
        if (phase === "capturing") {
            finalise();
        }
    }, [phase, finalise]);

    // ── Geometric challenge validation ───────────────────────────────────────
    const evaluateChallenge = useCallback((pose: PoseSnapshot) => {
        const states  = challengesRef.current;
        const idx     = currentChallengeIdxRef.current;
        if (idx >= states.length) return;
        const current = states[idx].challenge;

        // Capture baseline on first pose of this challenge
        if (!baselinePoseRef.current) {
            baselinePoseRef.current = pose;
            return;
        }

        poseHistoryRef.current.push(pose);

        // Timeout guard
        const elapsed = performance.now() - challengeStartRef.current;
        const progress = Math.min(elapsed / CHALLENGE_TIMEOUT_MS, 1);
        setChallengeProgress(progress);

        if (elapsed > CHALLENGE_TIMEOUT_MS) {
            // Timed out — still advance (best-effort; ONNX will have low scores)
            advanceChallenge();
            return;
        }

        let passed = false;
        const baseline = baselinePoseRef.current;

        switch (current.kind) {
            case "turnLeft":
                passed = validateYaw(baseline, pose, "left");
                break;
            case "turnRight":
                passed = validateYaw(baseline, pose, "right");
                break;
            case "blink":
                // Proxy: face bbox height shrinks temporarily due to eyes closing
                // Use relative height change
                if (pose.bbox) {
                    const baseH    = baseline.bbox.yMax - baseline.bbox.yMin;
                    const currH    = pose.bbox.yMax     - pose.bbox.yMin;
                    const relChange = (baseH - currH) / baseH;
                    if (relChange > 0.04) {
                        blinkCounterRef.current += 1;
                    } else {
                        blinkCounterRef.current = Math.max(0, blinkCounterRef.current - 1);
                    }
                    passed = blinkCounterRef.current >= BLINK_HOLD_FRAMES;
                }
                break;
            case "nod":
                passed = validateNod(baseline, poseHistoryRef.current);
                break;
        }

        if (passed) {
            advanceChallenge();
        }
    }, [advanceChallenge]);

    // ── Main frame loop ──────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== "positioning" && phase !== "challenge") return;
        const analysisCanvas = analysisCanvasRef.current;
        const video          = videoRef.current;
        if (!analysisCanvas || !video) return;

        analysisCanvas.width  = 320;
        analysisCanvas.height = 240;

        const INTERVAL = 33; // ~30 fps
        let last = 0;

        const loop = (now: DOMHighResTimeStamp) => {
            if (!mountedRef.current) return;

            if (now - last >= INTERVAL) {
                last = now;

                // Send to face worker
                if (workerRef.current && !workerBusyRef.current && video.readyState >= 2) {
                    workerBusyRef.current = true;
                    createImageBitmap(video)
                        .then(bmp => workerRef.current?.postMessage({ type: "detect", bitmap: bmp }, [bmp]))
                        .catch(() => { workerBusyRef.current = false; });
                }

                // Extract pose from face result
                const faceResult = faceResultRef.current;
                const hasFace = faceResult?.status === "ok" && faceResult.bbox;
                if (hasFace && faceResult!.bbox) {
                    const bbox = faceResult!.bbox;
                    const pose: PoseSnapshot = {
                        cx:        (bbox.xMin + bbox.xMax) / 2 / video.videoWidth,
                        cy:        (bbox.yMin + bbox.yMax) / 2 / video.videoHeight,
                        relW:      (bbox.xMax - bbox.xMin) / video.videoWidth,
                        bbox,
                        timestamp: now,
                    };

                    // Collect arc frames for ONNX scoring
                    if (phase === "challenge") {
                        arcFramesRef.current.push(pose);
                        evaluateChallenge(pose);
                    }

                    // ONNX scoring — run on arc frames asynchronously
                    const livenessSession = livenessSessionRef.current;
                    const livenessCanvas  = livenessCanvasRef.current;
                    if (livenessSession && livenessCanvas && !onnxBusyRef.current && phase === "challenge") {
                        onnxBusyRef.current = true;
                        runLivenessInference(livenessSession, video, livenessCanvas, bbox)
                            .then(score => {
                                if (!mountedRef.current) return;
                                allArcScoresRef.current.push(score);
                            })
                            .catch(() => {})
                            .finally(() => { onnxBusyRef.current = false; });
                    }
                }

                // Feedback analysis
                try {
                    const state = analyseFrame(video, analysisCanvas, "face", faceResultRef.current);
                    setFeedbackState(state);

                    // Auto-advance positioning → challenge when face is centred
                    if (phase === "positioning" && state.status === "ready") {
                        setPhase("challenge");
                        initChallenges();
                        startRecording();
                    }
                } catch { /* ignore */ }
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [phase, evaluateChallenge, initChallenges, startRecording]);

    // ── Derived UI values ────────────────────────────────────────────────────
    const status     = feedbackState?.status ?? "scanning";
    const ovalKey    = phase === "challenge" ? "challenge"
                     : phase === "capturing" || phase === "done" ? "capturing"
                     : phase === "error"     ? "error"
                     : status === "warning"  ? "warning"
                     : status === "error"    ? "error"
                     : "positioning";
    const ovalStyle  = PHASE_OVAL[ovalKey] ?? PHASE_OVAL.positioning;

    const currentChallenge = challengeStates[currentIdx]?.challenge;

    // ── Review screen ────────────────────────────────────────────────────────
    if (capturedImage && capturedPayload) {
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
                                setCapturedPayload(null);
                                faceResultRef.current     = null;
                                hasCapturedRef.current    = false;
                                allArcScoresRef.current   = [];
                                arcFramesRef.current      = [];
                                poseHistoryRef.current    = [];
                                blinkCounterRef.current   = 0;
                                videoChunksRef.current    = [];
                                setPhase("loading");
                                setCameraReady(false);
                                setModelsReady(false);
                                startCamera().then(() => {
                                    if (livenessSessionRef.current && featureSessionRef.current) {
                                        setModelsReady(true);
                                    }
                                });
                            }}
                            variant="outline"
                            className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                            Retake
                        </Button>
                        <Button
                            onClick={() => onCapture(
                                capturedImage,
                                capturedPayload.score,
                                capturedPayload.liveness,
                                capturedPayload.token,
                                capturedPayload.video,
                            )}
                            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Use Anyway
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Camera error screen ──────────────────────────────────────────────────
    if (cameraError) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black">
                <p className="text-red-500 text-center mb-4">{cameraError}</p>
                <Button onClick={onCancel} variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                    Go Back
                </Button>
            </div>
        );
    }

    // ── Main camera UI ───────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
            {/* Mirrored video */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            <canvas ref={canvasRef}         className="hidden" />
            <canvas ref={analysisCanvasRef} className="hidden" />

            {/* Oval cutout */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" />
                <div
                    className="relative z-10 transition-all duration-500"
                    style={{
                        width:        "80%",
                        height:       "70%",
                        borderRadius: "50%",
                        border:       `2.5px solid ${ovalStyle.border}`,
                        boxShadow:    ovalStyle.glow,
                    }}
                />
            </div>

            {/* Top instructions */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20" style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}>
                <p className="text-white text-center text-lg font-medium drop-shadow-lg">{instructions}</p>
                {guidanceText && (
                    <p className="text-gray-300 text-center text-sm mt-2 drop-shadow">{guidanceText}</p>
                )}
            </div>

            {/* Phase-specific banners */}
            <div className="absolute top-1/4 left-0 right-0 flex flex-col items-center gap-3 z-20 px-6">

                {/* Loading */}
                {phase === "loading" && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-zinc-700 text-zinc-300 text-sm">
                        <span className="flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                        <span>Initialising verification…</span>
                    </div>
                )}

                {/* Positioning */}
                {phase === "positioning" && (
                    <>
                        {feedbackState?.primaryIssue && (
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg
                                ${status === "warning" ? "bg-amber-950/70 border border-amber-500/40 text-amber-100 backdrop-blur-sm" : ""}
                                ${status === "error"   ? "bg-rose-950/70  border border-rose-500/40  text-rose-100  backdrop-blur-sm" : ""}
                                ${status === "scanning" || status === "ready" ? "bg-violet-950/70 border border-violet-500/40 text-violet-100 backdrop-blur-sm" : ""}
                            `}>
                                <span>{feedbackState.primaryIssue.message}</span>
                            </div>
                        )}
                        {!feedbackState?.primaryIssue && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-950/70 border border-violet-500/40 text-violet-100 backdrop-blur-sm text-sm">
                                <span className="flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                </span>
                                <span>Position your face in the oval</span>
                            </div>
                        )}
                    </>
                )}

                {/* Challenge */}
                {phase === "challenge" && currentChallenge && (
                    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                        {/* Active instruction */}
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-blue-950/80 border border-blue-400/40 backdrop-blur-sm text-white shadow-xl w-full">
                            <span className="text-2xl">{currentChallenge.icon}</span>
                            <div className="flex flex-col">
                                <span className="text-xs text-blue-300 font-medium uppercase tracking-wide">
                                    Step {currentIdx + 1} of {challengeStates.length}
                                </span>
                                <span className="text-sm font-semibold">{currentChallenge.instruction}</span>
                            </div>
                        </div>

                        {/* Progress bar for current challenge */}
                        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full bg-blue-400 transition-all duration-200"
                                style={{ width: `${challengeProgress * 100}%` }}
                            />
                        </div>

                        {/* Step indicators */}
                        <div className="flex gap-2 mt-1">
                            {challengeStates.map((cs, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300
                                        ${cs.status === "complete"  ? "bg-emerald-500/80 text-white" : ""}
                                        ${cs.status === "active"    ? "bg-blue-500/80 text-white ring-2 ring-blue-400/50" : ""}
                                        ${cs.status === "pending"   ? "bg-white/10 text-white/40" : ""}
                                    `}
                                >
                                    {cs.status === "complete" && (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    <span>{cs.challenge.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Capturing */}
                {(phase === "capturing" || phase === "done") && (
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-semibold shadow-lg shadow-emerald-500/30">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Verification complete — capturing…
                    </div>
                )}
            </div>

            {/* Cancel */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20" style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}>
                <div className="flex items-center justify-center">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};