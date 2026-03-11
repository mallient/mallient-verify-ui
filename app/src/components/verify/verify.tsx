import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { MobileVerify } from "./mobile-verify";
import { useTextConfig, useColorConfig } from "@/context/brandConfigContext";
import { useSession } from "@/context/sessionContext";

type VerifyMode = "choose" | "web-verify";

export const Verify = () => {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [mode, setMode] = useState<VerifyMode>("choose");
  const navigate = useNavigate();
  
  // Get brand configuration from context
  const textConfig = useTextConfig();
  const colorConfig = useColorConfig();

  // Get session state from context
  const {
    sessionId,
    sessionToken,
    sessionStatus,
    currentStep,
    isLoading,
    isMobileAccess,
    urlRedirectOnComplete,
    urlRedirectOnMobileContinue,
    transferToWeb,
    lastEvent,
  } = useSession();

  // Generate QR URL after session is available
  useEffect(() => {
    if (sessionId && sessionToken && !isMobileAccess && !qrUrl) {
      const baseUrl = urlRedirectOnMobileContinue.startsWith('http')
        ? urlRedirectOnMobileContinue.split('?')[0]
        : window.location.origin + '/verify';
      
      const url = `${baseUrl}?session=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(sessionToken)}`;
      setQrUrl(url);
    }
  }, [sessionId, sessionToken, isMobileAccess, qrUrl, urlRedirectOnMobileContinue]);

  // React to SESSION_COMPLETED event — redirect desktop to the complete URL
  useEffect(() => {
    if (lastEvent?.type === 'SESSION_COMPLETED') {
      const redirectUrl = lastEvent.type === 'SESSION_COMPLETED' ? lastEvent.redirectUrl : undefined;
      const target = redirectUrl || urlRedirectOnComplete;
      if (target.startsWith('http://') || target.startsWith('https://')) {
        window.location.href = target;
      } else {
        navigate(target);
      }
    }
  }, [lastEvent, urlRedirectOnComplete, navigate]);

  const handleContinueOnWeb = async () => {
    await transferToWeb();
    setMode("web-verify");
  };

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

  // Web inline verification flow (no redirect)
  if (mode === "web-verify") {
    return (
      <MobileVerify
        onComplete={handleComplete}
        onCancel={() => setMode("choose")}
      />
    );
  }

  // Mobile view - user just scanned QR code
  if (isMobileAccess) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col items-center justify-center flex-1 p-4">
          <h1 className="text-2xl font-bold mb-2" style={{ color: colorConfig.primaryColor }}>
            {textConfig.welcomeMessage || "Let's Begin!"}
          </h1>
          <p className="text-gray-500 text-center mb-8">
            {textConfig.instructionText || "Continue to verify your identity."}
          </p>
          <Button onClick={handleContinueOnMobile} variant={"default"}>
            Verify My Identity
          </Button>
        </div>
      </div>
    );
  }

  // Web view - session transferred to mobile device
  if ((sessionStatus === 'active' || sessionStatus === 'in_progress') && !isMobileAccess) {
    const stepLabel = currentStep
      ? currentStep.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : null;

    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col items-center justify-center flex-1 p-4">
          <div className="bg-amber-500/10 border border-amber-500 rounded-full p-6 mb-6 animate-pulse">
            <svg
              className="w-16 h-16 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: colorConfig.primaryColor }}>
            {sessionStatus === 'in_progress' ? 'Verification In Progress' : 'Transferred to Mobile'}
          </h1>
          <p className="text-gray-500 text-center max-w-md mb-4">
            {sessionStatus === 'in_progress'
              ? 'Your identity is being verified on your mobile device. Please complete the steps there.'
              : 'The session has been transferred to your mobile device. Please continue verification on your phone.'}
          </p>
          {stepLabel && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Current step: {stepLabel}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Web view - pending verification (showing QR code + continue on web option)
  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col items-center justify-center flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4" style={{ color: colorConfig.primaryColor }}>
          {textConfig.appTitle || "Identity Verification"}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          {textConfig.instructionText || "Scan the QR code on your phone, or continue on this device."}
        </p>
        {isLoading ? (
          <div className="text-gray-500">Setting up your session...</div>
        ) : qrUrl ? (
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <QRCodeSVG
              value={qrUrl}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
        ) : (
          <div className="text-red-500">Failed to generate QR code</div>
        )}
        <p className="mt-4 text-sm text-gray-500 text-center max-w-md">
          Scan this QR code with your phone to continue on mobile
        </p>

        <div className="mt-8 flex flex-col items-center">
          <p className="text-sm text-gray-400 mb-2">Or</p>
          <Button onClick={handleContinueOnWeb} variant={"default"}>
            Continue on this device
          </Button>
        </div>
      </div>
    </div>
  );
};
