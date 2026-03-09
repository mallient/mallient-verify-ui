import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../ui/button";
import {
  type VerificationStatus,
  type VerificationSession,
  createVerificationSession,
  updateVerificationStatus,
  subscribeToVerificationStatus,
  getVerificationSession,
} from "@/lib/verificationService";
import { MobileVerify } from "./mobile-verify";
import { useTextConfig, useColorConfig } from "@/context/brandConfigContext";
import { SessionService } from "@/redux/api/sessionService";
import type { BrandConfig } from "@/types/brandConfig";

type VerifyMode = "choose" | "web-verify";

export const Verify = () => {
  const [searchParams] = useSearchParams();
  const [qrUrl, setQrUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("pending");
  const [mode, setMode] = useState<VerifyMode>("choose");
  const [sessionBrandConfig, setSessionBrandConfig] = useState<BrandConfig | null>(null);
  const navigate = useNavigate();
  
  // Get brand configuration from context (fallback)
  const textConfig = useTextConfig();
  const colorConfig = useColorConfig();

  // Check if this is a mobile device accessing via QR code
  const sessionIdFromUrl = searchParams.get("session");
  const tokenFromUrl = searchParams.get("token");
  const isMobileAccess = !!(sessionIdFromUrl && tokenFromUrl);

  // Generate session and get brand configuration
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Only generate new session if not accessing via mobile QR code
        if (!isMobileAccess) {
          const sessionService = new SessionService('');
          const sessionResponse = await sessionService.GenerateSession();
          if (sessionResponse.brandConfig) {
            setSessionBrandConfig(sessionResponse.brandConfig);
          }
        }
      } catch (error) {
        console.error("Error generating session:", error);
      }
    };
    
    fetchSession();
  }, [isMobileAccess]);

  // Initialize verification session
  const initializeSession = useCallback(async () => {
    try {
      if (isMobileAccess && sessionIdFromUrl && tokenFromUrl) {
        // Mobile device: mark session as mobile verified
        const existingSession = await getVerificationSession(
          sessionIdFromUrl,
          tokenFromUrl,
        );
        if (existingSession) {
          await updateVerificationStatus(
            sessionIdFromUrl,
            "mobile",
            tokenFromUrl,
          );
          setVerificationStatus("mobile");
          setSession(existingSession);
          
          // Fetch brand configuration for this existing session using its sessionId
          try {
            const sessionService = new SessionService('');
            const sessionResponse = await sessionService.GenerateSession(sessionIdFromUrl);
            if (sessionResponse.brandConfig) {
              setSessionBrandConfig(sessionResponse.brandConfig);
            }
          } catch (error) {
            console.error("Error fetching brand config for existing session:", error);
          }
        }
      } else {
        // New visitor: create session and generate QR code
        const newSession = await createVerificationSession();
        setSession(newSession);

        // Subscribe to status changes
        const unsubscribe = subscribeToVerificationStatus(
          newSession.sessionId,
          newSession.sessionToken,
          (status: VerificationStatus) => {
            setVerificationStatus(status);
          },
        );

        return unsubscribe;
      }
    } catch (error) {
      console.error("Error initializing verification session:", error);
    } finally {
      setLoading(false);
    }
  }, [isMobileAccess, sessionIdFromUrl, tokenFromUrl]);

  // Generate QR URL after session and brand config are available
  useEffect(() => {
    if (session && sessionBrandConfig && !isMobileAccess && !qrUrl) {
      // Build URL with session ID and session token
      // Use the mobile redirect URL from brand config as the base
      const baseUrl = sessionBrandConfig.urlRedirectOnMobileContinue 
        ? sessionBrandConfig.urlRedirectOnMobileContinue.split('?')[0] // Remove any existing query params
        : window.location.origin + '/verify';
      
      const url = `${baseUrl}?session=${encodeURIComponent(session.sessionId)}&token=${encodeURIComponent(session.sessionToken)}`;
      setQrUrl(url);
    }
  }, [session, sessionBrandConfig, isMobileAccess, qrUrl]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    initializeSession().then((unsubscribe) => {
      cleanup = unsubscribe;
    });

    return () => {
      cleanup?.();
    };
  }, [initializeSession]);

  const handleContinueOnWeb = async () => {
    if (session) {
      try {
        await updateVerificationStatus(
          session.sessionId,
          "web",
          session.sessionToken,
        );
        setVerificationStatus("web");
      } catch (error) {
        console.error("Error updating verification status:", error);
      }
    }
    setMode("web-verify");
  };

  const handleContinueOnMobile = () => {
    // Use URL from session config, fallback to default
    const mobileUrl = sessionBrandConfig?.urlRedirectOnMobileContinue || '/mobile-verify';
    
    // Check if it's an external URL
    if (mobileUrl.startsWith('http://') || mobileUrl.startsWith('https://')) {
      window.location.href = mobileUrl;
    } else {
      navigate(mobileUrl);
    }
  };

  const handleComplete = () => {
    // Use URL from session config, fallback to default
    const completeUrl = sessionBrandConfig?.urlRedirectOnComplete || '/dashboard';
    
    // Check if it's an external URL
    if (completeUrl.startsWith('http://') || completeUrl.startsWith('https://')) {
      window.location.href = completeUrl;
    } else {
      navigate(completeUrl);
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
        {loading ? (
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
