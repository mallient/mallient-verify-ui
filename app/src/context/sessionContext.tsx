import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type VerificationStatus,
  type VerificationSession,
  createVerificationSession,
  updateVerificationStatus,
  subscribeToVerificationStatus,
  getVerificationSession,
} from '@/lib/verificationService';
import { useBrandConfig } from './brandConfigContext';

interface SessionContextState {
  session: VerificationSession | null;
  verificationStatus: VerificationStatus;
  isLoading: boolean;
  isMobileAccess: boolean;
  brandName: string;
  urlRedirectOnComplete: string;
  urlRedirectOnError: string;
  urlRedirectOnMobileContinue: string;
  updateStatus: (status: VerificationStatus) => Promise<void>;
}

const SessionContext = createContext<SessionContextState | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [searchParams] = useSearchParams();
  const { brandConfig } = useBrandConfig();

  const [session, setSession] = useState<VerificationSession | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
  const [isLoading, setIsLoading] = useState(true);

  const sessionIdFromUrl = searchParams.get('session');
  const tokenFromUrl = searchParams.get('token');
  const isMobileAccess = !!(sessionIdFromUrl && tokenFromUrl);

  const initializeSession = useCallback(async () => {
    try {
      if (isMobileAccess && sessionIdFromUrl && tokenFromUrl) {
        // Mobile device accessing via QR code
        const existingSession = await getVerificationSession(sessionIdFromUrl, tokenFromUrl);
        if (existingSession) {
          await updateVerificationStatus(sessionIdFromUrl, 'mobile', tokenFromUrl);
          setVerificationStatus('mobile');
          setSession(existingSession);
        }
      } else {
        // New visitor: create session and subscribe to status updates
        const newSession = await createVerificationSession();
        setSession(newSession);

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
      console.error('Error initializing session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isMobileAccess, sessionIdFromUrl, tokenFromUrl]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    initializeSession().then((unsubscribe) => {
      cleanup = unsubscribe;
    });

    return () => {
      cleanup?.();
    };
  }, [initializeSession]);

  const updateSessionStatus = useCallback(async (status: VerificationStatus) => {
    if (session) {
      await updateVerificationStatus(session.sessionId, status, session.sessionToken);
      setVerificationStatus(status);
    }
  }, [session]);

  const value: SessionContextState = {
    session,
    verificationStatus,
    isLoading,
    isMobileAccess,
    brandName: brandConfig.brandName || '',
    urlRedirectOnComplete: brandConfig.urlRedirectOnComplete || '/dashboard',
    urlRedirectOnError: brandConfig.urlRedirectOnError || '/error',
    urlRedirectOnMobileContinue: brandConfig.urlRedirectOnMobileContinue || '/mobile-verify',
    updateStatus: updateSessionStatus,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
}
