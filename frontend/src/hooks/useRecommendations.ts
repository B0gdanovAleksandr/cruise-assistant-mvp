import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { UserPreferences, RecommendationsResponse, ApiStatus, HealthCheck } from '../types/api';

// Custom hook for getting recommendations
export const useRecommendations = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; recommendations: RecommendationsResponse },
    Error,
    UserPreferences
  >({
    mutationFn: (preferences: UserPreferences) => apiClient.getRecommendations(preferences),

    onSuccess: (data, preferences) => {
      // Cache result with key based on preferences
      const cacheKey = ['recommendations', preferences];
      queryClient.setQueryData(cacheKey, data);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['recommendations'],
      });
    },

    onError: (error, preferences) => {
      console.error('Failed to get recommendations:', error);

      // Can add error handling logic
      // e.g., sending to monitoring service
    },
  });
};

// Custom hook for checking API status
export const useApiStatus = () => {
  return useQuery<ApiStatus>({
    queryKey: ['api-status'],
    queryFn: () => apiClient.getApiStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Custom hook for checking service health
export const useHealth = () => {
  return useQuery<HealthCheck>({
    queryKey: ['health'],
    queryFn: () => apiClient.getHealth(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
};