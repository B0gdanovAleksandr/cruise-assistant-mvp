import React from 'react';
import GeneratedActivitiesList from './GeneratedActivitiesList';

function RecommendationsList({ recommendations, onChangeInterests, loading }) {
  const recs = recommendations.recommendations || [];

  // Debug logging
  console.log('RecommendationsList received:', { recommendations, recs });

  if (recs.length === 0) {
    return (
      <div className="recommendations-empty">
        <p>No recommendations found. Try adjusting your preferences.</p>
      </div>
    );
  }

  return (
    <div className="recommendations-list">
      <h2>✨ Your Personalized Recommendations</h2>
      
      {recommendations.aiInsights && (
        <div className="ai-insights">
          <h3>🤖 AI Insights</h3>
          
          {recommendations.aiInsights.summary && (
            <div className="ai-summary">
              <h4>📋 Summary</h4>
              <p>{typeof recommendations.aiInsights.summary === 'string' ? 
                  recommendations.aiInsights.summary : 
                  JSON.stringify(recommendations.aiInsights.summary)}</p>
            </div>
          )}
          
          {recommendations.aiInsights.personalizedAdvice && recommendations.aiInsights.personalizedAdvice.length > 0 && (
            <div className="ai-advice">
              <h4>💡 Personalized Advice</h4>
              <ul>
                {recommendations.aiInsights.personalizedAdvice.map((advice, index) => {
                  // Ensure advice is a string
                  const adviceStr = typeof advice === 'string' ? advice : 
                                   typeof advice === 'object' ? JSON.stringify(advice) : 
                                   String(advice);
                  return (
                    <li key={index}>{adviceStr}</li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {recommendations.aiInsights.budgetTips && recommendations.aiInsights.budgetTips.length > 0 && (
            <div className="ai-budget">
              <h4>💰 Budget Tips</h4>
              <ul>
                {recommendations.aiInsights.budgetTips.map((tip, index) => {
                  // Ensure tip is a string
                  const tipStr = typeof tip === 'string' ? tip : 
                                typeof tip === 'object' ? JSON.stringify(tip) : 
                                String(tip);
                  return (
                    <li key={index}>{tipStr}</li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {recommendations.aiInsights.bestTimes && recommendations.aiInsights.bestTimes.length > 0 && (
            <div className="ai-timing">
              <h4>⏰ Best Times</h4>
              <ul>
                {recommendations.aiInsights.bestTimes.map((time, index) => {
                  // Ensure time is a string
                  const timeStr = typeof time === 'string' ? time : 
                                 typeof time === 'object' ? JSON.stringify(time) : 
                                 String(time);
                  return (
                    <li key={index}>{timeStr}</li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="recommendations-grid">
        {recs.map(rec => {
          // Debug logging for each recommendation
          console.log('Rendering recommendation:', rec);
          
          return (
            <div key={rec.id} className="recommendation-card">
              <div className="rec-header">
                <h3>{typeof rec.name === 'string' ? rec.name : 
                     typeof rec.name === 'object' ? JSON.stringify(rec.name) : 
                     String(rec.name || 'Unknown')}</h3>
                <div className="rec-rating">⭐ {String(rec.rating || 0)}</div>
              </div>
              
              <p className="rec-description">{typeof rec.description === 'string' ? rec.description : 
                                           typeof rec.description === 'object' ? JSON.stringify(rec.description) : 
                                           String(rec.description || 'No description available')}</p>
              
              <div className="rec-details">
                <div className="rec-detail">
                  <strong>Duration:</strong> {typeof rec.duration === 'string' ? rec.duration : 
                                            typeof rec.duration === 'object' ? JSON.stringify(rec.duration) : 
                                            String(rec.duration || 'Not specified')}
                </div>
                <div className="rec-detail">
                  <strong>Price:</strong> {typeof rec.price_range === 'string' ? rec.price_range : 
                                         typeof rec.price_range === 'object' ? JSON.stringify(rec.price_range) : 
                                         String(rec.price_range || 'Not specified')}
                </div>
                <div className="rec-detail">
                  <strong>Location:</strong> {typeof rec.location === 'string' ? rec.location : 
                                            typeof rec.location === 'object' ? JSON.stringify(rec.location) : 
                                            String(rec.location || 'Not specified')}
                </div>
              </div>
              
              {rec.highlights && rec.highlights.length > 0 && (
                <div className="rec-highlights">
                  <strong>Highlights:</strong>
                  <ul>
                    {rec.highlights.map((highlight, index) => {
                      // Ensure highlight is a string
                      const highlightStr = typeof highlight === 'string' ? highlight : 
                                         typeof highlight === 'object' ? JSON.stringify(highlight) : 
                                         String(highlight);
                      return (
                        <li key={index}>{highlightStr}</li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {rec.categories && rec.categories.length > 0 && (
                <div className="rec-categories">
                  {rec.categories.map((category, catIndex) => {
                    // Ensure category is a string
                    const categoryStr = typeof category === 'string' ? category : 
                                      typeof category === 'object' ? JSON.stringify(category) : 
                                      String(category);
                    return (
                      <span key={catIndex} className="category-tag">
                        {categoryStr}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="action-buttons">
        <button onClick={onChangeInterests} className="change-interests-btn">
          ✏️ Change Interests
        </button>
      </div>

      <GeneratedActivitiesList generatedActivities={recommendations.generatedActivities} />
    </div>
  );
}

export default RecommendationsList;