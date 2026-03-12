import type {
    SessionResponse,
    WebSocketMessage,
    WebSocketEvent,
} from "../types/brandConfig";

const WS_URL = import.meta.env.VITE_WS_URL || "wss://i36ocgpfc8.execute-api.us-east-1.amazonaws.com/dev";

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

export interface SessionEventHandlers {
    onConnected?: () => void;
    onMessage?: (event: WebSocketEvent) => void;
    onError?: (error: Event) => void;
    onClose?: (event: CloseEvent) => void;
}

export class SessionService {
    private socket: WebSocket | null = null;
    private handlers: SessionEventHandlers = {};
    private pendingRequests: Map<string, {
        resolve: (value: SessionResponse) => void;
        reject: (reason: unknown) => void;
    }> = new Map();
    private connectPromise: Promise<void> | null = null;
    private retryCount = 0;

    /**
     * Open the WebSocket connection. Resolves when the connection is open.
     * If already connected, returns immediately.
     * Retries up to MAX_RETRIES times with exponential backoff.
     */
    public connect(handlers: SessionEventHandlers = {}): Promise<void> {
        this.handlers = handlers;

        if (this.socket?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        if (this.connectPromise) {
            return this.connectPromise;
        }

        this.connectPromise = this.attemptConnect();
        return this.connectPromise;
    }

    private attemptConnect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            console.log(`[WS] Connecting to ${WS_URL} (attempt ${this.retryCount + 1}/${MAX_RETRIES + 1})`);
            this.socket = new WebSocket(WS_URL);

            this.socket.onopen = () => {
                console.log("[WS] Connected to session service");
                this.retryCount = 0;
                this.handlers.onConnected?.();
                resolve();
            };

            this.socket.onmessage = (msg) => {
                try {
                    const data: WebSocketEvent = JSON.parse(msg.data);
                    console.log("[WS] Message received:", data);

                    // Resolve pending request if this is a response with sessionId
                    if (data.sessionId) {
                        const pending = this.pendingRequests.get(data.sessionId);
                        if (pending) {
                            this.pendingRequests.delete(data.sessionId);
                            pending.resolve({ sessionId: data.sessionId, token: data.token });
                            return;
                        }
                    }

                    // Resolve any "createSession" pending request (new session — id not known yet)
                    if (data.sessionId && this.pendingRequests.has("__create__")) {
                        const pending = this.pendingRequests.get("__create__");
                        if (pending) {
                            this.pendingRequests.delete("__create__");
                            pending.resolve({ sessionId: data.sessionId, token: data.token });
                            return;
                        }
                    }

                    // Handle error responses
                    if (data.error) {
                        // Reject first pending request if there's an error
                        const firstPending = this.pendingRequests.entries().next().value;
                        if (firstPending) {
                            const [key, pending] = firstPending;
                            this.pendingRequests.delete(key);
                            pending.reject(new Error(data.error));
                            return;
                        }
                    }

                    // Forward to handler for real-time events
                    this.handlers.onMessage?.(data);
                } catch {
                    console.error("[WS] Failed to parse message:", msg.data);
                }
            };

            this.socket.onerror = (err) => {
                console.error("[WS] Connection error:", err);
                this.handlers.onError?.(err);
            };

            this.socket.onclose = (event) => {
                console.log("[WS] Connection closed:", event.code, event.reason);
                this.handlers.onClose?.(event);
                this.connectPromise = null;
                this.socket = null;

                // Reject all pending requests
                for (const [key, pending] of this.pendingRequests) {
                    pending.reject(new Error("WebSocket connection closed"));
                    this.pendingRequests.delete(key);
                }

                // If we haven't resolved yet (connection was never established), retry
                if (this.retryCount < MAX_RETRIES) {
                    this.retryCount++;
                    const delay = BASE_RETRY_DELAY * Math.pow(2, this.retryCount - 1);
                    console.log(`[WS] Retrying in ${delay}ms...`);
                    setTimeout(() => {
                        this.attemptConnect().then(resolve).catch(reject);
                    }, delay);
                } else {
                    reject(new Error(`WebSocket failed to connect after ${MAX_RETRIES + 1} attempts to ${WS_URL}`));
                }
            };
        });
    }

    /**
     * Send a message over the WebSocket. Ensures connection is open first.
     */
    private async send(message: WebSocketMessage): Promise<void> {
        console.log("[WS] Preparing to send message:", JSON.stringify(message));
        await this.connect(this.handlers);

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.error("[WS] Cannot send — socket not open. readyState:", this.socket?.readyState);
            throw new Error("WebSocket is not connected");
        }

        console.log("[WS] Sending message over WebSocket");
        this.socket.send(JSON.stringify(message));
    }

    /**
     * Create a new session via WebSocket.
     */
    public async createSession(domain: string, brandConfig?: string): Promise<SessionResponse> {
        console.log(`[Session] Creating session for domain: ${domain}`);
        const message: WebSocketMessage = {
            action: "createSession",
            domain,
            brandConfig,
        };

        return new Promise<SessionResponse>((resolve, reject) => {
            this.pendingRequests.set("__create__", { resolve, reject });
            console.log("[Session] Pending request registered for __create__");
            this.send(message).catch((err) => {
                console.error("[Session] Failed to send createSession:", err);
                this.pendingRequests.delete("__create__");
                reject(err);
            });
        });
    }

    /**
     * Update an existing session via WebSocket.
     */
    public async updateSession(
        sessionId: string,
        updates: { status?: string; isMobile?: boolean; currentStep?: string },
    ): Promise<SessionResponse> {
        console.log(`[Session] Updating session ${sessionId}:`, updates);
        const message: WebSocketMessage = {
            action: "updateSession",
            sessionId,
            status: updates.status,
            isMobile: updates.isMobile,
            currentStep: updates.currentStep,
        };

        return new Promise<SessionResponse>((resolve, reject) => {
            this.pendingRequests.set(sessionId, { resolve, reject });
            console.log(`[Session] Pending request registered for ${sessionId}`);
            this.send(message).catch((err) => {
                console.error("[Session] Failed to send updateSession:", err);
                reject(err);
            });
        });
    }

    /**
     * Disconnect the WebSocket.
     */
    public disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.connectPromise = null;
        }
    }

    /**
     * Whether the WebSocket is currently connected.
     */
    public get isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }
}