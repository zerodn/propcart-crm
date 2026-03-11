/**
 * Upload API service
 * Handles file uploads to /temp folder before form save
 */

const UPLOAD_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
export async function uploadFileToTemp(
  file: File,
  accessToken: string,
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${UPLOAD_API_URL}/upload/temp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.error(`Upload failed ${response.status}:`, body);
      return null;
    }

    const data: UploadResponse = await response.json();
    return data.data.url;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}
