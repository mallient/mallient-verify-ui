import { US_ID_TYPES, type Country, type IdType } from './idTypes';

// ---------------------------------------------------------------------------
// Reusable ID-type factory helpers
// ---------------------------------------------------------------------------

const passport = (): IdType => ({
    id: 'passport',
    name: 'Passport',
    description: 'International travel passport booklet',
    requiresBackScan: false,
    hasBarcode: false,
});

const nationalId = (): IdType => ({
    id: 'national_id',
    name: 'National ID Card',
    description: 'Government-issued national identity card',
    requiresBackScan: true,
    hasBarcode: false,
});

/** EU-style driver's licence (no PDF417 barcode on reverse) */
const driversLicenseEU = (): IdType => ({
    id: 'drivers_license',
    name: "Driver's Licence",
    description: "Government-issued driver's licence",
    requiresBackScan: true,
    hasBarcode: false,
});

/** North-American-style driver's license with PDF417 barcode on reverse */
const driversLicenseNA = (): IdType => ({
    id: 'drivers_license',
    name: "Driver's License",
    description: "Government-issued driver's license",
    requiresBackScan: true,
    hasBarcode: true,
});

const residencePermit = (): IdType => ({
    id: 'residence_permit',
    name: 'Residence Permit',
    description: 'Government-issued residence / stay permit',
    requiresBackScan: true,
    hasBarcode: false,
});

const voterId = (): IdType => ({
    id: 'voter_id',
    name: 'Voter ID Card',
    description: 'Government-issued voter registration / electoral card',
    requiresBackScan: false,
    hasBarcode: false,
});

/** Standard 3-document set used by most countries (EU-style DL) */
const std = (): IdType[] => [passport(), nationalId(), driversLicenseEU()];

/** Passport + national ID only (no widespread DL culture) */
const stdNoDrivers = (): IdType[] => [passport(), nationalId()];

// ---------------------------------------------------------------------------
// Per-country ID-type configurations
// ---------------------------------------------------------------------------

