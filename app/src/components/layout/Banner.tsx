import { useBrandConfig } from '@/context/brandConfigContext';

export const Banner = () => {
    const { brandConfig, isLoading } = useBrandConfig();
    const { logo, colors } = brandConfig;

    const primaryColor = colors.primaryColor || '#635BFF';

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 px-5 py-3" style={{ backgroundColor: primaryColor }}>
                <div className="animate-pulse size-6 rounded-full bg-white/30" />
                <div className="animate-pulse h-4 w-32 rounded bg-white/20" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 px-5 py-3" style={{ backgroundColor: primaryColor }}>
            {logo.primaryLogoUrl ? (
                <img
                    src={logo.primaryLogoUrl}
                    alt="Logo"
                    style={{
                        width: logo.logoWidth || '100px',
                        height: logo.logoHeight || '32px',
                        objectFit: 'contain',
                    }}
                />
            ) : (
                <>
                    <div className="size-6 rounded-full bg-white/30" />
                    <span className="text-sm font-semibold text-white/90">Your Logo</span>
                </>
            )}
        </div>
    );
};
