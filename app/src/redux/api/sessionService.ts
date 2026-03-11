import BaseService from "./baseService";
import type { IBaseResult } from "../types/baseResults";
import type {
    SessionResponse,
    SessionRequest,
    SessionEvent,
    TransferSessionRequest,
    UpdateSessionStepRequest,
    CompleteSessionRequest,
} from "../types/brandConfig";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export class SessionService extends BaseService {

    public async createSession(domain: string): Promise<SessionResponse> {
        const body: SessionRequest = { domain };
        const response: IBaseResult<SessionResponse> = await BaseService.PostData(
            `${API_BASE}/accounts/v1/sessions`,
            body,
        );
        return response.result;
    }

    public async getSession(sessionId: string): Promise<SessionResponse> {
        const response: IBaseResult<SessionResponse> = await BaseService.GetData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}`,
        );
        return response.result;
    }

    public async updateSession(sessionId: string, request: SessionRequest): Promise<SessionResponse> {
        const response: IBaseResult<SessionResponse> = await BaseService.PatchData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}`,
            request,
        );
        return response.result;
    }

    public async endSession(sessionId: string): Promise<void> {
        await BaseService.DeleteData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}`
        );
    }

    public async transferSession(
        sessionId: string,
        request: TransferSessionRequest,
    ): Promise<SessionResponse> {
        const response: IBaseResult<SessionResponse> = await BaseService.PostData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/transfer`,
            request,
        );
        return response.result;
    }

    public async updateStep(
        sessionId: string,
        request: UpdateSessionStepRequest,
    ): Promise<void> {
        await BaseService.PatchData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/step`,
            request,
        );
    }

    public async completeSession(
        sessionId: string,
        request?: CompleteSessionRequest,
    ): Promise<void> {
        await BaseService.PostData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/complete`,
            request ?? {},
        );
    }

    /**
     * Subscribe to SSE stream for a session.
     * 
     * Passes the sessionToken as a query param because the native
     * EventSource API cannot set Authorization headers.
     * 
     * Your C# Startup.cs OnMessageReceived picks this up and validates it.
     * 
     * Returns an unsubscribe function to close the connection.
     */
    public subscribeToEvents(
        sessionId: string,
        sessionToken: string,                           // ← JWT from createSession response
        handlers: SessionEventHandlers,
    ): () => void {
        const url = new URL(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/events`
        );

        // C# OnMessageReceived reads this query param
        url.searchParams.set("access_token", sessionToken);

        const eventSource = new EventSource(url.toString());
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        eventSource.onopen = () => {
            console.log("[SSE] Connected to session:", sessionId);
            handlers.onConnected?.();
        };

        eventSource.onmessage = (msg) => {
            // Ignore heartbeat comments (": heartbeat")
            if (!msg.data || msg.data.trim() === "") return;

            try {
                const event: SessionEvent = JSON.parse(msg.data);
                console.log("[SSE] Event received:", event.type, event);
                this.routeEvent(event, handlers);
            } catch {
                console.error("[SSE] Failed to parse event:", msg.data);
            }
        };

        eventSource.onerror = (err) => {
            console.error("[SSE] Connection error:", err);
            handlers.onError?.(err);

            // EventSource auto-reconnects — but if session is done, close it
            if (eventSource.readyState === EventSource.CLOSED) {
                console.warn("[SSE] Connection permanently closed");
            }
        };

        return () => {
            if (reconnectTimer) clearTimeout(reconnectTimer);
            eventSource.close();
            console.log("[SSE] Unsubscribed from session:", sessionId);
        };
    }

    /**
     * Routes incoming SSE events to the correct handler.
     * Matches exactly what C# PublishEventAsync emits.
     */
    private routeEvent(event: SessionEvent, handlers: SessionEventHandlers): void {
        switch (event.type) {
            case "SESSION_TRANSFERRED":
                handlers.onTransferred?.(event);
                break;

            case "SESSION_STEP_CHANGED":
                handlers.onStepChanged?.(event);
                break;

            case "SESSION_COMPLETED":
                handlers.onCompleted?.(event);
                break;

            case "SESSION_ENDED":
                handlers.onEnded?.(event);
                break;

            case "SESSION_EXPIRED":
                handlers.onExpired?.(event);
                break;

            default: {
                const unknownEvent = event as SessionEvent;
                console.warn("[SSE] Unknown event type:", unknownEvent);
                handlers.onUnknown?.(unknownEvent);
            }
        }
    }
}

// Matches exactly what C# emits via PublishEventAsync
export interface SessionEventHandlers {
    onConnected?:   ()                       => void;
    onTransferred?: (event: SessionEvent)    => void;
    onStepChanged?: (event: SessionEvent)    => void;
    onCompleted?:   (event: SessionEvent)    => void;
    onEnded?:       (event: SessionEvent)    => void;
    onExpired?:     (event: SessionEvent)    => void;
    onError?:       (error: Event)           => void;
    onUnknown?:     (event: SessionEvent)    => void;
}