export const COUNTRY_ID_TYPES: Record<string, IdType[]> = {

    // ── NORTH AMERICA ─────────────────────────────────────────────────────
    US: US_ID_TYPES,

    CA: [
        passport(),
        {
            id: 'provincial_drivers_license',
            name: "Provincial Driver's License",
            description: "Province-issued driver's license (PDF417 barcode)",
            requiresBackScan: true,
            hasBarcode: true,
        },
        {
            id: 'provincial_id',
            name: 'Provincial ID Card',
            description: "Province-issued non-driver photo ID",
            requiresBackScan: true,
            hasBarcode: true,
        },
        {
            id: 'citizenship_card',
            name: 'Citizenship Card',
            description: 'Canadian Citizenship Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'permanent_resident_card',
            name: 'Permanent Resident Card',
            description: 'Canadian Permanent Resident Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    MX: [
        passport(),
        {
            id: 'ine_voter_id',
            name: 'INE Voter ID (Credencial para Votar)',
            description: 'Mexican National Electoral Institute (INE/IFE) voter card',
            requiresBackScan: true,
            hasBarcode: true,
        },
        driversLicenseNA(),
    ],

    // ── CENTRAL & SOUTH AMERICA ───────────────────────────────────────────
    BR: [
        passport(),
        {
            id: 'rg',
            name: 'RG – Registro Geral',
            description: 'Brazilian state-issued identity document',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'cnh',
            name: 'CNH – Driver\'s License',
            description: 'Brazilian National Driver\'s License (Carteira Nacional de Habilitação)',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    AR: [
        passport(),
        {
            id: 'dni',
            name: 'DNI – Documento Nacional de Identidad',
            description: 'Argentine National Identity Document',
            requiresBackScan: true,
            hasBarcode: true,
        },
        driversLicenseNA(),
    ],

    CL: [
        passport(),
        {
            id: 'cedula',
            name: 'Cédula de Identidad',
            description: 'Chilean National Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    CO: [
        passport(),
        {
            id: 'cedula_ciudadania',
            name: 'Cédula de Ciudadanía',
            description: 'Colombian National Identity Card',
            requiresBackScan: true,
            hasBarcode: true,
        },
        driversLicenseNA(),
    ],

    PE: [
        passport(),
        {
            id: 'dni_pe',
            name: 'DNI – Documento Nacional de Identidad',
            description: 'Peruvian National Identity Document (RENIEC)',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    VE: [
        passport(),
        {
            id: 'cedula_ve',
            name: 'Cédula de Identidad',
            description: 'Venezuelan National Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    // Remaining LatAm with standard docs
    AG: std(), BB: std(), BS: std(), BZ: std(), BO: std(),
    CR: std(), CU: stdNoDrivers(), DM: std(), DO: std(),
    EC: std(), SV: std(), GD: std(), GT: std(), GY: std(),
    HT: stdNoDrivers(), HN: std(), JM: std(), NI: std(),
    PA: std(), PY: std(), KN: std(), LC: std(), VC: std(),
    SR: std(), TT: std(), UY: std(),

    // ── EUROPE – UK ───────────────────────────────────────────────────────
    GB: [
        passport(),
        {
            id: 'drivers_licence_gb',
            name: "Driver's Licence",
            description: "DVLA photo card driver's licence",
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'biometric_residence_permit',
            name: 'Biometric Residence Permit (BRP)',
            description: 'UK Home Office Biometric Residence Permit',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    // ── EUROPE – EU MEMBER STATES ─────────────────────────────────────────
    AT: std(), BE: std(), BG: std(), HR: std(),
    CY: std(), CZ: std(), DK: std(), EE: std(), FI: std(),
    FR: std(), GR: std(), HU: std(), IE: [
        passport(),
        nationalId(),
        driversLicenseEU(),
        {
            id: 'public_services_card',
            name: 'Public Services Card (PSC)',
            description: 'Irish Public Services Card issued by the Department of Social Protection',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],
    IT: std(), LV: std(), LT: std(), LU: std(), MT: std(),
    NL: std(), PL: std(), RO: std(), SK: std(), SI: std(),
    SE: std(),

    DE: [
        passport(),
        {
            id: 'personalausweis',
            name: 'Personalausweis (National ID Card)',
            description: 'German Federal Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    ES: [
        passport(),
        {
            id: 'dni_es',
            name: 'DNI (Documento Nacional de Identidad)',
            description: 'Spanish National Identity Document',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    PT: [
        passport(),
        {
            id: 'cartao_cidadao',
            name: 'Cartão de Cidadão (Citizen Card)',
            description: 'Portuguese Citizen Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    // ── EUROPE – NON-EU ─────────────────────────────────────────────────
    NO: std(), CH: std(), IS: std(), LI: std(),

    AL: std(), AD: std(), BA: std(), BY: std(),
    GE: std(), XK: std(), MD: std(),
    ME: std(), MK: std(), SM: std(), RS: std(),
    UA: std(), AM: std(), AZ: std(),

    MC: [
        passport(),
        {
            id: 'carte_identite_mc',
            name: "Carte d'Identité Monégasque",
            description: 'Monaco National Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    RU: [
        passport(),
        {
            id: 'rus_internal_passport',
            name: 'Internal Passport (Паспорт гражданина)',
            description: 'Russian Federation internal identity document',
            requiresBackScan: false,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    TR: [
        passport(),
        {
            id: 'tc_kimlik',
            name: 'TC Kimlik Kartı (National ID)',
            description: 'Turkish Republic Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    VA: [passport()],

    // ── MIDDLE EAST ───────────────────────────────────────────────────────
    SA: [
        passport(),
        {
            id: 'huwiyya',
            name: 'Huwiyya (National ID – هوية)',
            description: 'Saudi Arabian National Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'iqama',
            name: 'Iqama (Residence Permit – إقامة)',
            description: 'Saudi Arabian Residency Permit for expatriates',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    AE: [
        passport(),
        {
            id: 'emirates_id',
            name: 'Emirates ID',
            description: 'UAE Federal Authority for Identity & Citizenship card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    IL: [
        passport(),
        {
            id: 'teudat_zehut',
            name: 'Teudat Zehut (תעודת זהות)',
            description: 'Israeli Identity Card',
            requiresBackScan: false,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    QA: [passport(), nationalId(), driversLicenseEU(), residencePermit()],
    KW: [passport(), nationalId(), driversLicenseEU(), residencePermit()],
    BH: [passport(), nationalId(), driversLicenseEU(), residencePermit()],
    OM: [passport(), nationalId(), driversLicenseEU(), residencePermit()],
    JO: std(), LB: std(), IQ: std(), SY: stdNoDrivers(),
    PS: stdNoDrivers(), YE: stdNoDrivers(), IR: std(),

    // ── SOUTH ASIA ───────────────────────────────────────────────────────
    IN: [
        passport(),
        {
            id: 'aadhaar',
            name: 'Aadhaar Card',
            description: 'UIDAI-issued 12-digit biometric identity card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'pan_card',
            name: 'PAN Card',
            description: 'Income Tax Department Permanent Account Number card',
            requiresBackScan: false,
            hasBarcode: false,
        },
        voterId(),
        {
            id: 'drivers_license_in',
            name: "Driver's License",
            description: 'State RTO-issued driver\'s license',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    PK: [
        passport(),
        {
            id: 'cnic',
            name: 'CNIC (Computerized National Identity Card)',
            description: 'NADRA-issued Computerized National Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    BD: [
        passport(),
        {
            id: 'nid_bd',
            name: 'National Identity Card (NID)',
            description: 'Bangladesh Election Commission National Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    LK: std(), NP: std(), MV: std(), BT: stdNoDrivers(), AF: stdNoDrivers(),

    // ── EAST ASIA ─────────────────────────────────────────────────────────
    CN: [
        passport(),
        {
            id: 'resident_id_cn',
            name: 'Resident Identity Card (居民身份证)',
            description: 'Chinese 2nd Generation Resident Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    JP: [
        passport(),
        {
            id: 'my_number_card',
            name: 'My Number Card (マイナンバーカード)',
            description: 'Japanese Individual Number Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'drivers_license_jp',
            name: "Driver's License (運転免許証)",
            description: 'Japanese prefectural public safety commission driver\'s license',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'residence_card_jp',
            name: 'Residence Card (在留カード)',
            description: 'Zairyu Card for registered foreign nationals',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    KR: [
        passport(),
        {
            id: 'resident_registration',
            name: 'Resident Registration Card (주민등록증)',
            description: 'Korean Resident Registration Card',
            requiresBackScan: false,
            hasBarcode: false,
        },
        {
            id: 'drivers_license_kr',
            name: "Driver's License (운전면허증)",
            description: 'Korean Road Traffic Authority driver\'s license',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    TW: [
        passport(),
        {
            id: 'national_id_tw',
            name: 'National ID Card (國民身分證)',
            description: 'Republic of China (Taiwan) National Identity Card',
            requiresBackScan: false,
            hasBarcode: false,
        },
        driversLicenseEU(),
        {
            id: 'arc_tw',
            name: 'Alien Resident Certificate (ARC)',
            description: 'Taiwan Alien Resident Certificate for foreign nationals',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    MN: std(), KP: stdNoDrivers(),

    // ── SOUTHEAST ASIA ────────────────────────────────────────────────────
    SG: [
        passport(),
        {
            id: 'nric_sg',
            name: 'NRIC (National Registration Identity Card)',
            description: 'Singapore National Registration Identity Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
        {
            id: 'employment_pass_sg',
            name: 'Employment Pass / Work Permit',
            description: 'MOM-issued Singapore Employment Pass or Work Permit',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    MY: [
        passport(),
        {
            id: 'mykad',
            name: 'MyKad (National Identity Card)',
            description: 'Malaysian National Registration Department card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'mypolis',
            name: 'MyPolis / Lesen Memandu (Driver\'s License)',
            description: 'Malaysian driver\'s license',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    ID: [
        passport(),
        {
            id: 'ektp',
            name: 'e-KTP (Kartu Tanda Penduduk Elektronik)',
            description: 'Indonesian Electronic National Identity Card',
            requiresBackScan: false,
            hasBarcode: false,
        },
        {
            id: 'sim_id',
            name: 'SIM (Surat Izin Mengemudi)',
            description: 'Indonesian Driver\'s License',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    TH: [
        passport(),
        {
            id: 'thai_national_id',
            name: 'Thai National ID (บัตรประจำตัวประชาชน)',
            description: 'Thai Citizen ID Card',
            requiresBackScan: false,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    VN: [
        passport(),
        {
            id: 'cccd',
            name: 'CCCD (Căn cước công dân)',
            description: 'Vietnamese Citizen Identification Card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    PH: [
        passport(),
        {
            id: 'philsys',
            name: 'Philippine Identification (PhilSys / National ID)',
            description: 'PSA-issued Philippine Identification System card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'drivers_license_ph',
            name: "Driver's License",
            description: 'LTO-issued driver\'s license',
            requiresBackScan: true,
            hasBarcode: false,
        },
    ],

    KH: std(), LA: std(), MM: std(), BN: std(), TL: stdNoDrivers(),

    // ── CENTRAL ASIA ──────────────────────────────────────────────────────
    KZ: std(), UZ: std(), TM: std(), KG: std(), TJ: std(),

    // ── AUSTRALIA & OCEANIA ───────────────────────────────────────────────
    AU: [
        passport(),
        {
            id: 'drivers_licence_au',
            name: "Driver's Licence",
            description: 'Australian state/territory driver\'s licence (barcode varies by state)',
            requiresBackScan: true,
            hasBarcode: true,
        },
        {
            id: 'proof_of_age_au',
            name: 'Proof of Age / KeyPass Card',
            description: 'State-issued non-driver photo identity card',
            requiresBackScan: true,
            hasBarcode: true,
        },
    ],

    NZ: [
        passport(),
        {
            id: 'drivers_licence_nz',
            name: "Driver's Licence",
            description: 'New Zealand NZTA driver\'s licence',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'kiwi_access',
            name: 'Kiwi Access Card',
            description: 'New Zealand 18+ proof of age card',
            requiresBackScan: false,
            hasBarcode: false,
        },
    ],

    FJ: std(), KI: stdNoDrivers(), MH: std(), FM: std(),
    NR: stdNoDrivers(), PW: std(), PG: std(), WS: std(),
    SB: std(), TO: std(), TV: stdNoDrivers(), VU: std(),

    // ── AFRICA ────────────────────────────────────────────────────────────
    ZA: [
        passport(),
        {
            id: 'sa_id',
            name: 'South African ID Book / Smart ID Card',
            description: 'South African Department of Home Affairs ID document',
            requiresBackScan: true,
            hasBarcode: true,
        },
        {
            id: 'drivers_license_za',
            name: "Driver's License Card",
            description: 'South African driver\'s license card',
            requiresBackScan: true,
            hasBarcode: true,
        },
    ],

    NG: [
        passport(),
        {
            id: 'nimc',
            name: 'National ID Card (NIMC)',
            description: 'National Identity Management Commission card',
            requiresBackScan: true,
            hasBarcode: false,
        },
        {
            id: 'voters_card_ng',
            name: "Voter's Card (PVC)",
            description: 'INEC Permanent Voter\'s Card',
            requiresBackScan: false,
            hasBarcode: false,
        },
        driversLicenseEU(),
    ],

    EG: [passport(), nationalId(), voterId(), driversLicenseEU()],
    KE: [passport(), nationalId(), voterId(), driversLicenseEU()],
    GH: [passport(), nationalId(), voterId(), driversLicenseEU()],

    // Remaining African countries
    DZ: std(), AO: std(), BJ: std(), BW: std(),
    BF: std(), BI: stdNoDrivers(), CV: std(), CM: std(),
    CF: stdNoDrivers(), TD: stdNoDrivers(), KM: std(), CD: std(),
    CG: std(), DJ: std(), GQ: std(), ER: stdNoDrivers(),
    SZ: std(), ET: std(), GA: std(), GM: std(),
    GN: std(), GW: stdNoDrivers(), CI: std(),
    LS: std(), LR: std(), LY: std(), MG: std(),
    MW: std(), ML: std(), MR: std(), MU: std(),
    MA: std(), MZ: std(), NA: std(), NE: std(),
    RW: std(), ST: std(), SN: std(), SC: std(),
    SL: std(), SO: stdNoDrivers(), SS: stdNoDrivers(),
    SD: std(), TZ: std(), TG: std(), TN: std(),
    UG: std(), ZM: std(), ZW: std(),
};

// ---------------------------------------------------------------------------
// Returns country-specific ID types, defaulting to standard 3-document set
// ---------------------------------------------------------------------------
export function getCountryIdTypes(countryCode: string): IdType[] {
    return COUNTRY_ID_TYPES[countryCode] ?? std();
}

// ---------------------------------------------------------------------------
// Complete list of sovereign / widely-recognised states sorted A→Z by name
// ---------------------------------------------------------------------------
export const SOVEREIGN_COUNTRIES: Country[] = [
    { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
    { code: 'AL', name: 'Albania', flag: '🇦🇱' },
    { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
    { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'AT', name: 'Austria', flag: '🇦🇹' },
    { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
    { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
    { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
    { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
    { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
    { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
    { code: 'BT', name: 'Bhutan', flag: '🇧🇹' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
    { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
    { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
    { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
    { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
    { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
    { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
    { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
    { code: 'TD', name: 'Chad', flag: '🇹🇩' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
    { code: 'CG', name: 'Congo (Republic of)', flag: '🇨🇬' },
    { code: 'CD', name: 'Congo (DR)', flag: '🇨🇩' },
    { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
    { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
    { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
    { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
    { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
    { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
    { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
    { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
    { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
    { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
    { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
    { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
    { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
    { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
    { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
    { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
    { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'GR', name: 'Greece', flag: '🇬🇷' },
    { code: 'GD', name: 'Grenada', flag: '🇬🇩' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
    { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
    { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
    { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
    { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
    { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
    { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'IR', name: 'Iran', flag: '🇮🇷' },
    { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
    { code: 'IL', name: 'Israel', flag: '🇮🇱' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
    { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
    { code: 'XK', name: 'Kosovo', flag: '🇽🇰' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
    { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' },
    { code: 'LA', name: 'Laos', flag: '🇱🇦' },
    { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
    { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
    { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
    { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
    { code: 'LY', name: 'Libya', flag: '🇱🇾' },
    { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
    { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
    { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱' },
    { code: 'MT', name: 'Malta', flag: '🇲🇹' },
    { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭' },
    { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
    { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'FM', name: 'Micronesia', flag: '🇫🇲' },
    { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
    { code: 'MC', name: 'Monaco', flag: '🇲🇨' },
    { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
    { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
    { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
    { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
    { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
    { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'KP', name: 'North Korea', flag: '🇰🇵' },
    { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: 'PW', name: 'Palau', flag: '🇵🇼' },
    { code: 'PS', name: 'Palestine', flag: '🇵🇸' },
    { code: 'PA', name: 'Panama', flag: '🇵🇦' },
    { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'RO', name: 'Romania', flag: '🇷🇴' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
    { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
    { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
    { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
    { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
    { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
    { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
    { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
    { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
    { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧' },
    { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
    { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
    { code: 'SY', name: 'Syria', flag: '🇸🇾' },
    { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
    { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯' },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
    { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬' },
    { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
    { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
    { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
    { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲' },
    { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
    { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
    { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
    { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
    { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
    { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
    { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
];
