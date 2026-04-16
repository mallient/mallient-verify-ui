import { Button } from "../ui/button";

export interface SubmissionReviewProps {
    frontImage: string;
    backImage: string | null;
    selfieImage: string;
    frontScore: number;
    backScore: number | null;
    selfieScore: number;
    livenessScore: number;
    idTypeName: string;
    onSubmit: () => void;
    onRetake: (step: "scan_front" | "scan_back" | "capture_selfie") => void;
}

function ScoreBadge({ score }: { score: number }) {
    const colorClass =
        score >= 80
            ? "text-green-400 bg-green-500/10 border-green-500/30"
            : score >= 60
            ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
            : "text-red-400 bg-red-500/10 border-red-500/30";
    const label = score >= 80 ? "High Confidence" : score >= 60 ? "Moderate" : "Low Confidence";
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
            {label}
        </span>
    );
}

interface ImageCardProps {
    label: string;
    image: string;
    score: number;
    aspect: "video" | "square";
    onRetake: () => void;
}

function ImageCard({ label, image, score, aspect, onRetake }: ImageCardProps) {
    return (
        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
            <div className={`relative w-full ${aspect === "video" ? "aspect-video" : "aspect-square"} bg-black`}>
                <img
                    src={image}
                    alt={label}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-white text-sm font-medium truncate">{label}</span>
                    <ScoreBadge score={score} />
                </div>
                <button
                    onClick={onRetake}
                    className="text-blue-400 text-sm font-medium hover:text-blue-300 shrink-0"
                >
                    Retake
                </button>
            </div>
        </div>
    );
}

export const SubmissionReview = ({
    frontImage,
    backImage,
    selfieImage,
    frontScore,
    backScore,
    selfieScore: _selfieScore,
    livenessScore,
    idTypeName,
    onSubmit,
    onRetake,
}: SubmissionReviewProps) => {
    const scores = [frontScore, livenessScore, ...(backScore !== null ? [backScore] : [])];
    const overallScore = Math.round(scores.reduce((s, n) => s + n, 0) / scores.length);

    return (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">
            {/* Header */}
            <div
                className="px-6 pb-4 border-b border-zinc-800"
                style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
            >
                <h1 className="text-white text-xl font-bold">Review &amp; Submit</h1>
                <p className="text-zinc-400 text-sm mt-1">
                    Check your {idTypeName} images before submitting
                </p>
            </div>

            {/* Scrollable image cards */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                <ImageCard
                    label={`Front — ${idTypeName}`}
                    image={frontImage}
                    score={frontScore}
                    aspect="video"
                    onRetake={() => onRetake("scan_front")}
                />

                {backImage !== null && backScore !== null && (
                    <ImageCard
                        label="Back / Barcode"
                        image={backImage}
                        score={backScore}
                        aspect="video"
                        onRetake={() => onRetake("scan_back")}
                    />
                )}

                <ImageCard
                    label="Selfie — Liveness"
                    image={selfieImage}
                    score={livenessScore}
                    aspect="square"
                    onRetake={() => onRetake("capture_selfie")}
                />

                {/* Overall confidence summary */}
                <div className="bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Overall confidence</span>
                    <ScoreBadge score={overallScore} />
                </div>
            </div>

            {/* Submit footer */}
            <div
                className="px-4 pt-4 border-t border-zinc-800"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
                <Button
                    onClick={onSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12"
                >
                    Submit Verification
                </Button>
            </div>
        </div>
    );
};
