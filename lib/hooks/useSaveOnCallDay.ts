'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { StationsMap } from '@/types/onCall';

interface SaveOnCallDayParams {
  dateKey: string;
  stations: StationsMap;
}

interface SaveOnCallDayResponse {
  success: boolean;
  message: string;
  dateKey: string;
}

/**
 * Hook to save/update a single on-call day manually
 */
export function useSaveOnCallDay() {
  const queryClient = useQueryClient();

  return useMutation<SaveOnCallDayResponse, Error, SaveOnCallDayParams>({
    mutationFn: async ({ dateKey, stations }: SaveOnCallDayParams) => {
      const response = await fetch('/api/on-call/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dateKey, stations }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save on-call day');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate on-call schedule queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['onCallSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['onCallByDate'] });
      queryClient.invalidateQueries({ queryKey: ['onCallToday'] });
    },
  });
}
