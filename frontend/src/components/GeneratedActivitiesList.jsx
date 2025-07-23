import React from 'react';

function GeneratedActivitiesList({ generatedActivities }) {
  // Debug logging
  console.log('GeneratedActivitiesList received:', generatedActivities);

  if (!generatedActivities || !generatedActivities.recommendations || generatedActivities.recommendations.length === 0) {
    return null;
  }

  const activities = generatedActivities.recommendations;

  // Helper function to safely convert to string
  const safeString = (value) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      console.warn('Attempting to render object as string:', value);
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="generated-activities">
      <h3>🎯 AI-Generated Activities</h3>
      <p className="activities-subtitle">Personalized suggestions based on your interests</p>
      
      <div className="activities-grid">
        {activities.map((activity, index) => {
          // Debug logging for each activity
          console.log('Rendering activity:', activity);
          
          // Ensure all fields are strings
          const title = safeString(activity.title || 'Unknown Activity');
          const description = safeString(activity.description || 'No description available');
          const emoji = safeString(activity.emoji || '🎯');
          
          return (
            <div key={index} className="activity-card">
              <div className="activity-header">
                <span className="activity-emoji">{emoji}</span>
                <h4>{title}</h4>
              </div>
              <p className="activity-description">{description}</p>
              {activity.fallback && (
                <div className="fallback-indicator">
                  <span className="fallback-badge">🔄 Fallback</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GeneratedActivitiesList; 