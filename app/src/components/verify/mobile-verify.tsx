import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    type IdType,
    type VerificationState,
    initialVerificationState,
} from "@/lib/idTypes";
import { IdTypeSelection } from "./id-type-selection";
import { CameraCapture } from "./camera-capture";
import { ScanInstruction, FlipIdTransition, SelfieTransition } from "./scan-instructions";
import { SubmissionReview } from "./submission-review";
import { Button } from "../ui/button";
import { useSession } from "@/context/sessionContext";
import { useBrandConfig } from "@/context/brandConfigContext";
import { SubmissionService } from "@/redux/api/submissionService";
import type { CreateSubmissionRequest, DocumentSubmission, PresignedUploadUrl } from "@/redux/types/brandConfig";

type SubStep = "instruction" | "capture" | "transition";

interface MobileVerifyProps {
    onComplete?: () => void;
    onCancel?: () => void;
}

export const MobileVerify = ({ onComplete, onCancel }: MobileVerifyProps = {}) => {
    const navigate = useNavigate();
    const { brandName, sessionId, sessionToken, submissionId, updateStep, completeSession } = useSession();
    const { brandConfig, organization } = useBrandConfig();
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
        (imageData: string, score: number) => {
            updateState({ frontImage: imageData, frontScore: score });
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
        (imageData: string, score: number) => {
            updateState({ backImage: imageData, backScore: score, step: "capture_selfie" });
            setSubStep("transition");
            updateStep('capture_selfie');
        },
        [updateState, updateStep]
    );

    const handleSelfieCapture = useCallback(
        (imageData: string, score: number) => {
            updateState({ selfieImage: imageData, selfieScore: score, step: "review" });
        },
        [updateState]
    );

    const handleSubmit = useCallback(async () => {
        updateState({ step: "processing" });
        updateStep('processing');
        try {
            const tenantId = organization?.organizationId ?? '';
            const applicationId = organization?.applicationId ?? '';
            const service = new SubmissionService(sessionToken ?? '');

            // Build the list of document types that have captured images
            const capturedDocs: Array<{ documentType: string; imageData: string }> = [
                ...(state.frontImage ? [{ documentType: 'front_id', imageData: state.frontImage }] : []),
                ...(state.backImage ? [{ documentType: 'back_id', imageData: state.backImage }] : []),
                ...(state.selfieImage ? [{ documentType: 'selfie', imageData: state.selfieImage }] : []),
            ];

            console.log('[Submit] Captured documents:', capturedDocs.map(d => d.documentType));

            // Step 1: Get presigned S3 upload URLs for all documents in one call
            const presignedUrls = await service.generateUploadUrls(
                tenantId,
                applicationId,
                submissionId ?? sessionId ?? '',
                capturedDocs.map((d) => d.documentType),
            );

            console.log('[Submit] Received presigned URLs for:', presignedUrls);

            // Step 2: Upload each image directly to its presigned S3 URL in parallel
            await Promise.all(
                presignedUrls.map(async (entry: PresignedUploadUrl) => {
                    const doc = capturedDocs.find((d) => d.documentType === entry.documentType);
                    if (!doc) {
                        const err = new Error(`No image found for documentType: ${entry.documentType}`);
                        console.error('[Upload] Missing image data:', err.message);
                        throw err;
                    }
                    try {
                        await service.uploadToPresignedUrl(entry.presignedUrl, doc.imageData);
                        console.log(`[Upload] Successfully uploaded ${entry.documentType}`);
                    } catch (err) {
                        console.error(`[Upload] Failed to upload ${entry.documentType}:`, err);
                        throw err;
                    }
                }),
            );

            // Step 3: Build the submission with S3 locations returned from the presigned URL step
            const documents: DocumentSubmission[] = presignedUrls.map((entry: PresignedUploadUrl) => ({
                documentType: entry.documentType,
                documentId: entry.documentId,
                documentUrl: '',
                s3Key: entry.s3Key,
            }));

            const request: CreateSubmissionRequest = {
                tenantId,
                submissionId: submissionId ?? sessionId ?? '',
                applicationId,
                applicantId: '',
                submissionType: 'verify',
                uploadSessionId: submissionId ?? sessionId ?? '',
                documents,
            };

            const result = await service.createSubmission(tenantId, request);
            if (!result.isSuccessful) {
                throw new Error(result.errorMessage ?? 'Submission failed');
            }

            // Submission succeeded — stop the processing spinner immediately
            updateState({ step: "complete" });

            // Notify the session service in the background (non-blocking)
            completeSession().catch((err) =>
                console.error('[Submit] completeSession failed (non-fatal):', err)
            );
        } catch(error) {
            console.error("Error during verification:", error);
            updateState({ step: "error", error: "Failed to complete verification" });
        }
    }, [updateState, updateStep, completeSession, organization, sessionId, sessionToken, submissionId, state.frontImage, state.backImage, state.selfieImage]);

    const handleRetake = useCallback(
        (step: "scan_front" | "scan_back" | "capture_selfie") => {
            if (step === "scan_front") {
                updateState({ step: "scan_front", frontImage: null, frontScore: null });
            } else if (step === "scan_back") {
                updateState({ step: "scan_back", backImage: null, backScore: null });
            } else {
                updateState({ step: "capture_selfie", selfieImage: null, selfieScore: null });
            }
            setSubStep("instruction");
        },
        [updateState]
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

            case "review":
                return (
                    <SubmissionReview
                        frontImage={state.frontImage!}
                        backImage={state.backImage}
                        selfieImage={state.selfieImage!}
                        frontScore={state.frontScore ?? 0}
                        backScore={state.backScore}
                        selfieScore={state.selfieScore ?? 0}
                        idTypeName={state.selectedIdType?.name ?? "ID"}
                        onSubmit={handleSubmit}
                        onRetake={handleRetake}
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
                            You may now close this application.
                        </p>
                        {(onComplete || (brandConfig.urlRedirectOnComplete && !brandConfig.urlRedirectOnComplete.startsWith('/'))) && (
                            <Button onClick={handleComplete} variant={'default'}>
                                Continue to {brandName || 'Dashboard'}
                            </Button>
                        )}
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
                            onClick={() => updateState({ step: "review", error: null })}
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