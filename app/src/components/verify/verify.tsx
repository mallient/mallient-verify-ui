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
    session,
    verificationStatus,
    isLoading,
    isMobileAccess,
    urlRedirectOnComplete,
    urlRedirectOnMobileContinue,
    updateStatus,
  } = useSession();

  // Generate QR URL after session is available
  useEffect(() => {
    if (session && !isMobileAccess && !qrUrl) {
      const baseUrl = urlRedirectOnMobileContinue.startsWith('http')
        ? urlRedirectOnMobileContinue.split('?')[0]
        : window.location.origin + '/verify';
      
      const url = `${baseUrl}?session=${encodeURIComponent(session.sessionId)}&token=${encodeURIComponent(session.sessionToken)}`;
      setQrUrl(url);
    }
  }, [session, isMobileAccess, qrUrl, urlRedirectOnMobileContinue]);

  const handleContinueOnWeb = async () => {
    await updateStatus("web");
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

  // Web view - verified on mobile device
  if (verificationStatus === "mobile") {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-col items-center justify-center flex-1 p-4">
          <div className="bg-green-500/10 border border-green-500 rounded-full p-6 mb-6">
            <svg
              className="w-16 h-16 text-green-500"
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
          <h1 className="text-2xl font-bold mb-2">Verified on Mobile</h1>
          <p className="text-gray-500 text-center max-w-md">
            The session has been verified on your mobile device. You can
            continue there or close this window.
          </p>
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
