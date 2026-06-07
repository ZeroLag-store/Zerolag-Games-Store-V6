/**
 * Reusable Media Uploader utilizing Cloudinary Upload API.
 * Highly robust, utilizing native XMLHttpRequest for accurate progress streaming.
 */
export async function uploadMedia(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; publicId: string }> {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const nameLower = file.name.toLowerCase();
  const formatValid = allowedExtensions.some(ext => nameLower.endsWith(ext)) ||
                      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
                      
  if (!formatValid) {
    throw new Error('Unsupported image format. Please select a JPG, PNG, or WEBP image.');
  }

  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxBytes) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum allowed is 10MB.`);
  }

  const metaEnv = (import.meta as any).env || {};
  const cloudName = metaEnv.VITE_CLOUDINARY_CLOUD_NAME || 'da7lsqvhb';
  const uploadPreset = metaEnv.VITE_CLOUDINARY_UPLOAD_PRESET || 'zerolag_upload';

  console.log(`[CLOUDINARY UPLOADER] Initiating upload for "${file.name}" of size ${file.size} bytes`);
  console.log(`[CLOUDINARY UPLOADER] Using Cloud Name: "${cloudName}", Preset: "${uploadPreset}"`);

  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    xhr.open('POST', uploadUrl, true);

    // Dynamic progress stream
    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          console.log(`[CLOUDINARY PROGRESS] Uploading "${file.name}": ${percent}% complete`);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('[CLOUDINARY SUCCESS] Received payload:', response);
          resolve({
            url: response.secure_url || response.url,
            publicId: response.public_id
          });
        } catch (jsonErr: any) {
          console.error('[CLOUDINARY SUCCESS PARSE EXCEPTION]', jsonErr);
          reject(new Error(`Failed to parse upload reply: ${jsonErr.message || jsonErr}`));
        }
      } else {
        try {
          const errResponse = JSON.parse(xhr.responseText);
          console.error('[CLOUDINARY EXPLICIT FAILURE]', errResponse);
          reject(new Error(errResponse.error?.message || `Failed to upload graphics: status ${xhr.status}`));
        } catch {
          console.error('[CLOUDINARY IMPLICIT FAILURE] Raw content:', xhr.responseText);
          reject(new Error(`Server rejected upload with code ${xhr.status}: ${xhr.statusText || 'Unknown Connection Interruption'}`));
        }
      }
    };

    xhr.onerror = () => {
      console.error('[CLOUDINARY NETWORK ERROR] Unable to dispatch stream.');
      reject(new Error('A network error occurred. Please verify your connection status and configurations.'));
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    xhr.send(formData);
  });
}

/**
 * Legacy clean no-op keeping system compatibility without storing admin key client-side.
 */
export async function deleteImageHelper(url: string): Promise<void> {
  console.log(`[CLOUDINARY BYPASS] Client-side delete bypass for url: ${url} (Requires secure administrative API credentials).`);
  return Promise.resolve();
}
