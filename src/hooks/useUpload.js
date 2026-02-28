// src/hooks/useUpload.js
import { useState, useCallback } from 'react';
import { uploadPolicy } from '../services/api';

/**
 * @typedef {{ type: 'success'|'error'; text: string }} UploadMessage
 */

/**
 * Manages PDF upload state: idle → uploading → done/error.
 *
 * @returns {{
 *   uploading: boolean;
 *   message: UploadMessage|null;
 *   upload: (file: File, metadata?: object) => Promise<void>;
 *   reset: () => void;
 * }}
 */
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [message,   setMessage]   = useState(null);

  const upload = useCallback(async (file, metadata = {}) => {
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const res = await uploadPolicy(file, metadata);
      setMessage({
        type: 'success',
        text: `"${file.name}" uploaded — ${res.chunks_created ?? 0} chunks indexed (${res.policy_id}).`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Upload failed: ${err.message}`,
      });
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => setMessage(null), []);

  return { uploading, message, upload, reset };
}
