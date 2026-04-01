import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import {
    analyseFrame,
    type FeedbackState, type FeedbackIssue,
} from "@/lib/imageFeedback";

const BORDER_COLOR: Record<string, string> = {
    ready:   "border-green-500",
    warning: "border-yellow-400",
    error:   "border-red-500",
    scanning:"border-white",
};

const FEEDBACK_BG: Record<string, string> = {
    ready:   "bg-green-500/80",
    warning: "bg-yellow-500/80",
    error:   "bg-red-500/80",
    scanning:"bg-black/60",
};

interface DocumentCaptureProps {
    onCapture: (imageData: string, score: number) => void;
    onCancel: () => void;
    mode: "document" | "barcode";
    instructions: string;
    guidanceText?: string;
}

export const DocumentCapture = ({ onCapture, onCancel, mode, instructions, guidanceText }: DocumentCaptureProps) => {
    const videoRef          = useRef<HTMLVideoElement>(null);
    const canvasRef         = useRef<HTMLCanvasElement>(null);
    const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef         = useRef<MediaStream | null>(null);
    const mountedRef        = useRef(true);
    const animFrameRef      = useRef<number>(0);

    const [isReady, setIsReady]                     = useState(false);
    const [error, setError]                         = useState<string | null>(null);
    const [barcodeDetected, setBarcodeDetected]     = useState(false);
    const [feedbackState, setFeedbackState]         = useState<FeedbackState | null>(null);
    const [capturedImage, setCapturedImage]         = useState<string | null>(null);
    const [capturedScore, setCapturedScore]         = useState<number>(0);
    const [reviewIssues, setReviewIssues]           = useState<FeedbackIssue[]>([]);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
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

    useEffect(() => {
        mountedRef.current = true;
        startCamera();
        return () => { mountedRef.current = false; stopCamera(); };
    }, [startCamera, stopCamera]);

    // Blur/exposure feedback loop (document mode only) s
    useEffect(() => {
        if (!isReady || mode === "barcode") return;
        const analysisCanvas = analysisCanvasRef.current;
        const video = videoRef.current;
        if (!analysisCanvas || !video) return;

        analysisCanvas.width  = 320;
        analysisCanvas.height = 240;

        const INTERVAL = 66;
        let last = 0;

        const loop = (now: DOMHighResTimeStamp) => {
            if (!mountedRef.current) return;
            if (now - last >= INTERVAL && video.readyState >= 2) {
                last = now;
                try {
                    const state = analyseFrame(video, analysisCanvas, "document");
                    setFeedbackState(state);
                } catch { /* ignore */ }
            }
            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [isReady, mode]);

    const captureImage = useCallback(() => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);

        const allIssues = feedbackState?.allIssues ?? [];
        const score = Math.round((feedbackState?.readinessScore ?? 1) * 100);
        cancelAnimationFrame(animFrameRef.current);
        stopCamera();

        if (allIssues.some(i => i.severity === "block")) {
            setCapturedImage(imageData);
            setCapturedScore(score);
            setReviewIssues(allIssues);
        } else {
            onCapture(imageData);
        }
    }, [feedbackState, stopCamera, onCapture]);

    // Barcode detection via native BarcodeDetector API
    useEffect(() => {
        if (mode !== "barcode" || !isReady) return;
        if (!("BarcodeDetector" in window)) return;

        const detector = new (window as any).BarcodeDetector({ formats: ["pdf417", "code_128", "code_39"] });
        let animId: number;

        const detect = async () => {
            if (!videoRef.current || !mountedRef.current) return;
            try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && mountedRef.current) {
                    setBarcodeDetected(true);
                    setTimeout(() => { if (mountedRef.current) captureImage(); }, 500);
                    return;
                }
            } catch { /* ignore */ }
            if (mountedRef.current) animId = requestAnimationFrame(detect);
        };

        detect();
        return () => { if (animId) cancelAnimationFrame(animId); };
    }, [mode, isReady, captureImage]);

    const status      = feedbackState?.status ?? "scanning";
    const borderClass = barcodeDetected ? "border-green-500" : (BORDER_COLOR[status] ?? "border-white");

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
                                setIsReady(false);
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
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={analysisCanvasRef} className="hidden" />

            {/* Rectangle cutout overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" />
                <div
                    className={`relative border-2 ${borderClass} bg-transparent z-10 transition-colors duration-300`}
                    style={{
                        width: "85%",
                        height: "55%",
                        borderRadius: "12px",
                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                    }}
                >
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br" />
                </div>
            </div>

            {/* Instructions */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20" style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}>
                <p className="text-white text-center text-lg font-medium drop-shadow-lg">{instructions}</p>
                {guidanceText && (
                    <p className="text-gray-300 text-center text-sm mt-2 drop-shadow">{guidanceText}</p>
                )}
            </div>

            {/* Feedback banner (document mode) */}
            {mode === "document" && feedbackState?.primaryIssue && (
                <div className="absolute top-1/4 left-0 right-0 flex justify-center z-20 px-6">
                    <div className={`px-4 py-2 rounded-full text-white text-sm font-medium ${FEEDBACK_BG[status] ?? "bg-black/60"}`}>
                        {feedbackState.primaryIssue.message}
                    </div>
                </div>
            )}

            {/* Barcode detected indicator */}
            {mode === "barcode" && barcodeDetected && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                        Barcode Detected!
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20" style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}>
                <div className="flex items-center justify-center gap-4">
                    <Button onClick={onCancel} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                        Cancel
                    </Button>
                    {isReady && (
                        <Button
                            onClick={captureImage}
                            className="w-16 h-16 rounded-full bg-zinc-900 border-4 border-blue-100 shadow-lg active:scale-95 transition-transform"
                            aria-label="Capture"
                        >
                            <div className="w-full h-full rounded-full bg-white hover:bg-gray-100" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
