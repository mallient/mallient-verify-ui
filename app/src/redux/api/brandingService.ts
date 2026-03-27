import BaseService from "./baseService";
import type { IBaseResult } from "../types/baseResults";
import type { OrganizationBrandingResponse } from "../types/brandConfig";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export class BrandingService extends BaseService {

    public async getOrganizationBranding(domain: string): Promise<OrganizationBrandingResponse> {
        if(domain === 'localhost') {
            domain = 'verify.mallient.com';
        }
        const response: IBaseResult<OrganizationBrandingResponse> = await BaseService.GetData(
            `${API_BASE}/organizations/v1/branding/domain/${encodeURIComponent(domain)}`,
        );
        return response.result;
    }
}
