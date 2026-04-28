import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SessionService } from '@/redux/api/sessionService';
import { useBrandConfig } from './brandConfigContext';
import type {
  SessionStatus,
  StepData,
  WebSocketEvent,
} from '@/redux/types/brandConfig';

interface SessionContextState {
  sessionId: string | null;
  sessionToken: string | null;
  submissionId: string | null;
  sessionStatus: SessionStatus;
  activeDevice: string | null;
  currentStep: string | null;
  steps: StepData[];
  isLoading: boolean;
  isMobileAccess: boolean;
  brandName: string;
  /** Error message if session initialization failed */
  error: string | null;
  /** Transfer session to mobile device */
  transferToMobile: () => Promise<void>;
  /** Transfer session to web (desktop) device */
  transferToWeb: () => Promise<void>;
  /** Update the current step */
  updateStep: (currentStep: string) => Promise<void>;
  /** Complete the session */
  completeSession: () => Promise<void>;
  /** Last WebSocket event received */
  lastEvent: WebSocketEvent | null;
  /** Whether the WebSocket is currently connected */
  wsConnected: boolean;
}

const SessionContext = createContext<SessionContextState | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [searchParams] = useSearchParams();
  const { brandConfig } = useBrandConfig();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('initialized');
  const [activeDevice, setActiveDevice] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [steps] = useState<StepData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const sessionServiceRef = useRef(new SessionService());

  const sessionIdFromUrl = searchParams.get('session');
  const tokenFromUrl = searchParams.get('token');
  const isMobileAccess = !!(sessionIdFromUrl && tokenFromUrl);

  // Handle incoming WebSocket events
  const handleWsMessage = useCallback((event: WebSocketEvent) => {
    console.log('[SessionContext] Received WebSocket event:', event);
    setLastEvent(event);

    // updateSession broadcasts nest fields inside sessionData; flatten for uniform handling
    const sd = event.sessionData;
    const eventType = event.type || event.action;
    const status = event.status ?? sd?.status as string | undefined;
    const activeDevice = event.activeDevice ?? sd?.activeDevice as string | undefined;
    const isMobile = event.isMobile ?? sd?.isMobile as boolean | undefined;
    const currentStep = event.currentStep ?? sd?.currentStep as string | undefined;
    const submissionId = event.submissionId ?? sd?.submissionId as string | undefined;

    // Handle session updates
    if (eventType === 'updatedSession' || eventType === 'sessionUpdated') {
      console.log('[SessionContext] Session updated:', { isMobile, activeDevice, status, currentStep });
    }

    // Capture submissionId whenever the backend includes it in an event
    if (submissionId && typeof submissionId === 'string') {
      setSubmissionId(submissionId);
    }

    // Handle completion broadcast from completeSession action
    if (eventType === 'completedSession' || eventType === 'sessionCompleted') {
      console.log('[SessionContext] Session completed broadcast received');
      setSessionStatus('completed');
      return;
    }

    if (status) {
      setSessionStatus(status as SessionStatus);
    }
    if (activeDevice) {
      setActiveDevice(activeDevice);
    }
    // If isMobile flag is set to true, update device to mobile
    if (isMobile === true) {
      console.log('[SessionContext] Session transferred to mobile device');
      setActiveDevice('mobile');
      setSessionStatus('active');
    }
    if (currentStep) {
      setCurrentStep(currentStep);
    }
  }, []);

  // Initialize: connect WebSocket, create or resume session
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const service = sessionServiceRef.current;

        // Connect WebSocket with event handlers
        await service.connect({
          onConnected: () => {
            if (!cancelled) setWsConnected(true);
          },
          onMessage: (event) => {
            if (!cancelled) handleWsMessage(event);
          },
          onError: (err) => console.error('WS error:', err),
          onClose: () => {
            if (!cancelled) setWsConnected(false);
          },
        });

        if (isMobileAccess && sessionIdFromUrl && tokenFromUrl) {
          // Mobile device — update existing session to transfer to mobile
          const response = await service.updateSession(sessionIdFromUrl, tokenFromUrl, {
            status: 'active',
            isMobile: true,
          });
          if (!cancelled) {
            setSessionId(response.sessionId);
            setSessionToken(response.token || response.sessionId);
            if (response.submissionId) setSubmissionId(response.submissionId);
            setActiveDevice('mobile');
            setSessionStatus('active');
          }
        } else {
          // Desktop — create new session
          const domain = brandConfig.domain || window.location.hostname;
          const response = await service.createSession(domain);
          console.log('Session created:', response);
          if (!cancelled) {
            setSessionId(response.sessionId);
            setSessionToken(response.token || response.sessionId);
            if (response.submissionId) setSubmissionId(response.submissionId);
            setActiveDevice('desktop');
            setSessionStatus('initialized');
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        if (!cancelled) {
          setError(error instanceof Error ? error.message : 'Failed to connect to session service');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      sessionServiceRef.current.disconnect();
    };
  }, [isMobileAccess, sessionIdFromUrl, brandConfig.domain, handleWsMessage]);

  const transferToMobile = useCallback(async () => {
    if (!sessionId || !sessionToken) return;
    const response = await sessionServiceRef.current.updateSession(sessionId, sessionToken, { isMobile: true });
    setSessionToken(response.token || response.sessionId);
    setActiveDevice('mobile');
    setSessionStatus('active');
  }, [sessionId, sessionToken]);

  const transferToWeb = useCallback(async () => {
    if (!sessionId || !sessionToken) return;
    const response = await sessionServiceRef.current.updateSession(sessionId, sessionToken, { isMobile: false });
    setSessionToken(response.token || response.sessionId);
    setActiveDevice('desktop');
    setSessionStatus('active');
  }, [sessionId, sessionToken]);

  const updateStep = useCallback(async (step: string) => {
    if (!sessionId || !sessionToken) return;
    await sessionServiceRef.current.updateSession(sessionId, sessionToken, { currentStep: step });
    setCurrentStep(step);
    setSessionStatus('in_progress');
  }, [sessionId, sessionToken]);

  const completeSession = useCallback(async () => {
    const id = sessionId ?? sessionIdFromUrl;
    if (!id) return;
    await sessionServiceRef.current.completeSession(id);
    setSessionStatus('completed');
  }, [sessionId, sessionIdFromUrl]);

  const value: SessionContextState = {
    sessionId,
    sessionToken,
    submissionId,
    sessionStatus,
    activeDevice,
    currentStep,
    steps,
    isLoading,
    isMobileAccess,
    brandName: brandConfig.brandName || '',
    error,
    transferToMobile,
    transferToWeb,
    updateStep,
    completeSession,
    lastEvent,
    wsConnected,
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
