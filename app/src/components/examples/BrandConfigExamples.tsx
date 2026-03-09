/**
 * Example component demonstrating how to use the brand configuration system
 * This file shows various approaches to implementing custom branding
 */

import { useBrandConfig, useColorConfig, useTextConfig } from '@/context/brandConfigContext';
import { Button } from '@/components/ui/button';
import { getCardStyles, getGradientBackground, colorWithOpacity } from '@/lib/brandUtils';

/**
 * Example 1: Using the main useBrandConfig hook
 */
export function ExampleCard() {
  const { brandConfig, isLoading } = useBrandConfig();

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-zinc-800 rounded"></div>;
  }

  const cardStyles = getCardStyles(brandConfig);

  return (
    <div style={cardStyles} className="p-6">
      <h2
        style={{
          fontFamily: brandConfig.typography.headingFontFamily,
          fontWeight: brandConfig.typography.headingFontWeight,
          color: brandConfig.colors.primaryColor,
        }}
      >
        {brandConfig.text.appTitle}
      </h2>
      <p style={{ color: brandConfig.colors.textColor }}>
        {brandConfig.text.welcomeMessage}
      </p>
    </div>
  );
}

/**
 * Example 2: Using specific section hooks
 */
export function ExampleHeader() {
  const colors = useColorConfig();
  const text = useTextConfig();

  return (
    <header
      style={{
        backgroundColor: colors.backgroundColor,
        borderBottomColor: colors.borderColor,
      }}
      className="border-b p-4"
    >
      <h1 style={{ color: colors.primaryColor }}>{text.appTitle}</h1>
      {text.tagline && (
        <p style={{ color: colorWithOpacity(colors.textColor || '#fff', 0.8) }}>
          {text.tagline}
        </p>
      )}
    </header>
  );
}

/**
 * Example 3: Using CSS variables (recommended for most cases)
 */
export function ExampleWithCSSVariables() {
  const { brandConfig } = useBrandConfig();

  return (
    <div className="p-6">
      {/* Using CSS variables set by the provider */}
      <h2
        style={{
          color: 'var(--color-primary)',
          fontFamily: 'var(--font-family-heading)',
          fontWeight: 'var(--font-weight-heading)',
        }}
      >
        Using CSS Variables
      </h2>

      {/* Buttons automatically use CSS variables */}
      <div className="flex gap-2 mt-4">
        <Button>Default Button</Button>
        <Button variant="outline">Outline Button</Button>
        <Button variant="ghost">Ghost Button</Button>
      </div>

      {/* Custom styled elements using variables */}
      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--color-background)',
          borderColor: 'var(--color-border)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: 'var(--border-radius)',
        }}
      >
        <p style={{ color: 'var(--color-text)' }}>
          This content uses CSS variables for theming
        </p>
      </div>
    </div>
  );
}

/**
 * Example 4: Gradient backgrounds
 */
export function ExampleGradientCard() {
  const { brandConfig } = useBrandConfig();

  return (
    <div
      style={{
        background: getGradientBackground(brandConfig),
        borderRadius: brandConfig.layout.borderRadius,
      }}
      className="p-8 text-white"
    >
      <h2 className="text-2xl font-bold mb-2">Featured Content</h2>
      <p>This card uses a gradient generated from your brand colors</p>
    </div>
  );
}

/**
 * Example 5: Conditional logo rendering
 */
