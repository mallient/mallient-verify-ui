# Brand Configuration System

This document explains how to use the brand configuration system to customize the UI and styling of the Mallient Verify application.

## Overview

The brand configuration system allows you to customize:
- **Logos**: Primary and secondary logos with custom placement and sizing
- **Colors**: Complete color scheme including buttons, text, borders, and backgrounds
- **Typography**: Font families, sizes, and weights
- **Layout**: Banner styles, spacing, border radius, and shadows
- **Text Content**: Custom titles, taglines, and messaging
- **Navigation URLs**: Custom redirect URLs for completion, errors, and mobile flow

## Architecture

### Configuration Flow

1. **Backend Service** → Returns `SessionResponse` with `BrandConfig`
2. **SessionService** → Fetches configuration (currently mocked)
3. **BrandConfigProvider** → Makes configuration available via React Context globally
4. **Verify Component** → Calls GenerateSession on mount and uses URLs for navigation
5. **Components** → Access configuration via hooks

### Key Files

- `src/types/brandConfig.ts` - Type definitions and default configuration
- `src/redux/api/sessionService.ts` - Service to fetch configuration from backend
- `src/context/brandConfigContext.tsx` - React Context Provider and hooks
- `src/components/ui/button.tsx` - Dynamic button styling
- `src/components/layout/Banner.tsx` - Dynamic banner component

## Usage

### Accessing Configuration in Components

#### Using the Main Hook

```typescript
import { useBrandConfig } from '@/context/brandConfigContext';

function MyComponent() {
  const { brandConfig, isLoading, error } = useBrandConfig();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading configuration</div>;
  
  return (
    <div style={{ color: brandConfig.colors.primaryColor }}>
      {brandConfig.text.appTitle}
    </div>
  );
}
```

#### Using Specific Section Hooks

```typescript
import { useColorConfig, useTextConfig, useLogoConfig } from '@/context/brandConfigContext';

function MyComponent() {
  const colors = useColorConfig();
  const text = useTextConfig();
  const logo = useLogoConfig();
  
  return (
    <div>
      <img src={logo.primaryLogoUrl} alt={text.appTitle} />
      <h1 style={{ color: colors.primaryColor }}>{text.appTitle}</h1>
    </div>
  );
}
```

### Using CSS Variables

The configuration automatically sets CSS custom properties that can be used in your styles:

```css
.my-button {
  background-color: var(--color-button-bg);
  color: var(--color-button-text);
  border-color: var(--color-button-border);
  border-radius: var(--border-radius);
}

.my-button:hover {
  background-color: var(--color-hover);
}
```

## Configuration Schema

### Logo Configuration

```typescript
interface LogoConfig {
  primaryLogoUrl?: string;        // URL to primary logo
  secondaryLogoUrl?: string;      // URL to secondary logo
  logoWidth?: string;             // CSS width (e.g., "150px", "auto")
  logoHeight?: string;            // CSS height (e.g., "50px")
  logoPlacement?: 'header' | 'center' | 'left' | 'right';
}
```

### Color Configuration

```typescript
interface ColorConfig {
  primaryColor?: string;              // Main brand color
  secondaryColor?: string;            // Secondary brand color
  accentColor?: string;               // Accent/highlight color
  backgroundColor?: string;           // Page background
  textColor?: string;                 // Default text color
  borderColor?: string;               // Border color
  hoverColor?: string;                // Hover state color
  buttonTextColor?: string;           // Button text color
  buttonBackgroundColor?: string;     // Button background
  buttonBorderColor?: string;         // Button border
  outlineButtonTextColor?: string;    // Outline button text
  outlineButtonBorderColor?: string;  // Outline button border
  outlineButtonHoverBgColor?: string; // Outline button hover background
}
```

### Typography Configuration

```typescript
interface TypographyConfig {
  fontFamily?: string;           // Body font family
  headingFontFamily?: string;    // Heading font family
  baseFontSize?: string;         // Base font size (e.g., "16px")
  headingFontWeight?: string | number; // Heading font weight
}
```

### Layout Configuration

```typescript
interface LayoutConfig {
  bannerStyle?: 'gradient' | 'solid' | 'image';
  bannerBackgroundImageUrl?: string;
  bannerHeight?: string;         // CSS height (e.g., "80px")
  bannerTextAlignment?: 'left' | 'center' | 'right';
  contentMaxWidth?: string;      // Max content width (e.g., "1200px")
  borderRadius?: string;         // Border radius (e.g., "0.5rem")
  boxShadow?: 'none' | 'sm' | 'md' | 'lg';
}
```

### Text Configuration

