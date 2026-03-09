import { useBrandConfig } from '@/context/brandConfigContext';

export const Banner = () => {
    const { brandConfig, isLoading } = useBrandConfig();
    const { logo, layout, text, colors } = brandConfig;

    if (isLoading) {
        return (
            <div className="w-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 py-4 px-6 border-b border-zinc-700/50 shadow-lg">
                <div className="flex items-center justify-center">
                    <div className="animate-pulse h-8 w-48 bg-zinc-700 rounded"></div>
                </div>
            </div>
        );
    }

    const bannerStyle = layout.bannerStyle === 'gradient'
        ? `bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900`
        : layout.bannerStyle === 'image' && layout.bannerBackgroundImageUrl
        ? `bg-cover bg-center`
        : `bg-[var(--color-background)]`;

    const alignmentClass: Record<string, string> = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
    };
    const alignment = alignmentClass[layout.bannerTextAlignment || 'center'];

    const logoPlacementClass: Record<string, string> = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
        header: 'justify-center',
    };
    const logoPlacement = logoPlacementClass[logo.logoPlacement || 'header'];

    return (
        <div 
            className={`w-full py-4 px-6 border-b shadow-lg ${bannerStyle}`}
            style={{
                height: layout.bannerHeight || '64px',
                borderBottomColor: colors.borderColor || '#3f3f46',
                backgroundImage: layout.bannerStyle === 'image' && layout.bannerBackgroundImageUrl 
                    ? `url(${layout.bannerBackgroundImageUrl})` 
                    : undefined,
            }}
        >
            <div className={`flex items-center ${logoPlacement}`}>
                {logo.primaryLogoUrl ? (
                    <img
                        src={logo.primaryLogoUrl}
                        alt={text.appTitle || 'Logo'}
                        style={{
                            width: logo.logoWidth || 'auto',
                            height: logo.logoHeight || '40px',
                        }}
                        className="object-contain"
                    />
                ) : (
                    <h2 
                        className={`text-xl font-semibold tracking-widest uppercase ${layout.bannerTextAlignment === 'center' ? 'text-center' : ''}`}
                        style={{
                            color: colors.textColor || '#fafafa',
                            fontFamily: brandConfig.typography.headingFontFamily,
                            fontWeight: brandConfig.typography.headingFontWeight,
                        }}
                    >
                        <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent">
                            {text.appTitle || 'Mallient Verify'}
                        </span>
                    </h2>
                )}
            </div>
            {text.tagline && (
                <div className={`flex ${alignment} mt-1`}>
                    <p 
                        className="text-sm"
                        style={{
                            color: colors.textColor || '#fafafa',
                            opacity: 0.8,
                        }}
                    >
                        {text.tagline}
                    </p>
                </div>
            )}
        </div>
    );
};