export function ExampleLogoDisplay() {
  const { brandConfig } = useBrandConfig();
  const { logo, text } = brandConfig;

  return (
    <div className="flex items-center gap-4 p-4">
      {logo.primaryLogoUrl ? (
        <img
          src={logo.primaryLogoUrl}
          alt={text.appTitle || 'Logo'}
          style={{
            width: logo.logoWidth || 'auto',
            height: logo.logoHeight || '40px',
          }}
          onError={(e) => {
            // Fallback if logo fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span
          style={{
            color: brandConfig.colors.primaryColor,
            fontFamily: brandConfig.typography.headingFontFamily,
            fontWeight: brandConfig.typography.headingFontWeight,
          }}
          className="text-2xl"
        >
          {text.appTitle}
        </span>
      )}
    </div>
  );
}

/**
 * Example 6: Interactive elements with dynamic colors
 */
export function ExampleInteractiveCard() {
  const colors = useColorConfig();

  return (
    <div
      className="p-6 cursor-pointer transition-all duration-200"
      style={{
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: 'var(--border-radius)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.outlineButtonHoverBgColor || '#27272a';
        e.currentTarget.style.borderColor = colors.primaryColor || '#f59e0b';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.backgroundColor || '#18181b';
        e.currentTarget.style.borderColor = colors.borderColor || '#3f3f46';
      }}
    >
      <h3 style={{ color: colors.primaryColor }}>Interactive Card</h3>
      <p style={{ color: colors.textColor }}>
        Hover over this card to see dynamic color changes
      </p>
    </div>
  );
}

/**
 * Example 7: Full page example integrating multiple elements
 */
export function ExampleFullPage() {
  const { brandConfig, isLoading, error } = useBrandConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load brand configuration</p>
          <p className="text-gray-400">Using default styling</p>
        </div>
      </div>
    );
  }

  const cardStyles = getCardStyles(brandConfig);

  return (
    <div
      style={{
        backgroundColor: brandConfig.colors.backgroundColor,
        minHeight: '100vh',
        fontFamily: brandConfig.typography.fontFamily,
      }}
    >
      {/* Header */}
      <header
        style={{
          background: getGradientBackground(brandConfig),
          borderBottomColor: brandConfig.colors.borderColor,
        }}
        className="border-b p-6"
      >
        {brandConfig.logo.primaryLogoUrl ? (
          <img
            src={brandConfig.logo.primaryLogoUrl}
            alt={brandConfig.text.appTitle}
            style={{
              width: brandConfig.logo.logoWidth,
              height: brandConfig.logo.logoHeight,
            }}
          />
        ) : (
          <h1
            style={{
              color: '#ffffff',
              fontFamily: brandConfig.typography.headingFontFamily,
              fontWeight: brandConfig.typography.headingFontWeight,
            }}
            className="text-3xl"
          >
            {brandConfig.text.appTitle}
          </h1>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 max-w-4xl">
        <div style={cardStyles} className="p-8 mb-6">
          <h2
            style={{
              color: brandConfig.colors.primaryColor,
              fontFamily: brandConfig.typography.headingFontFamily,
              fontWeight: brandConfig.typography.headingFontWeight,
            }}
            className="text-2xl mb-4"
          >
            {brandConfig.text.welcomeMessage}
          </h2>
          <p style={{ color: brandConfig.colors.textColor }} className="mb-6">
            {brandConfig.text.instructionText}
          </p>

          <div className="flex gap-4">
            <Button>Get Started</Button>
            <Button variant="outline">Learn More</Button>
          </div>
        </div>

        {/* Additional Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div style={cardStyles} className="p-6">
            <h3
              style={{
                color: brandConfig.colors.primaryColor,
                fontWeight: brandConfig.typography.headingFontWeight,
              }}
              className="text-xl mb-2"
            >
              Feature One
            </h3>
            <p style={{ color: brandConfig.colors.textColor }}>
              Description of your first feature
            </p>
          </div>

          <div style={cardStyles} className="p-6">
            <h3
              style={{
                color: brandConfig.colors.primaryColor,
                fontWeight: brandConfig.typography.headingFontWeight,
              }}
              className="text-xl mb-2"
            >
              Feature Two
            </h3>
            <p style={{ color: brandConfig.colors.textColor }}>
              Description of your second feature
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: brandConfig.colors.backgroundColor,
          borderTopColor: brandConfig.colors.borderColor,
        }}
        className="border-t mt-12 p-6 text-center"
      >
        <p style={{ color: brandConfig.colors.textColor, opacity: 0.8 }}>
          {brandConfig.brandName && `© ${new Date().getFullYear()} ${brandConfig.brandName}`}
        </p>
        {brandConfig.supportEmail && (
          <a
            href={`mailto:${brandConfig.supportEmail}`}
            style={{ color: brandConfig.colors.primaryColor }}
            className="hover:underline"
          >
            {brandConfig.supportEmail}
          </a>
        )}
      </footer>
    </div>
  );
}

/**
 * Example 8: Component with refresh capability
 */
export function ExampleWithRefresh() {
  const { brandConfig, refreshConfig, isLoading } = useBrandConfig();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ color: brandConfig.colors.primaryColor }}>
          Current Configuration
        </h2>
        <Button onClick={refreshConfig} disabled={isLoading} variant="outline">
          {isLoading ? 'Refreshing...' : 'Refresh Config'}
        </Button>
      </div>

      <div
        style={{
          backgroundColor: brandConfig.colors.backgroundColor,
          borderColor: brandConfig.colors.borderColor,
        }}
        className="p-4 border rounded"
      >
        <pre style={{ color: brandConfig.colors.textColor }}>
          {JSON.stringify(brandConfig, null, 2)}
        </pre>
      </div>
    </div>
  );
}
