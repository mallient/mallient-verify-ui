import { Button } from "../ui/button";

interface ScanInstructionProps {
    title: string;
    description: string;
    icon: "front" | "back" | "selfie";
    onContinue: () => void;
    onCancel?: () => void;
}

export const ScanInstruction = ({
    title,
    description,
    icon,
    onContinue,
    onCancel,
}: ScanInstructionProps) => {
    const renderIcon = () => {
        switch (icon) {
            case "front":
                return (
                    <div className="relative w-48 h-32 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg border-2 border-zinc-600 flex items-center justify-center">
                        <div className="absolute top-3 left-3 w-10 h-10 bg-zinc-500 rounded-full" />
                        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
                            <div className="w-16 h-2 bg-zinc-500 rounded" />
                            <div className="w-12 h-2 bg-zinc-500 rounded" />
                        </div>
                        <span className="text-xs text-zinc-400 absolute bottom-3 left-3">FRONT</span>
                    </div>
                );
            case "back":
                return (
                    <div className="relative w-48 h-32 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg border-2 border-zinc-600 flex items-center justify-center">
                        <div className="w-32 h-12 bg-zinc-600 rounded flex items-center justify-center">
                            <div className="flex gap-0.5">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 h-8 bg-zinc-400"
                                        style={{ opacity: Math.random() * 0.5 + 0.5 }}
                                    />
                                ))}
                            </div>
                        </div>
                        <span className="text-xs text-zinc-400 absolute bottom-3 left-3">BARCODE</span>
                    </div>
                );
            case "selfie":
                return (
                    <div className="relative w-32 h-40 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full border-2 border-zinc-600 flex items-center justify-center">
                        <svg
                            className="w-16 h-16 text-zinc-500"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col items-center justify-center flex-1 p-6">
            <div className="mb-8">{renderIcon()}</div>

            <h1 className="text-2xl font-bold mb-3 text-center">{title}</h1>
            <p className="text-gray-400 text-center max-w-sm mb-8">{description}</p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button
                    onClick={onContinue}
                    variant={'default'}
                    >
                    Start Scanning
                </Button>

                {onCancel && (
                    <Button 
                        onClick={onCancel} 
                        variant={'outline'}
                    >
                        Cancel
                    </Button>
                )}
            </div>
        </div>
    );
};

interface TransitionScreenProps {
    onContinue: () => void;
}

export const FlipIdTransition = ({ onContinue }: TransitionScreenProps) => {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-6 bg-gradient-to-b from-green-900/20 to-transparent">
            <div className="bg-green-500/10 border border-green-500 rounded-full p-6 mb-6">
                <svg
                    className="w-12 h-12 text-green-500"
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

            <h1 className="text-2xl font-bold mb-3 text-center text-green-400">
                Front Captured!
            </h1>
            <p className="text-gray-300 text-center max-w-sm mb-8">
                Now, please flip your ID and scan the barcode on the back.
            </p>

            <div className="relative w-48 h-32 mb-8">
                {/* Flip animation placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg border-2 border-green-500/50 flex items-center justify-center animate-pulse">
                    <svg
                        className="w-8 h-8 text-zinc-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </div>
            </div>

            <Button
                onClick={onContinue}
                variant={'default'}
            >
                Scan Back of ID
            </Button>
        </div>
    );
};

export const SelfieTransition = ({ onContinue }: TransitionScreenProps) => {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-6 bg-gradient-to-b from-green-900/20 to-transparent">
            <div className="bg-green-500/10 border border-green-500 rounded-full p-6 mb-6">
                <svg
                    className="w-12 h-12 text-green-500"
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

            <h1 className="text-2xl font-bold mb-3 text-center text-green-400">
                ID Captured Successfully!
            </h1>
            <p className="text-gray-300 text-center max-w-sm mb-8">
                Now we need to take a selfie to verify it's really you.
            </p>

            <div className="relative w-32 h-40 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full border-2 border-zinc-600 flex items-center justify-center mb-8">
                <svg
                    className="w-16 h-16 text-zinc-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
            </div>

            <Button
                onClick={onContinue}
                variant={'default'}
            >
                Take Selfie
            </Button>
        </div>
    );
};
