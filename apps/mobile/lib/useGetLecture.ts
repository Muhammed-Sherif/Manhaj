import { useState, useEffect, useCallback } from 'react';
import { getContentLecturesId } from '@manhaj/api-client';
import { getLectureDetails, saveLectureDetailsToSqlite } from '../services/contentSyncService';

export interface UseGetLectureResult {
  lecture: any | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGetLecture(id?: string): UseGetLectureResult {
  const [lecture, setLecture] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLecture = useCallback(async (forceRefresh = false) => {
    if (!id) {
      setIsLoading(false);
      setError('Lecture ID is missing');
      return;
    }

    // 1. Fetch from SQLite first (Offline-First / Availability-First)
    try {
      const localLecture = await getLectureDetails(id);
      if (localLecture) {
        setLecture(localLecture);
        setIsLoading(false);
        setError(null);

        // Silent background update if not forcing refresh
        if (!forceRefresh) {
          try {
            const apiRes = await getContentLecturesId(id);
            if (apiRes?.data) {
              await saveLectureDetailsToSqlite(apiRes.data);
              const refreshed = await getLectureDetails(id);
              if (refreshed) {
                setLecture(refreshed);
              }
            }
          } catch (bgErr) {
            console.log('[useGetLecture] Background sync skipped/failed:', bgErr);
          }
          return;
        }
      }
    } catch (sqliteErr) {
      console.warn('[useGetLecture] Failed to read lecture from SQLite:', sqliteErr);
    }

    // 2. If not found in SQLite (or forced refresh), fetch from API
    setIsLoading(true);
    setError(null);
    try {
      const apiRes = await getContentLecturesId(id);
      if (apiRes?.data) {
        await saveLectureDetailsToSqlite(apiRes.data);
        const refreshed = await getLectureDetails(id);
        setLecture(refreshed ?? apiRes.data);
        setIsLoading(false);
        setError(null);
      } else {
        throw new Error('Lecture not found');
      }
    } catch (apiErr: any) {
      // Only set error if we don't have local lecture data
      setLecture((current: any) => {
        if (!current) {
          setError(apiErr?.message || 'Please check your connection and try again');
        }
        return current;
      });
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLecture();
  }, [loadLecture]);

  return {
    lecture,
    isLoading,
    error,
    refetch: () => loadLecture(true),
  };
}

// Backwards compatibility alias
export const useLecture = useGetLecture;
