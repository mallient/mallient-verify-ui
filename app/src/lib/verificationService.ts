// Verification session types and API service
// TODO: Replace these placeholder functions with actual backend API calls

export type VerificationStatus = "pending" | "mobile" | "web";

export interface VerificationSession {
    sessionId: string;
    sessionToken: string;
    status: VerificationStatus;
    createdAt: number;
    expiresAt: number;
}

// Generate a unique session ID
export const generateSessionId = (): string => {
    return crypto.randomUUID();
};

// Generate a session token for anonymous verification
export const generateSessionToken = (): string => {
    return crypto.randomUUID();
};

// Create a new verification session
// TODO: Implement actual API call to create session on backend
export const createVerificationSession = async (): Promise<VerificationSession> => {
    const sessionId = generateSessionId();
    const sessionToken = generateSessionToken();
    const session: VerificationSession = {
        sessionId,
        sessionToken,
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    // TODO: POST to backend API
    // await fetch('/api/verification/session', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(session)
    // });

    // For now, store in sessionStorage as a placeholder
    sessionStorage.setItem(`verify_session_${sessionId}`, JSON.stringify(session));
    
    return session;
};

// Get verification session status
// TODO: Implement actual API polling
export const getVerificationSession = async (
    sessionId: string,
    sessionToken: string
): Promise<VerificationSession | null> => {
    // TODO: GET from backend API
    // const response = await fetch(`/api/verification/session/${sessionId}`, {
    //     headers: { 'X-Session-Token': sessionToken }
    // });
    // return response.json();

    // Placeholder: check sessionStorage
    const stored = sessionStorage.getItem(`verify_session_${sessionId}`);
    if (!stored) return null;
    const session: VerificationSession = JSON.parse(stored);
    if (session.sessionToken !== sessionToken) return null;
    return session;
};

// Update verification session status
// TODO: Implement actual API call
export const updateVerificationStatus = async (
    sessionId: string,
    status: VerificationStatus,
    sessionToken: string
): Promise<VerificationSession | null> => {
    // TODO: PATCH to backend API
    // const response = await fetch(`/api/verification/session/${sessionId}`, {
    //     method: 'PATCH',
    //     headers: {
    //         'X-Session-Token': sessionToken,
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({ status })
    // });
    // return response.json();

    // Placeholder: update sessionStorage
    const stored = sessionStorage.getItem(`verify_session_${sessionId}`);
    if (!stored) return null;
    
    const session: VerificationSession = JSON.parse(stored);
    if (session.sessionToken !== sessionToken) return null;
    session.status = status;
    sessionStorage.setItem(`verify_session_${sessionId}`, JSON.stringify(session));
    
    // Broadcast to other tabs/windows on same device
    const channel = new BroadcastChannel('verification_channel');
    channel.postMessage({ sessionId, status });
    channel.close();
    
    return session;
};

// Subscribe to verification status changes
// TODO: Replace with WebSocket or Server-Sent Events
export const subscribeToVerificationStatus = (
    sessionId: string,
    sessionToken: string,
    onStatusChange: (status: VerificationStatus) => void,
    pollInterval: number = 2000
): (() => void) => {
    let isActive = true;
    
    // Listen for BroadcastChannel messages (same device, different tabs)
    const channel = new BroadcastChannel('verification_channel');
    channel.onmessage = (event) => {
        if (event.data.sessionId === sessionId && isActive) {
            onStatusChange(event.data.status);
        }
    };

    // Poll for changes (cross-device)
    const poll = async () => {
        if (!isActive) return;
        
        try {
            const session = await getVerificationSession(sessionId, sessionToken);
            if (session && session.status !== "pending") {
                onStatusChange(session.status);
            }
        } catch (error) {
            console.error("Error polling verification status:", error);
        }
        
        if (isActive) {
            setTimeout(poll, pollInterval);
        }
    };
    
    poll();
    
    // Return cleanup function
    return () => {
        isActive = false;
        channel.close();
    };
};
