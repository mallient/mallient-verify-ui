import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";
import { useBrandConfig } from "@/context/brandConfigContext";

type LoadingProps = {
    message?: string;
};

export const Loading = ({ message }: LoadingProps) => {
    const { resolvedTheme } = useTheme();
    const { brandConfig } = useBrandConfig();
    const primaryColor = brandConfig?.colors?.primaryColor || '#635BFF';
    const logoUrl = brandConfig?.logo?.primaryLogoUrl;
    const logoWidth = brandConfig?.logo?.logoWidth || '120px';
    const logoHeight = brandConfig?.logo?.logoHeight || '40px';

    return (
      <div className={cn(
        "fixed inset-0 flex items-center justify-center",
        resolvedTheme === "dark" ? "bg-zinc-950" : "bg-white"
      )}>
        <div className="flex flex-col items-center gap-8">
          {/* Logo or brand placeholder */}
          <div
            className="flex items-center justify-center rounded-xl px-6 py-4"
            style={{ backgroundColor: primaryColor }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ width: logoWidth, height: logoHeight, objectFit: 'contain' }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-white/30" />
                <span className="text-white font-semibold text-lg tracking-wide">
                  {brandConfig?.brandName || 'Verify'}
                </span>
              </div>
            )}
          </div>

          {/* Animated dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: primaryColor,
                  animationDelay: `${i * 0.15}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>

          {/* Message */}
          <p className={cn(
            "text-sm font-light uppercase tracking-[0.2em]",
            resolvedTheme === "dark" ? "text-white/50" : "text-black/40"
          )}>
            {message || "Setting up your session"}
          </p>
        </div>
      </div>
    );
}