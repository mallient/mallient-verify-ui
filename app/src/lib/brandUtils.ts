/**
 * Utility functions for working with brand configuration
 */

import type { BrandConfig } from '@/types/brandConfig';

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Apply opacity to a color
 */
export function colorWithOpacity(color: string, opacity: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Generate inline styles from brand configuration
 */
export function getBrandStyles(config: BrandConfig) {
  return {
    root: {
      fontFamily: config.typography.fontFamily,
      fontSize: config.typography.baseFontSize,
      color: config.colors.textColor,
      backgroundColor: config.colors.backgroundColor,
    },
    heading: {
      fontFamily: config.typography.headingFontFamily,
      fontWeight: config.typography.headingFontWeight,
      color: config.colors.textColor,
    },
    button: {
      backgroundColor: config.colors.buttonBackgroundColor,
      color: config.colors.buttonTextColor,
      borderColor: config.colors.buttonBorderColor,
      borderRadius: config.layout.borderRadius,
    },
    buttonOutline: {
      backgroundColor: 'transparent',
      color: config.colors.outlineButtonTextColor,
      borderColor: config.colors.outlineButtonBorderColor,
      borderRadius: config.layout.borderRadius,
    },
    link: {
      color: config.colors.primaryColor,
    },
    border: {
      borderColor: config.colors.borderColor,
    },
  };
}

/**
 * Get button style based on variant
 */
export function getButtonStyle(
  config: BrandConfig,
  variant: 'default' | 'outline' | 'ghost' | 'link' = 'default'
): React.CSSProperties {
  const styles = getBrandStyles(config);
  
  switch (variant) {
    case 'outline':
      return styles.buttonOutline;
    case 'link':
      return {
        ...styles.link,
        backgroundColor: 'transparent',
        border: 'none',
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: config.colors.textColor,
        border: 'none',
      };
    default:
      return styles.button;
  }
}

/**
 * Generate gradient background from configuration
 */
export function getGradientBackground(config: BrandConfig): string {
  const { primaryColor, secondaryColor, accentColor } = config.colors;
  
  if (!primaryColor) return 'transparent';
  
  if (secondaryColor && accentColor) {
    return `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${accentColor} 100%)`;
  } else if (secondaryColor) {
    return `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
  }
  
  return primaryColor;
}

/**
 * Get box shadow value based on configuration
 */
export function getBoxShadow(config: BrandConfig): string {
  const shadowMap: Record<string, string> = {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  };
  
  return shadowMap[config.layout.boxShadow || 'md'];
}

/**
 * Get card styles from configuration
 */
export function getCardStyles(config: BrandConfig): React.CSSProperties {
  return {
    backgroundColor: config.colors.backgroundColor,
    borderColor: config.colors.borderColor,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: config.layout.borderRadius,
    boxShadow: getBoxShadow(config),
    color: config.colors.textColor,
  };
}

/**
 * Check if a color is light or dark (for contrast calculation)
 */
export function isLightColor(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * Get contrasting text color (black or white) for a background color
 */
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

/**
 * Validate URL format
 */
export function isValidUrl(url?: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely get logo URL with validation
 */
export function getSafeLogoUrl(url?: string, fallback?: string): string | undefined {
  if (isValidUrl(url)) return url;
  if (isValidUrl(fallback)) return fallback;
  return undefined;
}

/**
 * Apply brand configuration to a specific element
 */
export function applyBrandToElement(
  element: HTMLElement,
  config: BrandConfig
): void {
  const styles = getBrandStyles(config);
  
  Object.entries(styles.root).forEach(([key, value]) => {
    if (value) {
      element.style[key as any] = value;
    }
  });
}

/**
 * Generate CSS string from brand configuration
 */
export function generateBrandCSS(config: BrandConfig): string {
  return `
    :root {
      --color-primary: ${config.colors.primaryColor};
      --color-secondary: ${config.colors.secondaryColor};
      --color-accent: ${config.colors.accentColor};
      --color-background: ${config.colors.backgroundColor};
      --color-text: ${config.colors.textColor};
      --color-border: ${config.colors.borderColor};
      --color-hover: ${config.colors.hoverColor};
      --color-button-bg: ${config.colors.buttonBackgroundColor};
      --color-button-text: ${config.colors.buttonTextColor};
      --color-button-border: ${config.colors.buttonBorderColor};
      --color-outline-button-text: ${config.colors.outlineButtonTextColor};
      --color-outline-button-border: ${config.colors.outlineButtonBorderColor};
      --color-outline-button-hover-bg: ${config.colors.outlineButtonHoverBgColor};
      --font-family: ${config.typography.fontFamily};
      --font-family-heading: ${config.typography.headingFontFamily};
      --font-size-base: ${config.typography.baseFontSize};
      --font-weight-heading: ${config.typography.headingFontWeight};
      --border-radius: ${config.layout.borderRadius};
      --box-shadow: ${getBoxShadow(config)};
    }
  `.trim();
}
