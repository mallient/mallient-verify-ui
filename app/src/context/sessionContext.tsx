import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SessionService } from '@/redux/api/sessionService';
import { useBrandConfig } from './brandConfigContext';
import type {
  SessionStatus,
  SessionEvent,
  StepData,
  SessionRequest,
  UpdateSessionStepRequest,
  CompleteSessionRequest,
} from '@/redux/types/brandConfig';

interface SessionContextState {
  sessionId: string | null;
  sessionToken: string | null;
  sessionStatus: SessionStatus;
  activeDevice: string | null;
  currentStep: string | null;
  steps: StepData[];
  isLoading: boolean;
  isMobileAccess: boolean;
  brandName: string;
  urlRedirectOnComplete: string;
  urlRedirectOnError: string;
  urlRedirectOnMobileContinue: string;
  /** Transfer session to mobile device */
  transferToMobile: () => Promise<void>;
  /** Transfer session to web (desktop) device */
  transferToWeb: () => Promise<void>;
  /** Update the session */
  updateSession: (request: SessionRequest) => Promise<void>;
  /** Update a step's progress — called from mobile verification flow */
  updateStep: (request: UpdateSessionStepRequest) => Promise<void>;
  /** Complete the session — publishes SESSION_COMPLETED with redirect URL */
  completeSession: (request?: CompleteSessionRequest) => Promise<void>;
  /** Last SSE event received — components can react to real-time updates */
  lastEvent: SessionEvent | null;
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
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('initialized');
  const [activeDevice, setActiveDevice] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastEvent, setLastEvent] = useState<SessionEvent | null>(null);

  const sessionServiceRef = useRef(new SessionService(''));

  const sessionIdFromUrl = searchParams.get('session');
  const tokenFromUrl = searchParams.get('token');
  const isMobileAccess = !!(sessionIdFromUrl && tokenFromUrl);

  // Sync state from a session response
  const applySessionResponse = useCallback((response: { sessionId: string; sessionToken: string; status: SessionStatus; activeDevice?: string; currentStep?: string; steps?: StepData[] }) => {
    setSessionId(response.sessionId);
    setSessionToken(response.sessionToken);
    setSessionStatus(response.status);
    setActiveDevice(response.activeDevice ?? null);
    setCurrentStep(response.currentStep ?? null);
    setSteps(response.steps ?? []);
  }, []);

  // Handle incoming SSE events
  const handleSessionEvent = useCallback((event: SessionEvent) => {
    setLastEvent(event);

    switch (event.type) {
      case 'SESSION_TRANSFERRED':
        setSessionStatus('active');
        setActiveDevice(event.data?.deviceType ?? null);
        break;
      case 'SESSION_STEP_CHANGED':
        setSessionStatus('in_progress');
        if (event.data?.currentStep) {
          setCurrentStep(event.data.currentStep);
        }
        break;
      case 'SESSION_COMPLETED':
        setSessionStatus('completed');
        break;
      case 'SESSION_ENDED':
        setSessionStatus('completed');
        break;
    }
  }, []);

  // Initialize: create or fetch session, then open SSE
  useEffect(() => {
    let unsubscribeSSE: (() => void) | undefined;
    let cancelled = false;

    const init = async () => {
      try {
        const service = sessionServiceRef.current;

        if (isMobileAccess && sessionIdFromUrl) {
          // Mobile device — fetch existing session and transfer
          const existing = await service.getSession(sessionIdFromUrl);
          if (!cancelled) {
            applySessionResponse(existing);
            // Transfer to mobile
            const updated = await service.transferSession(sessionIdFromUrl, { deviceType: 'mobile' });
            if (!cancelled) applySessionResponse(updated);
          }
        } else {
          // Desktop — create new session
          const domain = brandConfig.domain || window.location.hostname;
          const created = await service.createSession(domain);
          if (!cancelled) {
            applySessionResponse(created);
            // Subscribe to SSE for real-time updates from mobile
            unsubscribeSSE = service.subscribeToEvents(
              created.sessionId,
              handleSessionEvent,
            );
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      unsubscribeSSE?.();
    };
  }, [isMobileAccess, sessionIdFromUrl, brandConfig.domain, applySessionResponse, handleSessionEvent]);

  const transferToMobile = useCallback(async () => {
    if (!sessionId) return;
    const response = await sessionServiceRef.current.transferSession(sessionId, { deviceType: 'mobile' });
    applySessionResponse(response);
  }, [sessionId, applySessionResponse]);

  const transferToWeb = useCallback(async () => {
    if (!sessionId) return;
    const response = await sessionServiceRef.current.transferSession(sessionId, { deviceType: 'desktop' });
    applySessionResponse(response);
  }, [sessionId, applySessionResponse]);

  const updateSessionFn = useCallback(async (request: SessionRequest) => {
    if (!sessionId) return;
    const response = await sessionServiceRef.current.updateSession(sessionId, request);
    applySessionResponse(response);
  }, [sessionId, applySessionResponse]);

  const updateStep = useCallback(async (request: UpdateSessionStepRequest) => {
    if (!sessionId) return;
    await sessionServiceRef.current.updateStep(sessionId, request);
    setCurrentStep(request.currentStep);
    setSessionStatus('in_progress');
  }, [sessionId]);

  const completeSessionFn = useCallback(async (request?: CompleteSessionRequest) => {
    if (!sessionId) return;
    await sessionServiceRef.current.completeSession(sessionId, request);
    setSessionStatus('completed');
  }, [sessionId]);

  const value: SessionContextState = {
    sessionId,
    sessionToken,
    sessionStatus,
    activeDevice,
    currentStep,
    steps,
    isLoading,
    isMobileAccess,
    brandName: brandConfig.brandName || '',
    urlRedirectOnComplete: brandConfig.urlRedirectOnComplete || '/dashboard',
    urlRedirectOnError: brandConfig.urlRedirectOnError || '/error',
    urlRedirectOnMobileContinue: brandConfig.urlRedirectOnMobileContinue || '/mobile-verify',
    transferToMobile,
    transferToWeb,
    updateSession: updateSessionFn,
    updateStep,
    completeSession: completeSessionFn,
    lastEvent,
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