```typescript
interface TextConfig {
  appTitle?: string;          // Application title
  tagline?: string;           // Subtitle/tagline
  welcomeMessage?: string;    // Welcome message
  instructionText?: string;   // Custom instructions
}
```

### URL Configuration

The BrandConfig also includes navigation URLs that control where users are redirected:

```typescript
interface BrandConfig {
  // ... other properties
  urlRedirectOnComplete?: string;        // Where to redirect after successful verification
  urlRedirectOnError?: string;           // Where to redirect on verification error
  urlRedirectOnMobileContinue?: string;  // Where to redirect when user continues on mobile
}
```

**Navigation Behavior:**
- URLs starting with `http://` or `https://` will use `window.location.href` (full page navigation)
- Relative URLs (e.g., `/dashboard`, `/error`) will use React Router's `navigate()` function
- If not provided, defaults to:
  - `urlRedirectOnComplete`: `/dashboard`
  - `urlRedirectOnError`: `/error`
  - `urlRedirectOnMobileContinue`: `/mobile-verify`

**Usage in Verify Component:**
The Verify component automatically calls `SessionService.GenerateSession()` on mount and uses these URLs for navigation throughout the verification flow.

## Mocked Response Examples

### Example 1: Corporate Blue Theme

```typescript
{
  sessionId: "session_12345",
  sessionToken: "token_abc123",
  brandConfig: {
    logo: {
      primaryLogoUrl: "https://example.com/logo.png",
      logoPlacement: "header",
      logoWidth: "180px",
      logoHeight: "60px"
    },
    colors: {
      primaryColor: "#2563eb",        // Blue-600
      secondaryColor: "#1e40af",      // Blue-700
      accentColor: "#3b82f6",         // Blue-500
      backgroundColor: "#1e293b",     // Slate-800
      textColor: "#f1f5f9",           // Slate-100
      borderColor: "#334155",         // Slate-700
      hoverColor: "#1d4ed8",          // Blue-700
      buttonTextColor: "#ffffff",
      buttonBackgroundColor: "#2563eb",
      buttonBorderColor: "#2563eb"
    },
    typography: {
      fontFamily: "Roboto, sans-serif",
      headingFontFamily: "Roboto, sans-serif",
      baseFontSize: "16px",
      headingFontWeight: "700"
    },
    layout: {
      bannerStyle: "solid",
      bannerHeight: "72px",
      bannerTextAlignment: "left",
      borderRadius: "0.5rem",
      boxShadow: "md"
    },
    text: {
      appTitle: "Corporate Verify",
      tagline: "Secure Identity Services",
      welcomeMessage: "Welcome to our verification system"
    },
    brandName: "Corporate Inc.",
    supportEmail: "support@corporate.com",
    urlRedirectOnComplete: "https://corporate.com/dashboard",
    urlRedirectOnError: "https://corporate.com/error",
    urlRedirectOnMobileContinue: "https://corporate.com/mobile-verify"
  }
}
```

### Example 2: Minimalist Green Theme

```typescript
{
  sessionId: "session_67890",
  sessionToken: "token_def456",
  brandConfig: {
    logo: {
      primaryLogoUrl: "https://example.com/green-logo.svg",
      logoPlacement: "center",
      logoWidth: "120px",
      logoHeight: "40px"
    },
    colors: {
      primaryColor: "#10b981",        // Green-500
      secondaryColor: "#059669",      // Green-600
      accentColor: "#34d399",         // Green-400
      backgroundColor: "#111827",     // Gray-900
      textColor: "#f9fafb",           // Gray-50
      borderColor: "#374151",         // Gray-700
      hoverColor: "#059669",          // Green-600
      buttonTextColor: "#ffffff",
      buttonBackgroundColor: "#10b981",
      buttonBorderColor: "#10b981",
      outlineButtonTextColor: "#f9fafb",
      outlineButtonBorderColor: "#374151",
      outlineButtonHoverBgColor: "#1f2937"
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      headingFontFamily: "Inter, sans-serif",
      baseFontSize: "15px",
      headingFontWeight: "500"
    },
    layout: {
      bannerStyle: "gradient",
      bannerHeight: "64px",
      bannerTextAlignment: "center",
      borderRadius: "0.25rem",
      boxShadow: "sm"
    },
    text: {
      appTitle: "Verify",
      welcomeMessage: "Identity verification made simple"
    }
  }
}
```

### Example 3: Purple/Pink Theme with Custom Banner

