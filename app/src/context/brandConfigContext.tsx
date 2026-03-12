import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BrandingService } from '../redux/api/brandingService';
import { type BrandConfig, type OrganizationResponse, DEFAULT_BRAND_CONFIG } from '../redux/types/brandConfig';

interface BrandConfigContextState {
  brandConfig: BrandConfig;
  organization: OrganizationResponse | null;
  isLoading: boolean;
  error: Error | null;
  refreshConfig: () => Promise<void>;
}

const BrandConfigContext = createContext<BrandConfigContextState | undefined>(undefined);

interface BrandConfigProviderProps {
  children: ReactNode;
}

export function BrandConfigProvider({ children }: BrandConfigProviderProps) {
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG);
  const [organization, setOrganization] = useState<OrganizationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const brandingService = new BrandingService('');
      const response = await brandingService.getOrganizationBranding(window.location.hostname);
      
      setOrganization(response.organization);

      if (response.branding) {
        // Merge with default config to ensure all fields are present
        const mergedConfig: BrandConfig = {
          domain: response.organization.domain,
          logo: { ...DEFAULT_BRAND_CONFIG.logo, ...response.branding.logo },
          colors: { ...DEFAULT_BRAND_CONFIG.colors, ...response.branding.colors },
          typography: { ...DEFAULT_BRAND_CONFIG.typography, ...response.branding.typography },
          layout: { ...DEFAULT_BRAND_CONFIG.layout, ...response.branding.layout },
          text: { ...DEFAULT_BRAND_CONFIG.text, ...response.branding.text },
          brandName: response.branding.brandName || DEFAULT_BRAND_CONFIG.brandName,
          supportEmail: response.branding.supportEmail || DEFAULT_BRAND_CONFIG.supportEmail,
          privacyPolicyUrl: response.branding.privacyPolicyUrl || DEFAULT_BRAND_CONFIG.privacyPolicyUrl,
          termsOfServiceUrl: response.branding.termsOfServiceUrl || DEFAULT_BRAND_CONFIG.termsOfServiceUrl,
          urlRedirectOnComplete: response.branding.urlRedirectOnComplete || DEFAULT_BRAND_CONFIG.urlRedirectOnComplete,
          urlRedirectOnError: response.branding.urlRedirectOnError || DEFAULT_BRAND_CONFIG.urlRedirectOnError,
          urlRedirectOnMobileContinue: response.branding.urlRedirectOnMobileContinue || DEFAULT_BRAND_CONFIG.urlRedirectOnMobileContinue,
        };
        
        setBrandConfig(mergedConfig);
        
        // Apply CSS custom properties for dynamic theming
        applyThemeVariables(mergedConfig);
      }
    } catch (err) {
      console.error('Error fetching brand configuration:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch brand configuration'));
      // Keep default config on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const value: BrandConfigContextState = {
    brandConfig,
    organization,
    isLoading,
    error,
    refreshConfig: fetchConfig,
  };

  return (
    <BrandConfigContext.Provider value={value}>
      {children}
    </BrandConfigContext.Provider>
  );
}

/**
 * Hook to access brand configuration
 */
export function useBrandConfig() {
  const context = useContext(BrandConfigContext);
  
  if (context === undefined) {
    throw new Error('useBrandConfig must be used within a BrandConfigProvider');
  }
  
  return context;
}

/**
 * Apply theme variables to CSS custom properties
 * This allows components to use CSS variables for dynamic theming
 */
function applyThemeVariables(config: BrandConfig) {
  const root = document.documentElement;
  
  // Colors
  if (config.colors.primaryColor) {
    root.style.setProperty('--color-primary', config.colors.primaryColor);
  }
  if (config.colors.secondaryColor) {
    root.style.setProperty('--color-secondary', config.colors.secondaryColor);
  }
  if (config.colors.accentColor) {
    root.style.setProperty('--color-accent', config.colors.accentColor);
  }
  if (config.colors.backgroundColor) {
    root.style.setProperty('--color-background', config.colors.backgroundColor);
  }
  if (config.colors.textColor) {
    root.style.setProperty('--color-text', config.colors.textColor);
  }
  if (config.colors.borderColor) {
    root.style.setProperty('--color-border', config.colors.borderColor);
  }
  if (config.colors.hoverColor) {
    root.style.setProperty('--color-hover', config.colors.hoverColor);
  }
  if (config.colors.buttonTextColor) {
    root.style.setProperty('--color-button-text', config.colors.buttonTextColor);
  }
  if (config.colors.buttonBackgroundColor) {
    root.style.setProperty('--color-button-bg', config.colors.buttonBackgroundColor);
  }
  if (config.colors.buttonBorderColor) {
    root.style.setProperty('--color-button-border', config.colors.buttonBorderColor);
  }
  if (config.colors.outlineButtonTextColor) {
    root.style.setProperty('--color-outline-button-text', config.colors.outlineButtonTextColor);
  }
  if (config.colors.outlineButtonBorderColor) {
    root.style.setProperty('--color-outline-button-border', config.colors.outlineButtonBorderColor);
  }
  if (config.colors.outlineButtonHoverBgColor) {
    root.style.setProperty('--color-outline-button-hover-bg', config.colors.outlineButtonHoverBgColor);
  }
  
  // Typography
  if (config.typography.fontFamily) {
    root.style.setProperty('--font-family', config.typography.fontFamily);
  }
  if (config.typography.headingFontFamily) {
    root.style.setProperty('--font-family-heading', config.typography.headingFontFamily);
  }
  if (config.typography.baseFontSize) {
    root.style.setProperty('--font-size-base', config.typography.baseFontSize);
  }
  if (config.typography.headingFontWeight) {
    root.style.setProperty('--font-weight-heading', config.typography.headingFontWeight.toString());
  }
  
  // Layout
  if (config.layout.borderRadius) {
    root.style.setProperty('--border-radius', config.layout.borderRadius);
  }
  if (config.layout.contentMaxWidth) {
    root.style.setProperty('--content-max-width', config.layout.contentMaxWidth);
  }
  
  // Box shadow
  if (config.layout.boxShadow) {
    const shadowMap = {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    };
    root.style.setProperty('--box-shadow', shadowMap[config.layout.boxShadow]);
  }
}

/**
 * Helper hook to get specific config sections
 */
export function useLogoConfig() {
  const { brandConfig } = useBrandConfig();
  return brandConfig.logo;
}

export function useColorConfig() {
  const { brandConfig } = useBrandConfig();
  return brandConfig.colors;
}

export function useTypographyConfig() {
  const { brandConfig } = useBrandConfig();
  return brandConfig.typography;
}

export function useLayoutConfig() {
  const { brandConfig } = useBrandConfig();
  return brandConfig.layout;
}

export function useTextConfig() {
  const { brandConfig } = useBrandConfig();
  return brandConfig.text;
}
