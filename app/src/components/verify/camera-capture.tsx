import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";

interface CameraCaptureProps {
    onCapture: (imageData: string) => void;
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
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mountedRef = useRef(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [barcodeDetected, setBarcodeDetected] = useState(false);

    // Get overlay dimensions based on mode
    const getOverlayStyle = () => {
        switch (mode) {
            case "document":
                return {
                    width: "85%",
                    height: "55%",
                    borderRadius: "12px",
                };
            case "barcode":
                return {
                    width: "70%",
                    height: "25%",
                    borderRadius: "8px",
                };
            case "selfie":
                return {
                    width: "60%",
                    height: "45%",
                    borderRadius: "50%",
                };
            default:
                return {
                    width: "80%",
                    height: "50%",
                    borderRadius: "8px",
                };
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

            // Check if component is still mounted before proceeding
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
                    // Ignore AbortError - happens when component unmounts during play
                    if (playErr instanceof Error && playErr.name === "AbortError") {
                        return;
                    }
                    throw playErr;
                }
            }
        } catch (err) {
            // Ignore AbortError from unmounting
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

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Flip horizontally for selfie mode
        if (mode === "selfie") {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);

        stopCamera();
        onCapture(imageData);
    }, [mode, stopCamera, onCapture]);

    useEffect(() => {
        mountedRef.current = true;
        startCamera();
        return () => {
            mountedRef.current = false;
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    // Barcode detection (native API - works in Chrome/Edge mobile)
    useEffect(() => {
        if (mode !== "barcode" || !isReady || !videoRef.current) return;

        // Check if BarcodeDetector is available
        if (!("BarcodeDetector" in window)) {
            console.log("BarcodeDetector not supported, falling back to manual capture");
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
                    // Auto-capture after barcode detected
                    setTimeout(() => {
                        if (mountedRef.current) {
                            captureImage();
                        }
                    }, 500);
                    return;
                }
            } catch (err) {
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

    const overlayStyle = getOverlayStyle();

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
            {/* Camera Feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                    mode === "selfie" ? "scale-x-[-1]" : ""
                }`}
            />

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay with cutout */}
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/50" />

                {/* Cutout frame */}
                <div
                    className={`relative border-2 ${
                        barcodeDetected ? "border-green-500" : "border-white"
                    } bg-transparent z-10`}
                    style={{
                        width: overlayStyle.width,
                        height: overlayStyle.height,
                        borderRadius: overlayStyle.borderRadius,
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                    }}
                >
                    {/* Corner markers */}
                    {mode !== "selfie" && (
                        <>
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr" />
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br" />
                        </>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
                <p className="text-white text-center text-lg font-medium drop-shadow-lg">
                    {instructions}
                </p>
                {guidanceText && (
                    <p className="text-gray-300 text-center text-sm mt-2 drop-shadow">
                        {guidanceText}
                    </p>
                )}
            </div>

            {/* Barcode detection indicator */}
            {mode === "barcode" && barcodeDetected && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                        Barcode Detected!
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe z-20" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
                <div className="flex items-center justify-center gap-4">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                        Cancel
                    </Button>

                    {isReady && (
                        <Button
                            onClick={captureImage}
                            className="w-16 h-16 rounded-full bg-zinc-900 border border-4 border-blue-100 shadow-lg active:scale-95 transition-transform"
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
