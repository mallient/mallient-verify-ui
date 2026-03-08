import { US_ID_TYPES, type IdType } from "@/lib/idTypes";
import { Button } from "../ui/button";

interface IdTypeSelectionProps {
    onSelect: (idType: IdType) => void;
}

export const IdTypeSelection = ({ onSelect }: IdTypeSelectionProps) => {
    return (
        <div className="flex flex-col flex-1 p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Select Your ID Type</h1>
                <p className="text-gray-400 text-sm">
                    Choose the type of government-issued ID you'll be using for verification
                </p>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-auto">
                {US_ID_TYPES.map((idType) => (
                    <Button
                        key={idType.id}
                        onClick={() => onSelect(idType)}
                        variant={'outline'}
                        className="flex flex-col items-start p-4 h-auto bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-left"
                    >
                        <span className="font-semibold text-white">{idType.name}</span>
                        <span className="text-sm text-gray-400 font-normal">
                            {idType.description}
                        </span>
                    </Button>
                ))}
            </div>
        </div>
    );
};