```typescript
{
  sessionId: "session_99999",
  sessionToken: "token_ghi789",
  brandConfig: {
    logo: {
      primaryLogoUrl: "https://example.com/purple-logo.png",
      logoPlacement: "left",
      logoWidth: "160px",
      logoHeight: "55px"
    },
    colors: {
      primaryColor: "#a855f7",        // Purple-500
      secondaryColor: "#9333ea",      // Purple-600
      accentColor: "#ec4899",         // Pink-500
      backgroundColor: "#18181b",     // Zinc-900
      textColor: "#fafaf9",           // Stone-50
      borderColor: "#3f3f46",         // Zinc-700
      hoverColor: "#9333ea",          // Purple-600
      buttonTextColor: "#ffffff",
      buttonBackgroundColor: "#a855f7",
      buttonBorderColor: "#a855f7",
      outlineButtonTextColor: "#fafaf9",
      outlineButtonBorderColor: "#3f3f46",
      outlineButtonHoverBgColor: "#27272a"
    },
    typography: {
      fontFamily: "Poppins, sans-serif",
      headingFontFamily: "Poppins, sans-serif",
      baseFontSize: "16px",
      headingFontWeight: "600"
    },
    layout: {
      bannerStyle: "image",
      bannerBackgroundImageUrl: "https://example.com/banner-bg.jpg",
      bannerHeight: "100px",
      bannerTextAlignment: "left",
      borderRadius: "0.75rem",
      boxShadow: "lg"
    },
    text: {
      appTitle: "SecureID",
      tagline: "Your trusted verification partner",
      welcomeMessage: "Let's get you verified!",
      instructionText: "Follow these simple steps"
    },
    brandName: "SecureID",
    supportEmail: "help@secureid.com",
    privacyPolicyUrl: "https://secureid.com/privacy",
    termsOfServiceUrl: "https://secureid.com/terms"
  }
}
```

## Backend Integration

When your backend is ready, update the `GenerateSession` method in `sessionService.ts`:

```typescript
public async GenerateSession(): Promise<SessionResponse> {
  // Replace the mock with actual API call
  return await BaseService.PostData(
    `${import.meta.env.VITE_API_BASE_URL}/verification/session`,
    {}
  );
}
```

### Backend Response Format

Your backend should return a response matching this structure:

```typescript
{
  "sessionId": "string",
  "sessionToken": "string",
  "expiresAt": "ISO8601 datetime string",
  "brandConfig": {
    // BrandConfig object as defined above
  }
}
```

## CSS Variables Reference

The following CSS variables are automatically set based on the configuration:

| Variable | Description |
|----------|-------------|
| `--color-primary` | Primary brand color |
| `--color-secondary` | Secondary brand color |
| `--color-accent` | Accent color |
| `--color-background` | Page background |
| `--color-text` | Default text color |
| `--color-border` | Border color |
| `--color-hover` | Hover state color |
| `--color-button-bg` | Button background |
| `--color-button-text` | Button text color |
| `--color-button-border` | Button border |
| `--color-outline-button-text` | Outline button text |
| `--color-outline-button-border` | Outline button border |
| `--color-outline-button-hover-bg` | Outline button hover bg |
| `--font-family` | Body font family |
| `--font-family-heading` | Heading font family |
| `--font-size-base` | Base font size |
| `--font-weight-heading` | Heading font weight |
| `--border-radius` | Border radius |
| `--content-max-width` | Content max width |
| `--box-shadow` | Box shadow value |

## Testing Different Configurations

To test different configurations during development, modify the mock response in `sessionService.ts`:

1. Open `src/redux/api/sessionService.ts`
2. Find the `mockGenerateSession()` method
3. Update the `brandConfig` object with your test values
4. The changes will be reflected on the next page reload

## Refreshing Configuration

If you need to refresh the configuration at runtime:

```typescript
import { useBrandConfig } from '@/context/brandConfigContext';

function MyComponent() {
  const { refreshConfig } = useBrandConfig();
  
  const handleRefresh = async () => {
    await refreshConfig();
  };
  
  return <button onClick={handleRefresh}>Refresh Configuration</button>;
}
```

## Error Handling

The provider includes error handling. If configuration fetch fails, it falls back to the default configuration:

```typescript
const { error, isLoading, brandConfig } = useBrandConfig();

if (error) {
  console.error('Failed to load brand config:', error);
  // brandConfig will still be available (default values)
}
```

## Best Practices

1. **Always provide fallback values** when using configuration properties
2. **Use CSS variables** for dynamic styling when possible (better performance)
3. **Test with different configurations** to ensure your components adapt properly
4. **Keep colors accessible** - ensure sufficient contrast ratios
5. **Validate logo URLs** on the backend before sending to prevent broken images
6. **Cache configuration** to avoid excessive API calls

## Future Enhancements

Potential future improvements:
- Configuration versioning
- A/B testing different themes
- User preference overrides
- Dark/light mode variants per configuration
- Animation and transition customization
- Advanced layout options (grid, spacing scales)
- Custom CSS injection support
