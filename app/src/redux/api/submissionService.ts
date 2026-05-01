import BaseService from "./baseService";
import type {
  CreateSubmissionRequest,
  GenerateUploadUrlsRequest,
  GenerateUploadUrlsResponse,
  PresignedUploadUrl,
  SubmissionResponse,
} from "../types/brandConfig";
import type { IBaseResult } from "../types/baseResults";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/** Convert a base64 data URL to a Blob for direct S3 upload. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes]);
}

export class SubmissionService extends BaseService {
  /**
   * Request presigned S3 upload URLs for each document type.
   * Corresponds to POST /organizations/v1/tenant/{tenantId}/upload-urls
   */
  public async generateUploadUrls(
    tenantId: string,
    applicationId: string,
    sessionId: string,
    documentTypes: string[],
  ): Promise<PresignedUploadUrl[]> {
    const body: GenerateUploadUrlsRequest = {
      tenantId,
      applicationId,
      sessionId,
      documents: documentTypes.map((documentType) => ({
        documentId: '',
        documentType,
        fileName: `${documentType}.jpg`,
      })),
    };
    const response: IBaseResult<GenerateUploadUrlsResponse['result']> = await BaseService.PostData(
      `${API_BASE}/organizations/v1/tenant/${encodeURIComponent(tenantId)}/submissions/upload-urls`,
      body,
    );
    if (!response.isSuccessful) {
      throw new Error(
        response.errorMessage ?? "Failed to generate upload URLs",
      );
    }
    return response.result.uploads;
  }

  /**
   * PUT an image directly to a presigned S3 URL.
   * The presigned URL already contains auth — no Authorization header is sent.
   */
  public async uploadToPresignedUrl(
    uploadUrl: string,
    imageData: string,
  ): Promise<void> {
    try {
      const blob = dataUrlToBlob(imageData);

      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
      });
      if (!res.ok) {
        throw new Error(`S3 upload failed: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error("Error uploading to S3:", error);
      throw error;
    }
  }

  /**
   * Create a verification submission referencing already-uploaded S3 documents.
   * Corresponds to POST /organizations/v1/tenant/{tenantId}/submissions
   */
  public async createSubmission(
    tenantId: string,
    request: CreateSubmissionRequest,
    token?: string,
  ): Promise<SubmissionResponse> {
    const response: SubmissionResponse = await BaseService.PostData(
      `${API_BASE}/organizations/v1/tenant/${encodeURIComponent(tenantId)}/submissions`,
      request,
      undefined,
      token,
    );
    return response;
  }
}
