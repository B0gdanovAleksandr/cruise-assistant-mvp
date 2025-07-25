import React, { useState } from 'react';
import { useRecommendationsPresenter } from './presenters/RecommendationsPresenter';
import { RecommendationsView } from './views/RecommendationsView';
import { UserPreferences } from './types/api';
import './App.css';

const App: React.FC = (): JSX.Element => {
  const [showInterestSelector, setShowInterestSelector] = useState<boolean>(true);

  // Use Presenter for recommendations logic
  const {
    onGetRecommendations,
    onRetry,
    onReset,
    data,
    loading,
    error,
  } = useRecommendationsPresenter();

  const handleGetRecommendations = async (preferences: UserPreferences): Promise<void> => {
    await onGetRecommendations(preferences);
    setShowInterestSelector(false);
  };

  const handleChangeInterests = (): void => {
    setShowInterestSelector(true);
    onReset(); // Reset mutation state
  };

  return (
    <RecommendationsView
      showInterestSelector={showInterestSelector}
              onGetRecommendations={handleGetRecommendations}
                onChangeInterests={handleChangeInterests}
      onRetry={onRetry}
      data={data}
                loading={loading}
      error={error}
              />
  );
};

export default App;