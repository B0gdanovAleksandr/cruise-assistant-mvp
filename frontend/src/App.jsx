import React, { useState } from 'react';
import InterestSelector from './components/InterestSelector';
import RecommendationsList from './components/RecommendationsList';
import './App.css';

function App() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastPreferences, setLastPreferences] = useState(null);
  const [showInterestSelector, setShowInterestSelector] = useState(true);

  const handleGetRecommendations = async (preferences) => {
    setLoading(true);
    setError(null);
    setLastPreferences(preferences);
    setShowInterestSelector(false);
    
    console.log('Sending request with preferences:', preferences);
    
    try {
      const response = await fetch('/testRAG', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userPrefs: preferences }),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        // Передаем весь объект recommendations
        setRecommendations(data.recommendations);
      } else {
        setError(data.error || 'Failed to get recommendations');
      }
    } catch (err) {
      console.error('Request error:', err);
      setError(`Network error: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeInterests = () => {
    setShowInterestSelector(true);
    setRecommendations([]);
    setError(null);
  };

  const handleRetry = () => {
    console.log('Retry clicked, lastPreferences:', lastPreferences);
    if (lastPreferences) {
      handleGetRecommendations(lastPreferences);
    } else {
      console.warn('No lastPreferences available for retry');
      setError('No previous request to retry. Please select interests first.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚢 Cruise Personal Assistant</h1>
        <p>Discover personalized cruise experiences tailored just for you</p>
      </header>
      
      <main className="App-main">
        {showInterestSelector && (
          <InterestSelector 
            onGetRecommendations={handleGetRecommendations}
            loading={loading}
          />
        )}
        
        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={handleRetry} className="retry-btn" disabled={loading}>
              {loading ? '🔄 Retrying...' : '🔄 Retry'}
            </button>
          </div>
        )}
        
        {recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 && (
          <RecommendationsList 
            recommendations={recommendations}
            onChangeInterests={handleChangeInterests}
            loading={loading}
          />
        )}
      </main>
    </div>
  );
}

export default App;
