import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "../ui/button";
import {
    analyseFrame,
    type FeedbackState, type FeedbackIssue, type FaceResult,
} from "@/lib/imageFeedback";

const STATE_STYLE: Record<string, { border: string; glow: string; cornerClass: string; pill: string }> = {
    scanning: {
        border:      "rgba(139,92,246,0.7)",
        glow:        "0 0 0 9999px rgba(0,0,0,0.55), 0 0 24px 6px rgba(139,92,246,0.35)",
        cornerClass: "border-violet-400",
        pill:        "bg-violet-950/70 border border-violet-500/40 text-violet-100 backdrop-blur-sm",
    },
    ready: {
        border:      "rgba(16,185,129,0.95)",
        glow:        "0 0 0 9999px rgba(0,0,0,0.45), 0 0 36px 8px rgba(16,185,129,0.5)",
        cornerClass: "border-emerald-400",
        pill:        "bg-emerald-950/70 border border-emerald-500/40 text-emerald-100 backdrop-blur-sm",
    },
    warning: {
        border:      "rgba(245,158,11,0.95)",
        glow:        "0 0 0 9999px rgba(0,0,0,0.55), 0 0 28px 6px rgba(245,158,11,0.45)",
        cornerClass: "border-amber-400",
        pill:        "bg-amber-950/70 border border-amber-500/40 text-amber-100 backdrop-blur-sm",
    },
    error: {
        border:      "rgba(239,68,68,0.95)",
        glow:        "0 0 0 9999px rgba(0,0,0,0.55), 0 0 28px 6px rgba(239,68,68,0.45)",
        cornerClass: "border-rose-400",
        pill:        "bg-rose-950/70 border border-rose-500/40 text-rose-100 backdrop-blur-sm",
    },
};

export interface CameraCaptureProps {
    onCapture: (imageData: string, score: number) => void;
    onCancel: () => void;
    mode: "document" | "barcode" | "selfie";
    instructions: string;
    guidanceText?: string;
}

