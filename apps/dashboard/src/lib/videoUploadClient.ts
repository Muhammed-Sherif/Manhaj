const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  currentChunk: number;
  totalChunks: number;
  status: 'initializing' | 'uploading' | 'merging' | 'completed' | 'error';
  errorMessage?: string;
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.round(video.duration) || 0);
    };
    video.onerror = () => {
      resolve(0);
    };
    video.src = URL.createObjectURL(file);
  });
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('manhaj_access_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  return headers;
}

export async function uploadLectureVideo(
  lectureId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  existingUploadId?: string
) {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunk
  const totalBytes = file.size;
  const totalChunks = Math.ceil(totalBytes / chunkSize);
  const duration = await getVideoDuration(file);

  onProgress?.({
    uploadedBytes: 0,
    totalBytes,
    percent: 0,
    currentChunk: 0,
    totalChunks,
    status: 'initializing',
  });

  let uploadId = existingUploadId;
  let alreadyUploadedChunks: number[] = [];

  // Step 1: Init or check existing upload status
  if (!uploadId) {
    const initRes = await fetch(`${API_BASE_URL}/admin/lectures/${lectureId}/videos/upload/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        sourceName: file.name,
        fileSize: totalBytes,
        chunkSize,
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({ error: 'Failed to init upload' }));
      throw new Error(err.error || 'Failed to initialize video upload');
    }

    const initData = await initRes.json();
    uploadId = initData.uploadId;
  } else {
    // Resume: query status of existing upload
    const statusRes = await fetch(
      `${API_BASE_URL}/admin/lectures/${lectureId}/videos/upload/${uploadId}/status`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      alreadyUploadedChunks = statusData.uploadedChunks || [];
    }
  }

  // Step 2: Stream upload chunks (zero-RAM Blob stream)
  let cumulativeUploadedBytes = alreadyUploadedChunks.reduce((sum, idx) => {
    const isLast = idx === totalChunks - 1;
    const size = isLast ? totalBytes - idx * chunkSize : chunkSize;
    return sum + size;
  }, 0);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    // If chunk was already uploaded, skip it
    if (alreadyUploadedChunks.includes(chunkIndex)) {
      continue;
    }

    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, totalBytes);
    // Slice returns a lightweight Blob reference without copying file into RAM
    const chunkBlob = file.slice(start, end);
    const chunkByteLength = end - start;

    // Retry loop for resilience against transient disconnects
    let attempts = 0;
    let success = false;
    let lastError: any = null;

    while (attempts < 3 && !success) {
      attempts++;
      try {
        const uploadRes = await fetch(
          `${API_BASE_URL}/admin/lectures/${lectureId}/videos/upload/chunk`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'x-upload-id': uploadId!,
              'x-chunk-index': String(chunkIndex),
              ...getAuthHeaders(),
            },
            body: chunkBlob,
          }
        );

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(err.error || `Chunk ${chunkIndex} upload failed`);
        }

        success = true;
      } catch (err) {
        lastError = err;
        // Wait briefly before retrying (exponential backoff)
        if (attempts < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempts));
        }
      }
    }

    if (!success) {
      onProgress?.({
        uploadedBytes: cumulativeUploadedBytes,
        totalBytes,
        percent: Math.round((cumulativeUploadedBytes / totalBytes) * 100),
        currentChunk: chunkIndex,
        totalChunks,
        status: 'error',
        errorMessage: lastError?.message || 'Network disconnected while uploading chunk',
      });
      throw lastError;
    }

    cumulativeUploadedBytes += chunkByteLength;
    const percent = Math.min(Math.round((cumulativeUploadedBytes / totalBytes) * 100), 99);

    onProgress?.({
      uploadedBytes: cumulativeUploadedBytes,
      totalBytes,
      percent,
      currentChunk: chunkIndex + 1,
      totalChunks,
      status: 'uploading',
    });
  }

  // Step 3: Finalize and merge on server
  onProgress?.({
    uploadedBytes: totalBytes,
    totalBytes,
    percent: 99,
    currentChunk: totalChunks,
    totalChunks,
    status: 'merging',
  });

  const completeRes = await fetch(
    `${API_BASE_URL}/admin/lectures/${lectureId}/videos/upload/complete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        uploadId,
        duration,
      }),
    }
  );

  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({ error: 'Finalize failed' }));
    throw new Error(err.error || 'Failed to complete video merge on server');
  }

  const createdVideo = await completeRes.json();

  onProgress?.({
    uploadedBytes: totalBytes,
    totalBytes,
    percent: 100,
    currentChunk: totalChunks,
    totalChunks,
    status: 'completed',
  });

  return createdVideo;
}
