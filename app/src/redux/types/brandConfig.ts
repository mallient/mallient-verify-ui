/**
 * Brand Configuration Interface
 * Defines customizable UI elements that can be configured from external dashboard
 */

export interface LogoConfig {
  /** URL to the primary logo image */
  primaryLogoUrl?: string;
  /** URL to the secondary/alternate logo image */
  secondaryLogoUrl?: string;
  /** Logo width in pixels or CSS units */
  logoWidth?: string;
  /** Logo height in pixels or CSS units */
  logoHeight?: string;
  /** Logo placement: header, center, left, right */
  logoPlacement?: "header" | "center" | "left" | "right";
}

export interface ColorConfig {
  /** Primary brand color (for buttons, links, etc.) */
  primaryColor?: string;
  /** Secondary brand color */
  secondaryColor?: string;
  /** Accent color for highlights */
  accentColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Border color */
  borderColor?: string;
  /** Hover state color for interactive elements */
  hoverColor?: string;
  /** Button text color */
  buttonTextColor?: string;
  /** Button background color */
  buttonBackgroundColor?: string;
  /** Button border color */
  buttonBorderColor?: string;
  /** Outline button text color */
  outlineButtonTextColor?: string;
  /** Outline button border color */
  outlineButtonBorderColor?: string;
  /** Outline button hover background color */
  outlineButtonHoverBgColor?: string;
}

export interface TypographyConfig {
  /** Primary font family */
  fontFamily?: string;
  /** Heading font family */
  headingFontFamily?: string;
  /** Base font size */
  baseFontSize?: string;
  /** Heading font weight */
  headingFontWeight?: string | number;
}

export interface LayoutConfig {
  /** Banner style: gradient, solid, image */
  bannerStyle?: "gradient" | "solid" | "image";
  /** Banner background image URL */
  bannerBackgroundImageUrl?: string;
  /** Banner height */
  bannerHeight?: string;
  /** Banner text alignment */
  bannerTextAlignment?: "left" | "center" | "right";
  /** Content max width */
  contentMaxWidth?: string;
  /** Border radius for buttons and cards */
  borderRadius?: string;
  /** Box shadow intensity: none, sm, md, lg */
  boxShadow?: "none" | "sm" | "md" | "lg";
}

export interface TextConfig {
  /** Application title displayed in banner */
  appTitle?: string;
  /** Tagline or subtitle */
  tagline?: string;
  /** Welcome message on verification page */
  welcomeMessage?: string;
  /** Custom instruction text */
  instructionText?: string;
}

export interface BrandConfig {
  /** Logo configuration */
  logo: LogoConfig;
  /** Color scheme configuration */
  colors: ColorConfig;
  /** Typography configuration */
  typography: TypographyConfig;
  /** Layout and spacing configuration */
  layout: LayoutConfig;
  /** Text and copy configuration */
  text: TextConfig;
  /** Company/brand name */
  brandName?: string;
  /** Support/contact email */
  supportEmail?: string;
  /** Privacy policy URL */
  privacyPolicyUrl?: string;
  /** Terms of service URL */
  termsOfServiceUrl?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  logo: {
    logoPlacement: "header",
    logoWidth: "auto",
    logoHeight: "40px",
  },
  colors: {
    primaryColor: "#f59e0b", // amber-500
    secondaryColor: "#3f3f46", // zinc-700
    accentColor: "#fbbf24", // amber-400
    backgroundColor: "#18181b", // zinc-900
    textColor: "#fafafa", // zinc-50
    borderColor: "#3f3f46", // zinc-700
    hoverColor: "#f59e0b",
    buttonTextColor: "#ffffff",
    buttonBackgroundColor: "#f59e0b",
    buttonBorderColor: "#f59e0b",
    outlineButtonTextColor: "#fafafa",
    outlineButtonBorderColor: "#3f3f46",
    outlineButtonHoverBgColor: "#27272a",
  },
  typography: {
    fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    headingFontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    baseFontSize: "16px",
    headingFontWeight: "600",
  },
  layout: {
    bannerStyle: "gradient",
    bannerHeight: "64px",
    bannerTextAlignment: "center",
    contentMaxWidth: "1200px",
    borderRadius: "0.375rem",
    boxShadow: "md",
  },
  text: {
    appTitle: "Mallient Verify",
    welcomeMessage: "Welcome to Identity Verification",
    instructionText: "Please follow the steps to verify your identity",
  },
};

/**
 * Session response with brand configuration
 */
export interface SessionResponse {
  sessionId: string;
  sessionToken: string;
  brandConfig: BrandConfig;
  expiresAt?: string;
  urlRedirectOnComplete: string;
  urlRedirectOnError: string;
  urlRedirectOnMobileContinue: string;
}