export const CameraCapture = ({
    onCapture,
    onCancel,
    mode,
    instructions,
    guidanceText,
}: CameraCaptureProps) => {
    // ── refs ────────────────────────────────────────────────────────────────
    const videoRef          = useRef<HTMLVideoElement>(null);
    const canvasRef         = useRef<HTMLCanvasElement>(null);
    const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef         = useRef<MediaStream | null>(null);
    const mountedRef        = useRef(true);
    const animFrameRef      = useRef<number>(0);
    // ── worker refs ─────────────────────────────────────────────────────────
    const workerRef      = useRef<Worker | null>(null);
    const faceResultRef  = useRef<FaceResult | null>(null);
    const workerBusyRef  = useRef(false);

    // ── state ────────────────────────────────────────────────────────────────
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [barcodeDetected, setBarcodeDetected] = useState(false);
    const [feedbackState, setFeedbackState] = useState<FeedbackState | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedScore, setCapturedScore] = useState<number>(0);
    const [reviewIssues, setReviewIssues] = useState<FeedbackIssue[]>([]);

    const getOverlayStyle = () => {
        switch (mode) {
            case "document":
                return { width: "85%", height: "55%", borderRadius: "12px" };
            case "barcode":
                return { width: "85%", height: "55%", borderRadius: "12px" };
            case "selfie":
                return { width: "90%", height: "65%", borderRadius: "50%" };
            default:
                return { width: "80%", height: "50%", borderRadius: "8px" };
        }
    };

    const startCamera = useCallback(async () => {
        try {
            const facingMode = mode === "selfie" ? "user" : "environment";
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });

            if (!mountedRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                try {
                    await videoRef.current.play();
                    if (mountedRef.current) {
                        setIsReady(true);
                    }
                } catch (playErr) {
                    if (playErr instanceof Error && playErr.name === "AbortError") {
                        return;
                    }
                    throw playErr;
                }
            }
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                return;
            }
            console.error("Camera access error:", err);
            if (mountedRef.current) {
                setError("Unable to access camera. Please grant camera permissions.");
            }
        }
    }, [mode]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const captureImage = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video   = videoRef.current;
        const canvas  = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        if (mode === "selfie") { context.translate(canvas.width, 0); context.scale(-1, 1); }
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);

        const allIssues = feedbackState?.allIssues ?? [];
        const score = Math.round((feedbackState?.readinessScore ?? 1) * 100);
        cancelAnimationFrame(animFrameRef.current);
        stopCamera();

        const blockingIssues = allIssues.filter((i) => i.severity === "block");
        if (blockingIssues.length > 0) {
            setCapturedImage(imageData);
            setCapturedScore(score);
            setReviewIssues(allIssues);
        } else {
            onCapture(imageData, score);
        }
    }, [mode, stopCamera, onCapture, feedbackState]);

    // Camera init
    useEffect(() => {
        mountedRef.current = true;
        startCamera();
        return () => {
            mountedRef.current = false;
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    // Worker init (selfie mode only)
    useEffect(() => {
        if (mode !== "selfie") return;

        const worker = new Worker(
            new URL("../../lib/faceWorker.ts", import.meta.url),
            { type: "module" }
        );

        worker.onmessage = (e) => {
            if (e.data.type === "ready") {
            }
            if (e.data.type === "result") {
                faceResultRef.current = e.data as FaceResult;
                workerBusyRef.current = false;
            }
        };

        worker.postMessage({ type: "init" });
        workerRef.current = worker;

        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, [mode]);

    // Feedback loop (face + document modes)
    useEffect(() => {
        if (!isReady || mode === "barcode") return;

        const analysisCanvas = analysisCanvasRef.current;
        const video = videoRef.current;
        if (!analysisCanvas || !video) return;

        analysisCanvas.width  = 320;
        analysisCanvas.height = 240;

        const checkMode = mode === "selfie" ? "face" : "document";
        const ANALYSIS_INTERVAL_MS = 66;
        let lastAnalysisTime = 0;

        const loop = (now: DOMHighResTimeStamp) => {
            if (!mountedRef.current) return;

            if (now - lastAnalysisTime >= ANALYSIS_INTERVAL_MS) {
                lastAnalysisTime = now;

                if (mode === "selfie" && workerRef.current && !workerBusyRef.current) {
                    workerBusyRef.current = true;
                    createImageBitmap(video).then((bitmap) => {
                        workerRef.current?.postMessage({ type: "detect", bitmap }, [bitmap]);
                    }).catch(() => { workerBusyRef.current = false; });
                }

                try {
                    const state = analyseFrame(
                        video,
                        analysisCanvas,
                        checkMode,
                        mode === "selfie" ? faceResultRef.current : null,
                    );
                    setFeedbackState(state);
                } catch (err) {
                    console.warn("Frame analysis error:", err);
                }
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [isReady, mode]);

    // Barcode detection (native API — Chrome/Edge mobile)
    useEffect(() => {
        if (mode !== "barcode" || !isReady || !videoRef.current) return;

        if (!("BarcodeDetector" in window)) {
            return;
        }

        const detector = new (window as any).BarcodeDetector({
            formats: ["pdf417", "code_128", "code_39"],
        });

        let animationId: number;
        const detectBarcode = async () => {
            if (!videoRef.current || !isReady || !mountedRef.current) return;

            try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && mountedRef.current) {
                    setBarcodeDetected(true);
                    setTimeout(() => {
                        if (mountedRef.current) {
                            captureImage();
                        }
                    }, 500);
                    return;
                }
            } catch (_err) {
                // Ignore detection errors
            }

            if (mountedRef.current) {
                animationId = requestAnimationFrame(detectBarcode);
            }
        };

        detectBarcode();

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [mode, isReady, captureImage]);

    const overlayStyle  = getOverlayStyle();
    const feedbackStatus = barcodeDetected ? "ready" : (feedbackState?.status ?? "scanning");
    const stateStyle     = STATE_STYLE[feedbackStatus] ?? STATE_STYLE.scanning;

    // ── Review screen ────────────────────────────────────────────────────────
    if (capturedImage) {
        return (
            <div className="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col">
                <div className="flex-1 relative overflow-hidden">
                    <img
                        src={capturedImage}
                        alt="Captured"
                        className="absolute inset-0 w-full h-full object-contain"
                    />
                </div>
                <div className="p-4 z-20 bg-black/80">
                    {reviewIssues.filter((i) => i.severity === "block").length > 0 && (
                        <div className="mb-3">
                            <p className="text-white text-sm font-medium mb-2">Issues detected:</p>
                            {reviewIssues
                                .filter((i) => i.severity === "block")
                                .map((issue) => (
                                    <div key={issue.code} className="flex items-center gap-2 text-red-400 text-sm mb-1">
                                        <span>•</span>
                                        <span>{issue.message}</span>
                                    </div>
                                ))}
                        </div>
                    )}
                    <div className="flex gap-3">
                        <Button
                            onClick={() => {
                                setCapturedImage(null);
                                setReviewIssues([]);
                                setIsReady(false);
                                faceResultRef.current = null;
                                startCamera();
                            }}
                            variant="outline"
                            className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                            Retake
                        </Button>
                        <Button
                            onClick={() => onCapture(capturedImage!, capturedScore)}
                            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Use Anyway
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error screen ─────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black">
                <div className="text-red-500 text-center mb-4">{error}</div>
                <Button
                    onClick={onCancel}
                    variant="outline"
                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
            {/* Camera feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                    mode === "selfie" ? "scale-x-[-1]" : ""
                }`}
            />

            {/* Hidden canvases */}
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={analysisCanvasRef} className="hidden" />

            {/* Overlay with cutout */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" />

                <div
                    className="relative bg-transparent z-10 transition-all duration-500"
                    style={{
                        width:        overlayStyle.width,
                        height:       overlayStyle.height,
                        borderRadius: overlayStyle.borderRadius,
                        border:       `2.5px solid ${stateStyle.border}`,
                        boxShadow:    stateStyle.glow,
                    }}
                >
                    {mode !== "selfie" && (
                        <>
                            <div className={`absolute -top-1 -left-1 w-8 h-8 border-t-[3px] border-l-[3px] ${stateStyle.cornerClass} rounded-tl transition-colors duration-500`} />
                            <div className={`absolute -top-1 -right-1 w-8 h-8 border-t-[3px] border-r-[3px] ${stateStyle.cornerClass} rounded-tr transition-colors duration-500`} />
                            <div className={`absolute -bottom-1 -left-1 w-8 h-8 border-b-[3px] border-l-[3px] ${stateStyle.cornerClass} rounded-bl transition-colors duration-500`} />
                            <div className={`absolute -bottom-1 -right-1 w-8 h-8 border-b-[3px] border-r-[3px] ${stateStyle.cornerClass} rounded-br transition-colors duration-500`} />
                        </>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div
                className="absolute top-0 left-0 right-0 p-6 z-20"
                style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}
            >
                <p className="text-white text-center text-lg font-medium drop-shadow-lg">
                    {instructions}
                </p>
                {guidanceText && (
                    <p className="text-gray-300 text-center text-sm mt-2 drop-shadow">
                        {guidanceText}
                    </p>
                )}
            </div>

            {/* Feedback banner */}
            {feedbackState?.primaryIssue && mode !== "barcode" && (
                <div className="absolute top-1/4 left-0 right-0 flex justify-center z-20 px-6">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${stateStyle.pill}`}>
                        {feedbackStatus === "ready" && (
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {feedbackStatus === "warning" && (
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        )}
                        {feedbackStatus === "error" && (
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        {feedbackStatus === "scanning" && (
                            <span className="flex gap-0.5 items-center">
                                <span className="w-1 h-1 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1 h-1 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: "120ms" }} />
                                <span className="w-1 h-1 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: "240ms" }} />
                            </span>
                        )}
                        <span>{feedbackState.primaryIssue.message}</span>
                    </div>
                </div>
            )}

            {/* Barcode detection indicator */}
            {mode === "barcode" && barcodeDetected && (
                <div className="absolute top-1/4 left-0 right-0 flex justify-center z-30 px-6">
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 animate-pulse">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Barcode detected — capturing…
                    </div>
                </div>
            )}

            {/* Controls */}
            <div
                className="absolute bottom-0 left-0 right-0 p-6 pb-safe z-20"
                style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}
            >
                <div className="flex items-center justify-center gap-4">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                        Cancel
                    </Button>

                    {isReady && (
                        <button
                            onClick={captureImage}
                            aria-label="Capture"
                            className="relative w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform focus:outline-none"
                            style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.15), 0 0 24px 4px rgba(139,92,246,0.4)" }}
                        >
                            <div className="absolute inset-0 rounded-full border-2 border-white/40" />
                            <div className="w-14 h-14 rounded-full bg-white" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};