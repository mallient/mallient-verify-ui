import BaseService from "./baseService";
import type { SessionResponse } from "../types/brandConfig";

export class SessionService extends BaseService {
    public async GenerateSession(sessionId?: string): Promise<SessionResponse> {
        // TODO: Replace with actual API call when backend is ready
        // If sessionId is provided, fetch config for that session
        // Otherwise, generate new session
        // return await BaseService.PostData(`${import.meta.env.VITE_API_BASE_URL}/verification/session`, { sessionId });
        
        // Mock response with brand configuration
        return this.mockGenerateSession(sessionId);
    }

    /**
     * Mock session generation with brand configuration
     * This simulates what the backend will return
     */
    private mockGenerateSession(sessionId?: string): Promise<SessionResponse> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    sessionId: sessionId || `session_${Date.now()}`,
                    sessionToken: `token_${Math.random().toString(36).substring(7)}`,
                    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
                    brandConfig: {
                        domain: 'testbank.com',
                        logo: {
                            primaryLogoUrl: 'https://dnmmf3ubeuub9.cloudfront.net/Logos/mallient-gold.png',
                            logoPlacement: 'header',
                            logoWidth: '150px',
                            logoHeight: '50px',
                        },
                        colors: {
                            primaryColor: '#443c2d', // Amber
                            secondaryColor: '#3f3f46', // Zinc-700
                            accentColor: '#fbbf24', // Amber-400
                            backgroundColor: '#18181b', // Zinc-900
                            textColor: '#fafafa', // Zinc-50
                            borderColor: '#3f3f46',
                            hoverColor: '#d97706', // Amber-600
                            buttonTextColor: '#ffffff',
                            buttonBackgroundColor: '#0e0d0c',
                            buttonBorderColor: '#0f0f0e',
                            outlineButtonTextColor: '#1a1616',
                            outlineButtonBorderColor: '#3f3f46',
                            outlineButtonHoverBgColor: '#27272a',
                        },
                        typography: {
                            fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
                            headingFontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
                            baseFontSize: '16px',
                            headingFontWeight: '600',
                        },
                        layout: {
                            bannerStyle: 'gradient',
                            bannerHeight: '80px',
                            bannerTextAlignment: 'center',
                            contentMaxWidth: '1200px',
                            borderRadius: '0.5rem',
                            boxShadow: 'lg',
                        },
                        text: {
                            appTitle: 'Test Bank Verify',
                            tagline: 'Your trusted partner in verification',
                            welcomeMessage: 'Welcome to Test Bank Verify',
                            instructionText: 'Please follow the steps to verify your identity',
                        },
                        brandName: 'Test Bank',
                        supportEmail: 'support@testbank.com',
                        privacyPolicyUrl: 'https://example.com/privacy',
                        termsOfServiceUrl: 'https://example.com/terms',
                        urlRedirectOnComplete: 'https://demo-bank.mallient.com/',
                        urlRedirectOnError: 'https://example.com/verification-error',
                        urlRedirectOnMobileContinue: 'https://d1xzs9779v7m5f.cloudfront.net/mobile-verify',
                        onMobileContinue: false,
                    },
                });
            }, 500); // Simulate network delay
        });
    }
}