import React, { useState } from 'react';

const INTEREST_OPTIONS = [
  'Adventure', 'Culture', 'Dining', 'History', 'Nature', 
  'Relaxation', 'Romance', 'Shopping', 'Water Sports', 'Wellness'
];

const LOCATION_OPTIONS = [
  'Mediterranean', 'Caribbean', 'Alaska', 'Northern Europe', 
  'Asia', 'Australia', 'South America'
];

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget ($)' },
  { value: 'moderate', label: 'Moderate ($$)' },
  { value: 'luxury', label: 'Luxury ($$$)' }
];

function InterestSelector({ onGetRecommendations, loading }) {
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');

  const handleInterestToggle = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedInterests.length === 0 || !location || !budget) {
      alert('Please select at least one interest, location, and budget');
      return;
    }

    onGetRecommendations({
      interests: selectedInterests,
      location,
      budget
    });
  };

  return (
    <div className="interest-selector">
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>What interests you?</h3>
          <div className="interests-grid">
            {INTEREST_OPTIONS.map(interest => (
              <button
                key={interest}
                type="button"
                className={`interest-button ${
                  selectedInterests.includes(interest) ? 'selected' : ''
                }`}
                onClick={() => handleInterestToggle(interest)}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>Preferred Location</h3>
          <select 
            value={location} 
            onChange={(e) => setLocation(e.target.value)}
            className="location-select"
          >
            <option value="">Select a region</option>
            {LOCATION_OPTIONS.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div className="form-section">
          <h3>Budget Range</h3>
          <div className="budget-options">
            {BUDGET_OPTIONS.map(option => (
              <label key={option.value} className="budget-option">
                <input
                  type="radio"
                  name="budget"
                  value={option.value}
                  checked={budget === option.value}
                  onChange={(e) => setBudget(e.target.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          className="get-recommendations-btn"
          disabled={loading}
        >
          {loading ? '🔄 Getting Recommendations...' : '🎯 Get My Recommendations'}
        </button>
      </form>
    </div>
  );
}

export default InterestSelector;