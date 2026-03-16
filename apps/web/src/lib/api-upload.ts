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

    const payload = res.data as { data?: { url?: string }; url?: string };
    const url = payload?.data?.url ?? payload?.url ?? null;
    return typeof url === 'string' ? url : null;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

/**
 * Upload project image to permanent storage
 * Stored at {workspaceId}/properties/{date}/{uuid}.{ext} — never deleted by cleanup
 */
export async function uploadProjectImage(workspaceId: string, file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<{ data: { url: string } }>(
      `/workspaces/${workspaceId}/projects/upload-image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    const url = (res.data as { data?: { url?: string } })?.data?.url ?? null;
    return typeof url === 'string' ? url : null;
  } catch (err) {
    console.error('Project image upload error:', err);
    return null;
  }
}
