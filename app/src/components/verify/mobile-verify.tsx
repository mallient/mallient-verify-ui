import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    type IdType,
    type VerificationState,
    initialVerificationState,
} from "@/lib/idTypes";
import { IdTypeSelection } from "./id-type-selection";
import { CameraCapture } from "./camera-capture";
import {
    ScanInstruction,
    FlipIdTransition,
    SelfieTransition,
} from "./scan-instructions";
import { Button } from "../ui/button";
import { useSession } from "@/context/sessionContext";
import { useBrandConfig } from "@/context/brandConfigContext";

type SubStep = "instruction" | "capture" | "transition";

interface MobileVerifyProps {
    onComplete?: () => void;
    onCancel?: () => void;
}

export const MobileVerify = ({ onComplete, onCancel }: MobileVerifyProps = {}) => {
    const navigate = useNavigate();
    const { brandName, updateStep, completeSession } = useSession();
    const { brandConfig } = useBrandConfig();
    const urlRedirectOnComplete = brandConfig.urlRedirectOnComplete || '/dashboard';
    const [state, setState] = useState<VerificationState>(initialVerificationState);
    const [subStep, setSubStep] = useState<SubStep>("instruction");

    const updateState = useCallback((updates: Partial<VerificationState>) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    const handleIdTypeSelect = useCallback(
        (idType: IdType) => {
            updateState({ selectedIdType: idType, step: "scan_front" });
            setSubStep("instruction");
            updateStep('scan_front');
        },
        [updateState, updateStep]
    );

    const handleFrontCapture = useCallback(
        (imageData: string) => {
            updateState({ frontImage: imageData });
            updateStep('scan_front');
            
            if (state.selectedIdType?.requiresBackScan) {
                // Show flip transition screen
                updateState({ step: "scan_back" });
                setSubStep("transition");
                updateStep('scan_back');
            } else {
                // Go directly to selfie
                updateState({ step: "capture_selfie" });
                setSubStep("transition");
                updateStep('capture_selfie');
            }
        },
        [state.selectedIdType, updateState, updateStep]
    );

    const handleBackCapture = useCallback(
        (imageData: string) => {
            updateState({ backImage: imageData, step: "capture_selfie" });
            setSubStep("transition");
            updateStep('capture_selfie');
        },
        [updateState, updateStep]
    );

    const handleSelfieCapture = useCallback(
        (imageData: string) => {
            updateState({ selfieImage: imageData, step: "processing" });
            updateStep('processing');
            
            // TODO: Send images to backend for verification
            // For now, simulate processing then complete the session
            setTimeout(async () => {
                try {
                    await completeSession();
                    updateState({ step: "complete" });
                } catch {
                    updateState({ step: "error", error: "Failed to complete verification" });
                }
            }, 2000);
        },
        [updateState, updateStep, completeSession]
    );

    const handleCancel = useCallback(() => {
        if (state.step === "select_id_type") {
            if (onCancel) {
                onCancel();
            } else {
                navigate(-1);
            }
        } else {
            // Reset to beginning
            setState(initialVerificationState);
            setSubStep("instruction");
        }
    }, [state.step, navigate, onCancel]);

    const handleComplete = useCallback(() => {
        if (onComplete) {
            onComplete();
        } else if (urlRedirectOnComplete.startsWith('http://') || urlRedirectOnComplete.startsWith('https://')) {
            window.location.href = urlRedirectOnComplete;
        } else {
            navigate(urlRedirectOnComplete);
        }
    }, [onComplete, urlRedirectOnComplete, navigate]);

    // Render based on current step
    const renderStep = () => {
        switch (state.step) {
            case "select_id_type":
                return <IdTypeSelection onSelect={handleIdTypeSelect} onBack={handleCancel} />;

            case "scan_front":
                if (subStep === "instruction") {
                    return (
                        <ScanInstruction
                            title="Scan Front of ID"
                            description={`Position the front of your ${state.selectedIdType?.name || "ID"} within the frame. Make sure all text is clearly visible.`}
                            icon="front"
                            onContinue={() => setSubStep("capture")}
                            onCancel={handleCancel}
                        />
                    );
                }
                return (
                    <CameraCapture
                        mode="document"
                        instructions="Position the front of your ID"
                        guidanceText="Align all corners within the frame"
                        onCapture={handleFrontCapture}
                        onCancel={() => setSubStep("instruction")}
                    />
                );

            case "scan_back":
                if (subStep === "transition") {
                    return <FlipIdTransition onContinue={() => setSubStep("capture")} />;
                }
                if (subStep === "instruction") {
                    return (
                        <ScanInstruction
                            title="Scan Back of ID"
                            description="Position the barcode on the back of your ID within the smaller frame."
                            icon="back"
                            onContinue={() => setSubStep("capture")}
                            onCancel={handleCancel}
                        />
                    );
                }
                return (
                    <CameraCapture
                        mode="barcode"
                        instructions="Scan the barcode"
                        guidanceText="Align the barcode within the frame"
                        onCapture={handleBackCapture}
                        onCancel={() => setSubStep("instruction")}
                    />
                );

            case "capture_selfie":
                if (subStep === "transition") {
                    return <SelfieTransition onContinue={() => setSubStep("capture")} />;
                }
                if (subStep === "instruction") {
                    return (
                        <ScanInstruction
                            title="Take a Selfie"
                            description="Position your face within the oval frame. Make sure your face is well-lit and clearly visible."
                            icon="selfie"
                            onContinue={() => setSubStep("capture")}
                            onCancel={handleCancel}
                        />
                    );
                }
                return (
                    <CameraCapture
                        mode="selfie"
                        instructions="Center your face"
                        guidanceText="Keep a neutral expression"
                        onCapture={handleSelfieCapture}
                        onCancel={() => setSubStep("instruction")}
                    />
                );

            case "processing":
                return (
                    <div className="flex flex-col items-center justify-center flex-1 p-6">
                        <div className="w-16 h-16 border-4 border-amber-200 border-t-transparent rounded-full animate-spin mb-6" />
                        <h1 className="text-xl font-bold mb-2">Verifying Your Identity</h1>
                        <p className="text-gray-400 text-center">
                            Please wait while we process your documents...
                        </p>
                    </div>
                );

            case "complete":
                return (
                    <div className="flex flex-col items-center justify-center flex-1 p-6">
                        <div className="bg-green-500/10 border border-green-500 rounded-full p-8 mb-6">
                            <svg
                                className="w-16 h-16 text-green-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-green-400">
                            Verification Complete!
                        </h1>
                        <p className="text-gray-400 text-center mb-8">
                            Your identity has been successfully verified.
                        </p>
                        <Button
                            onClick={handleComplete}
                            variant={'default'}
                           >
                            Continue to {brandName || 'Dashboard'}
                        </Button>
                    </div>
                );

            case "error":
                return (
                    <div className="flex flex-col items-center justify-center flex-1 p-6">
                        <div className="bg-red-500/10 border border-red-500 rounded-full p-8 mb-6">
                            <svg
                                className="w-16 h-16 text-red-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-2 text-red-400">
                            Verification Failed
                        </h1>
                        <p className="text-gray-400 text-center mb-8">
                            {state.error || "Something went wrong. Please try again."}
                        </p>
                        <Button
                            onClick={() => setState(initialVerificationState)}
                            variant={'outline'}
                        >
                            Try Again
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return <div className="flex flex-col flex-1">{renderStep()}</div>;
};