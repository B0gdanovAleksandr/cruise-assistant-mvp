import React from 'react';
import InterestSelector from '../components/InterestSelector';
import RecommendationsList from '../components/RecommendationsList';
import { UserPreferences } from '../types/api';

export interface RecommendationsViewProps {
  showInterestSelector: boolean;
  onGetRecommendations: (preferences: UserPreferences) => Promise<void>;
  onChangeInterests: () => void;
  onRetry: () => void;
  data?: { success: boolean; recommendations: any };
  loading: boolean;
  error: Error | null;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  showInterestSelector,
  onGetRecommendations,
  onChangeInterests,
  onRetry,
  data,
  loading,
  error,
}) => {
  return (
    <div className='App'>
      <header className='App-header'>
        <h1>🚢 Cruise Personal Assistant</h1>
        <p>Discover personalized cruise experiences tailored just for you</p>
      </header>

      <main className='App-main'>
        {showInterestSelector && (
          <InterestSelector
            onGetRecommendations={onGetRecommendations}
            loading={loading}
          />
        )}

        {error && (
          <div className='error-message'>
            <p>❌ {error.message || 'Failed to get recommendations'}</p>
            <button
              onClick={onRetry}
              className='retry-btn'
              disabled={loading}
            >
              {loading ? '🔄 Retrying...' : '🔄 Retry'}
            </button>
          </div>
        )}

        {data?.success &&
          data.recommendations &&
          typeof data.recommendations === 'object' && (
            <RecommendationsList
              recommendations={data.recommendations}
              onChangeInterests={onChangeInterests}
              loading={loading}
            />
          )}
      </main>

      <footer className='App-footer'>
        <p>Version 3.3.0 - Comprehensive Testing & Enhanced Database</p>
      </footer>
    </div>
  );
}; 