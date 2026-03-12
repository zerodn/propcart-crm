/**
 * Upload API service
 * Handles file uploads to /temp folder before form save
 */

import apiClient from './api-client';

export interface UploadResponse {
  data: {
    url: string;
    fileName: string;
    size: number;
  };
}

/**
 * Upload file to temporary storage
 * WorkspaceId is resolved from the JWT token on the backend
 * Files in /temp are auto-deleted after 24 hours
 */
export async function uploadFileToTemp(file: File, accessToken?: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Prefer apiClient to leverage request/refresh-token interceptors.
    const res = await apiClient.post<UploadResponse>('/upload/temp', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    const payload: any = res.data;
    const url = payload?.data?.url ?? payload?.url ?? null;
    return typeof url === 'string' ? url : null;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}
