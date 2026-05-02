import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../ui/button";
import { useColorConfig, useBrandConfig } from "@/context/brandConfigContext";
import { useSession, writeSessionStorage } from "@/context/sessionContext";
import { Loading } from "@/theme/loading";

export const Verify = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get brand configuration from context
  const colorConfig = useColorConfig();
  const { brandConfig } = useBrandConfig();

  // Get session state from context
  const {
    sessionStatus,
    isLoading,
    isMobileAccess,
    lastEvent,
  } = useSession();

  const urlRedirectOnComplete = brandConfig.urlRedirectOnComplete || '/dashboard';
  const urlRedirectOnMobileContinue = brandConfig.urlRedirectOnMobileContinue || '/mobile-verify';

  useEffect(() => {
    const sessionIdFromUrl = searchParams.get('session');
    const tokenFromUrl = searchParams.get('token');
    if (sessionIdFromUrl && tokenFromUrl) {
      writeSessionStorage(sessionIdFromUrl, tokenFromUrl);
    }
  }, [searchParams]);

  // React to session completed event — redirect
  useEffect(() => {
    const isComplete =
      sessionStatus === 'completed' ||
      lastEvent?.type === 'completed' ||
      lastEvent?.type === 'completedSession' ||
      lastEvent?.type === 'sessionCompleted' ||
      lastEvent?.status === 'completed';

    if (isComplete && !isMobileAccess) {
      const target = urlRedirectOnComplete;
      if (target.startsWith('http://') || target.startsWith('https://')) {
        window.location.href = target;
      } else {
        navigate(target);
      }
    }
  }, [lastEvent, sessionStatus, isMobileAccess, urlRedirectOnComplete, navigate]);

  const handleContinueOnMobile = () => {
    if (urlRedirectOnMobileContinue.startsWith('http://') || urlRedirectOnMobileContinue.startsWith('https://')) {
      window.location.href = urlRedirectOnMobileContinue;
    } else {
      navigate(urlRedirectOnMobileContinue);
    }
  };

  const handleComplete = () => {
    if (urlRedirectOnComplete.startsWith('http://') || urlRedirectOnComplete.startsWith('https://')) {
      window.location.href = urlRedirectOnComplete;
    } else {
      navigate(urlRedirectOnComplete);
    }
  };

  void handleComplete; // reserved for future use

  // Mobile view — user arrived via link, prompt them to start
  if (isMobileAccess) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col items-center justify-center flex-1 p-4">
          <h1 className="text-2xl font-bold mb-2" style={{ color: colorConfig.primaryColor }}>
            Let's Begin!
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Continue to verify your identity.
          </p>
          <Button onClick={handleContinueOnMobile} variant={"default"}>
            Verify My Identity
          </Button>
        </div>
      </div>
    );
  }

  // Web view - session transferred to mobile device / in progress — waiting screen
  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col items-center justify-center flex-1 p-4">
        <div className="bg-amber-500/10 border border-amber-500 rounded-full p-6 mb-6 animate-pulse">
          <svg className="w-16 h-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: colorConfig.primaryColor }}>
          Waiting for Verification
        </h1>
        <p className="text-gray-500 text-center max-w-md mb-4">
          Please continue the verification process on your mobile device.
        </p>
      </div>
    </div>
  );
};
