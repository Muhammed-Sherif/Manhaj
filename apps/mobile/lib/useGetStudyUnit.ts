import { useState, useEffect, useCallback } from 'react';
import { getContentStudyUnitsId } from '@manhaj/api-client';
import { getStudyUnitDetails, saveStudyUnitDetailsToSqlite } from '../services/contentSyncService';

export interface UseGetStudyUnitResult {
  studyUnit: any | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGetStudyUnit(id?: string): UseGetStudyUnitResult {
  const [studyUnit, setStudyUnit] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudyUnit = useCallback(async (forceRefresh = false) => {
    if (!id) {
      setIsLoading(false);
      setError('StudyUnit ID is missing');
      return;
    }

    // 1. Fetch from SQLite first (Offline-First / Availability-First)
    try {
      const localStudyUnit = await getStudyUnitDetails(id);
      if (localStudyUnit) {
        setStudyUnit(localStudyUnit);
        setIsLoading(false);
        setError(null);

        // Silent background update if not forcing refresh
        if (!forceRefresh) {
          try {
            const apiRes = await getContentStudyUnitsId(id);
            if (apiRes?.data) {
              await saveStudyUnitDetailsToSqlite(apiRes.data);
              const refreshed = await getStudyUnitDetails(id);
              if (refreshed) {
                setStudyUnit(refreshed);
              }
            }
          } catch (bgErr) {
            console.log('[useGetStudyUnit] Background sync skipped/failed:', bgErr);
          }
          return;
        }
      }
    } catch (sqliteErr) {
      console.warn('[useGetStudyUnit] Failed to read studyUnit from SQLite:', sqliteErr);
    }

    // 2. If not found in SQLite (or forced refresh), fetch from API
    setIsLoading(true);
    setError(null);
    try {
      const apiRes = await getContentStudyUnitsId(id);
      if (apiRes?.data) {
        await saveStudyUnitDetailsToSqlite(apiRes.data);
        const refreshed = await getStudyUnitDetails(id);
        setStudyUnit(refreshed ?? apiRes.data);
        setIsLoading(false);
        setError(null);
      } else {
        throw new Error('StudyUnit not found');
      }
    } catch (apiErr: any) {
      // Only set error if we don't have local studyUnit data
      setStudyUnit((current: any) => {
        if (!current) {
          setError(apiErr?.message || 'Please check your connection and try again');
        }
        return current;
      });
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStudyUnit();
  }, [loadStudyUnit]);

  return {
    studyUnit,
    isLoading,
    error,
    refetch: () => loadStudyUnit(true),
  };
}

// Backwards compatibility alias
export const useStudyUnit = useGetStudyUnit;
