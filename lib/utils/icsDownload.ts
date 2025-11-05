/**
 * ICS Calendar Download Utility
 *
 * Provides secure download of ICS files from authenticated API endpoints.
 * Uses Firebase ID tokens in Authorization headers to authenticate requests.
 *
 * @module lib/utils/icsDownload
 */

import { getAuth } from 'firebase/auth';

import { getFirebaseApp } from '../firebase/client';

export interface IcsDownloadOptions {
  /**
   * The API endpoint URL to download from
   * @example "/api/ics/exams?lang=en&upcoming=true"
   */
  url: string;

  /**
   * Filename for the downloaded ICS file
   * @example "exams-en.ics"
   */
  filename: string;

  /**
   * Callback function for error handling
   * @param errorMessage - Localized error message
   */
  onError?: (errorMessage: string) => void;

  /**
   * Callback function for success
   */
  onSuccess?: () => void;

  /**
   * Translation function for error messages
   */
  t?: (key: string, options?: any) => string;
}

/**
 * Downloads an ICS calendar file from an authenticated API endpoint
 *
 * This function:
 * 1. Gets the current user's Firebase ID token
 * 2. Makes a fetch request with Authorization header
 * 3. Creates a Blob from the response
 * 4. Triggers browser download
 *
 * @param options - Download configuration options
 * @throws Error if user is not authenticated
 *
 * @example
 * ```tsx
 * import { downloadIcsFile } from '@/lib/utils/icsDownload';
 *
 * const handleExport = async () => {
 *   await downloadIcsFile({
 *     url: '/api/ics/exams?lang=en&upcoming=true',
 *     filename: 'exams-en.ics',
 *     onError: (msg) => alert(msg),
 *     onSuccess: () => console.log('Downloaded!'),
 *     t: (key) => translations[key]
 *   });
 * };
 * ```
 */
export async function downloadIcsFile(options: IcsDownloadOptions): Promise<void> {
  const { url, filename, onError, onSuccess, t } = options;

  try {
    // Get Firebase auth instance
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const currentUser = auth.currentUser;

    // Check authentication
    if (!currentUser) {
      const errorMsg = t
        ? t('errors.notAuthenticated', { defaultValue: 'Please sign in to download calendar files' })
        : 'Please sign in to download calendar files';
      onError?.(errorMsg);
      return;
    }

    // Get Firebase ID token
    const idToken = await currentUser.getIdToken();

    // Make authenticated request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    // Handle errors
    if (!response.ok) {
      let errorMsg: string;

      if (response.status === 401) {
        errorMsg = t
          ? t('errors.unauthorized', {
              defaultValue: 'Authentication failed. Please sign in again.',
            })
          : 'Authentication failed. Please sign in again.';
      } else if (response.status === 403) {
        errorMsg = t
          ? t('errors.forbidden', {
              defaultValue: 'You do not have permission to access this resource.',
            })
          : 'You do not have permission to access this resource.';
      } else if (response.status === 429) {
        errorMsg = t
          ? t('errors.rateLimited', {
              defaultValue: 'Too many requests. Please try again later.',
            })
          : 'Too many requests. Please try again later.';
      } else if (response.status >= 500) {
        errorMsg = t
          ? t('errors.serverError', {
              defaultValue: 'Server error. Please try again later.',
            })
          : 'Server error. Please try again later.';
      } else {
        errorMsg = t
          ? t('errors.downloadFailed', {
              defaultValue: 'Failed to download calendar file.',
            })
          : 'Failed to download calendar file.';
      }

      onError?.(errorMsg);
      return;
    }

    // Get response as blob
    const blob = await response.blob();

    // Create download link and trigger download
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    // Call success callback
    onSuccess?.();
  } catch (error) {
    console.error('Error downloading ICS file:', error);
    const errorMsg = t
      ? t('errors.networkError', {
          defaultValue: 'Network error. Please check your connection and try again.',
        })
      : 'Network error. Please check your connection and try again.';
    onError?.(errorMsg);
  }
}
