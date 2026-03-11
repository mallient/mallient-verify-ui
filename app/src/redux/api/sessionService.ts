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
    /**
     * POST v1/sessions — Create a new session
     */
    public async createSession(domain: string): Promise<SessionResponse> {
        const body: SessionRequest = { domain };
        const response: IBaseResult<SessionResponse> = await BaseService.PostData(
            `${API_BASE}/accounts/v1/sessions`,
            body,
        );
        return response.result;
    }

    /**
     * GET v1/sessions/{sessionId} — Get session by ID
     */
    public async getSession(sessionId: string): Promise<SessionResponse> {
        const response: IBaseResult<SessionResponse> = await BaseService.GetData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}`,
        );
        return response.result;
    }

    /**
     * PATCH v1/sessions/{sessionId} — Update session
     */
    public async updateSession(sessionId: string, request: SessionRequest): Promise<SessionResponse> {
        const response: IBaseResult<SessionResponse> = await BaseService.PatchData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}`,
            request,
        );
        return response.result;
    }

    /**
     * DELETE v1/sessions/{sessionId} — End session
     */
    public async endSession(sessionId: string): Promise<void> {
        await BaseService.DeleteData(`${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}`);
    }

    /**
     * POST v1/sessions/{sessionId}/transfer — Transfer session to a device
     */
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

    /**
     * PATCH v1/sessions/{sessionId}/step — Update step progress
     */
    public async updateStep(
        sessionId: string,
        request: UpdateSessionStepRequest,
    ): Promise<void> {
        await BaseService.PatchData(
            `${API_BASE}/accounts/v1/sessions/${encodeURIComponent(sessionId)}/step`,
            request,
        );
    }

    /**
     * POST v1/sessions/{sessionId}/complete — Complete session
     */
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