type LoadingProps = {
    message?: string;
};

export const Loading = ({ message }: LoadingProps) => {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-background, #F6F9FC)' }}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Spinning ring */}
          <div className="relative size-16">
            <svg className="size-16 -rotate-90" viewBox="0 0 64 64" fill="none">
              <circle
                cx="32" cy="32" r="26"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-10"
                style={{ color: 'var(--color-primary, #635BFF)' }}
              />
              <circle
                cx="32" cy="32" r="26"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="163.4"
                strokeDashoffset="122.5"
                strokeLinecap="round"
                style={{ color: 'var(--color-primary, #635BFF)' }}
                className="animate-spin origin-center"
              />
            </svg>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: 'var(--color-text, #1A1A2E)' }}
            >
              {message || 'Loading'}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text, #1A1A2E)', opacity: 0.45 }}
            >
              Please wait...
            </p>
          </div>
        </div>
      </div>
    );
}