import BaseService from "./baseService";
import type { SessionResponse } from "../types/brandConfig";

export class SessionService extends BaseService {
    public async GenerateSession(): Promise<SessionResponse> {
        // TODO: Replace with actual API call when backend is ready
        // return await BaseService.PostData(`${import.meta.env.VITE_API_BASE_URL}/verification/session`, {});
        
        // Mock response with brand configuration
        return this.mockGenerateSession();
    }

    /**
     * Mock session generation with brand configuration
     * This simulates what the backend will return
     */
    private mockGenerateSession(): Promise<SessionResponse> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    sessionId: `session_${Date.now()}`,
                    sessionToken: `token_${Math.random().toString(36).substring(7)}`,
                    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
                    brandConfig: {
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
                            buttonBackgroundColor: '#f59e0b',
                            buttonBorderColor: '#f59e0b',
                            outlineButtonTextColor: '#fafafa',
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
                            appTitle: 'Mallient Verify',
                            
                        },
                        brandName: 'Mallient',
                        supportEmail: 'support@mallient.com',
                        privacyPolicyUrl: 'https://example.com/privacy',
                        termsOfServiceUrl: 'https://example.com/terms',
                    },
                });
            }, 500); // Simulate network delay
        });
    }
}