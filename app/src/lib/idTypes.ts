// US Government ID Types

export interface IdType {
    id: string;
    name: string;
    description: string;
    requiresBackScan: boolean;
    hasBarcode: boolean;
}

export const US_ID_TYPES: IdType[] = [
    {
        id: "drivers_license",
        name: "Driver's License",
        description: "State-issued driver's license",
        requiresBackScan: true,
        hasBarcode: true,
    },
    {
        id: "state_id",
        name: "State ID Card",
        description: "State-issued identification card",
        requiresBackScan: true,
        hasBarcode: true,
    },
    {
        id: "passport",
        name: "US Passport",
        description: "US Passport book (photo page)",
        requiresBackScan: false,
        hasBarcode: false,
    },
    {
        id: "passport_card",
        name: "US Passport Card",
        description: "US Passport card",
        requiresBackScan: true,
        hasBarcode: false,
    },
    {
        id: "military_id",
        name: "Military ID",
        description: "Department of Defense ID card",
        requiresBackScan: true,
        hasBarcode: true,
    },
    {
        id: "green_card",
        name: "Permanent Resident Card",
        description: "Green Card / Permanent Resident Card",
        requiresBackScan: true,
        hasBarcode: false,
    },
    {
        id: "tribal_id",
        name: "Tribal ID",
        description: "Federally recognized tribal ID",
        requiresBackScan: true,
        hasBarcode: false,
    },
];

export type VerificationStep = 
    | "select_id_type"
    | "scan_front"
    | "scan_back"
    | "capture_selfie"
    | "review"
    | "processing"
    | "complete"
    | "error";

export interface VerificationState {
    step: VerificationStep;
    selectedIdType: IdType | null;
    frontImage: string | null;
    backImage: string | null;
    selfieImage: string | null;
    frontScore: number | null;
    backScore: number | null;
    selfieScore: number | null;
    error: string | null;
}

export const initialVerificationState: VerificationState = {
    step: "select_id_type",
    selectedIdType: null,
    frontImage: null,
    backImage: null,
    selfieImage: null,
    frontScore: null,
    backScore: null,
    selfieScore: null,
    error: null,
};
