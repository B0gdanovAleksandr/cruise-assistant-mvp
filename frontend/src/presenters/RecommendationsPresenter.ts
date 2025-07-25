import { useRecommendations } from '../hooks/useRecommendations';
import { UserPreferences, RecommendationsResponse } from '../types/api';

export interface RecommendationsPresenterProps {
  onGetRecommendations: (preferences: UserPreferences) => Promise<void>;
  onRetry: () => void;
  onReset: () => void;
  data: { success: boolean; recommendations: RecommendationsResponse } | undefined;
  loading: boolean;
  error: Error | null;
}

export const useRecommendationsPresenter = (): RecommendationsPresenterProps => {
  const {
    mutate: getRecommendations,
    data: recommendationsData,
    isPending: loading,
    error,
    reset,
  } = useRecommendations();

  const handleGetRecommendations = async (preferences: UserPreferences): Promise<void> => {
    getRecommendations(preferences);
  };

  const handleRetry = (): void => {
    if (error) {
      reset();
    }
  };

  const handleReset = (): void => {
    reset();
  };

  return {
    onGetRecommendations: handleGetRecommendations,
    onRetry: handleRetry,
    onReset: handleReset,
    data: recommendationsData,
    loading,
    error,
  };
}; 