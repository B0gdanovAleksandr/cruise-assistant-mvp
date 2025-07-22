import React from 'react';

function RecommendationsList({ recommendations }) {
  const recs = recommendations.recommendations || [];

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
      
      {recommendations.insights && (
        <div className="ai-insights">
          <h3>🤖 AI Insights</h3>
          <p>{recommendations.insights}</p>
        </div>
      )}
      
      <div className="recommendations-grid">
        {recs.map(rec => (
          <div key={rec.id} className="recommendation-card">
            <div className="rec-header">
              <h3>{rec.name}</h3>
              <div className="rec-rating">⭐ {rec.rating}</div>
            </div>
            
            <p className="rec-description">{rec.description}</p>
            
            <div className="rec-details">
              <div className="rec-detail">
                <strong>Duration:</strong> {rec.duration}
              </div>
              <div className="rec-detail">
                <strong>Price:</strong> {rec.price_range}
              </div>
              <div className="rec-detail">
                <strong>Location:</strong> {rec.location}
              </div>
            </div>
            
            {rec.highlights && (
              <div className="rec-highlights">
                <strong>Highlights:</strong>
                <ul>
                  {rec.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="rec-categories">
              {rec.categories.map(category => (
                <span key={category} className="category-tag">
                  {category}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendationsList;