import { useState, useMemo } from "react";
import { SOVEREIGN_COUNTRIES, getCountryIdTypes } from "@/lib/countries";
import { type Country, type IdType } from "@/lib/idTypes";
import { Button } from "../ui/button";

interface IdTypeSelectionProps {
    onSelect: (idType: IdType, country: Country) => void;
    onBack?: () => void;
}

export const IdTypeSelection = ({ onSelect, onBack }: IdTypeSelectionProps) => {
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [search, setSearch] = useState("");

    const filteredCountries = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return SOVEREIGN_COUNTRIES;
        return SOVEREIGN_COUNTRIES.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase() === q
        );
    }, [search]);

    const countryIdTypes = useMemo(
        () => (selectedCountry ? getCountryIdTypes(selectedCountry.code) : []),
        [selectedCountry]
    );

    // ── Step 1: Country selection ───────────────────────────────────────
    if (!selectedCountry) {
        return (
            <div className="flex flex-col flex-1 p-6">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold mb-2">Country of Residence</h1>
                    <p className="text-gray-400 text-sm">
                        Select the country where you currently reside
                    </p>
                </div>

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search countries…"
                    className="mb-4 px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500"
                />

                <div className="flex flex-col gap-2 flex-1 overflow-auto">
                    {filteredCountries.length === 0 && (
                        <p className="text-gray-500 text-sm text-center mt-6">
                            No countries found for "{search}"
                        </p>
                    )}
                    {filteredCountries.map((country) => (
                        <Button
                            key={country.code}
                            onClick={() => setSelectedCountry(country)}
                            variant="outline"
                            className="flex items-center gap-3 px-4 py-3 h-auto text-left justify-start bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                        >
                            <span className="text-2xl leading-none">{country.flag}</span>
                            <span className="font-medium text-white">{country.name}</span>
                        </Button>
                    ))}
                </div>

                {onBack && (
                    <div className="mt-4">
                        <Button onClick={onBack} variant="outline" className="w-full">
                            Back to Verify Page
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // ── Step 2: ID type selection for the chosen country ────────────────
    return (
        <div className="flex flex-col flex-1 p-6">
            <div className="mb-6">
                <button
                    onClick={() => setSelectedCountry(null)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <span>←</span>
                    <span className="text-base leading-none">{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                </button>
                <h1 className="text-2xl font-bold mb-2">Select Your ID Type</h1>
                <p className="text-gray-400 text-sm">
                    Choose the government-issued ID you'll use for verification
                </p>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-auto">
                {countryIdTypes.map((idType) => (
                    <Button
                        key={idType.id}
                        onClick={() => onSelect(idType, selectedCountry)}
                        variant="outline"
                        className="flex flex-col items-start p-4 h-auto bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-left"
                    >
                        <span className="font-semibold text-white">{idType.name}</span>
                        <span className="text-sm text-gray-400 font-normal">
                            {idType.description}
                        </span>
                    </Button>
                ))}
            </div>

            {onBack && (
                <div className="mt-4">
                    <Button onClick={onBack} variant="outline" className="w-full">
                        Back to Verify Page
                    </Button>
                </div>
            )}
        </div>
    );
};

