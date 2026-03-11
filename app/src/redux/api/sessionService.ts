import BaseService from "./baseService";
import type {
    SessionResponse,
    SessionEvent,
    TransferSessionRequest,
    UpdateSessionStepRequest,
    CompleteSessionRequest,
} from "../types/brandConfig";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export class SessionService extends BaseService {
    /**
     * POST v1/sessions — Create a new session
     */
    public async createSession(): Promise<SessionResponse> {
        return await BaseService.PostData(`${API_BASE}/accounts/v1/sessions`, {});
    }

    /**
     * GET v1/sessions/{sessionId} — Get session by ID
     */
    public async getSession(sessionId: string): Promise<SessionResponse> {
        return await BaseService.GetData(`${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}`);
    }

    /**
     * DELETE v1/sessions/{sessionId} — End session (publishes SESSION_ENDED)
     */
    public async endSession(sessionId: string): Promise<void> {
        await BaseService.DeleteData(`${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}`);
    }

    /**
     * POST v1/sessions/{sessionId}/transfer — Transfer session to a device
     * Publishes SESSION_TRANSFERRED via Redis Pub/Sub
     */
    public async transferSession(
        sessionId: string,
        request: TransferSessionRequest,
    ): Promise<SessionResponse> {
        return await BaseService.PostData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/transfer`,
            request,
        );
    }

    /**
     * PATCH v1/sessions/{sessionId}/step — Update step progress
     * Publishes SESSION_STEP_CHANGED with progress percentage
     */
    public async updateStep(
        sessionId: string,
        request: UpdateSessionStepRequest,
    ): Promise<SessionResponse> {
        return await BaseService.PatchData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/step`,
            request,
        );
    }

    /**
     * POST v1/sessions/{sessionId}/complete — Complete session
     * Publishes SESSION_COMPLETED with redirectUrl from UrlRedirectOnComplete
     */
    public async completeSession(
        sessionId: string,
        request?: CompleteSessionRequest,
    ): Promise<SessionResponse> {
        return await BaseService.PostData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/complete`,
            request ?? {},
        );
    }

    /**
     * GET v1/sessions/{sessionId}/events — Subscribe to SSE stream
     * Backed by Redis Pub/Sub on channel session-events:{id}
     *
     * Returns an unsubscribe function to close the connection.
     */
    public subscribeToEvents(
        sessionId: string,
        onEvent: (event: SessionEvent) => void,
        onError?: (error: Event) => void,
    ): () => void {
        const url = `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/events`;
        const eventSource = new EventSource(url);

        eventSource.onmessage = (msg) => {
            try {
                const event: SessionEvent = JSON.parse(msg.data);
                onEvent(event);
            } catch {
                console.error('Failed to parse SSE event:', msg.data);
            }
        };

        eventSource.onerror = (err) => {
            if (onError) {
                onError(err);
            } else {
                console.error('SSE connection error:', err);
            }
        };

        return () => {
            eventSource.close();
        };
    }
}