import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecommendationsList from '../RecommendationsList';

describe('RecommendationsList', () => {
  const mockOnChangeInterests = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no recommendations', () => {
    render(
      <RecommendationsList 
        recommendations={{ recommendations: [] }}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('No recommendations found. Try adjusting your preferences.')).toBeInTheDocument();
  });

  it('renders recommendations with basic data', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          name: 'Sunset Cruise',
          description: 'Beautiful evening cruise',
          rating: 4.5,
          price_range: '$100-200',
          location: 'Mediterranean',
          duration: '2 hours'
        }
      ]
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('✨ Your Personalized Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Sunset Cruise')).toBeInTheDocument();
    expect(screen.getByText('Beautiful evening cruise')).toBeInTheDocument();
  });

  it('renders RAG recommendations with source attribution', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          title: 'Evening Jazz Experience',
          description: 'Perfect for culture enthusiasts',
          timing: '7:00 PM - 9:00 PM',
          originEventId: 'event_001',
          personalizedAdvice: 'Arrive early to secure the best seats'
        }
      ],
      ragSources: [
        {
          id: 'event_001',
          title: 'Live Jazz Evening',
          type: 'entertainment',
          experienceAffinity: 'relaxation'
        }
      ]
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('Evening Jazz Experience')).toBeInTheDocument();
    expect(screen.getByText('Perfect for culture enthusiasts')).toBeInTheDocument();
    expect(screen.getByText(/Based on: Live Jazz Evening from RAG/)).toBeInTheDocument();
    expect(screen.getByText(/⏰ Timing: 7:00 PM - 9:00 PM/)).toBeInTheDocument();
    expect(screen.getByText(/💡 Advice: Arrive early to secure the best seats/)).toBeInTheDocument();
  });

  it('displays RAG sources section when ragSources are available', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          title: 'Evening Jazz Experience',
          description: 'Perfect for culture enthusiasts',
          originEventId: 'event_001'
        }
      ],
      ragSources: [
        {
          id: 'event_001',
          title: 'Live Jazz Evening',
          type: 'entertainment',
          experienceAffinity: 'relaxation'
        },
        {
          id: 'event_002',
          title: 'Sunset Yoga Class',
          type: 'activity',
          experienceAffinity: 'wellness'
        }
      ]
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('📚 RAG Sources')).toBeInTheDocument();
    expect(screen.getByText('Live Jazz Evening')).toBeInTheDocument();
    expect(screen.getByText('Sunset Yoga Class')).toBeInTheDocument();
    expect(screen.getByText('(entertainment)')).toBeInTheDocument();
    expect(screen.getByText('(activity)')).toBeInTheDocument();
    expect(screen.getByText('• relaxation')).toBeInTheDocument();
    expect(screen.getByText('• wellness')).toBeInTheDocument();
  });

  it('displays RAG information text when ragSources are available', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          title: 'Evening Jazz Experience',
          description: 'Perfect for culture enthusiasts',
          originEventId: 'event_001'
        }
      ],
      ragSources: [
        {
          id: 'event_001',
          title: 'Live Jazz Evening',
          type: 'entertainment'
        }
      ]
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('ℹ️ Information is based on real cruise events, retrieved via RAG.')).toBeInTheDocument();
  });

  it('does not display RAG sections when no ragSources are available', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          name: 'Sunset Cruise',
          description: 'Beautiful evening cruise'
        }
      ]
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.queryByText('📚 RAG Sources')).not.toBeInTheDocument();
    expect(screen.queryByText('ℹ️ Information is based on real cruise events, retrieved via RAG.')).not.toBeInTheDocument();
  });

  it('renders AI insights when available', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          name: 'Sunset Cruise',
          description: 'Beautiful evening cruise'
        }
      ],
      aiInsights: {
        summary: 'Great recommendations for your preferences',
        personalizedAdvice: ['Book early for best rates'],
        budgetTips: ['Consider off-peak times'],
        bestTimes: ['Evening hours']
      }
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('🤖 AI Insights')).toBeInTheDocument();
    expect(screen.getByText('📋 Summary')).toBeInTheDocument();
    expect(screen.getByText('Great recommendations for your preferences')).toBeInTheDocument();
    expect(screen.getByText('💡 Personalized Advice')).toBeInTheDocument();
    expect(screen.getByText('Book early for best rates')).toBeInTheDocument();
  });

  it('renders change interests button', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          name: 'Sunset Cruise',
          description: 'Beautiful evening cruise'
        }
      ]
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('✏️ Change Interests')).toBeInTheDocument();
  });

  it('handles missing or malformed recommendation data gracefully', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          name: null,
          description: undefined,
          rating: 'invalid'
        }
      ]
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('No description available')).toBeInTheDocument();
  });

  it('handles RAG recommendations with missing source gracefully', () => {
    const recommendations = {
      recommendations: [
        {
          id: '1',
          title: 'Evening Jazz Experience',
          description: 'Perfect for culture enthusiasts',
          originEventId: 'non-existent-event'
        }
      ],
      ragSources: [
        {
          id: 'event_001',
          title: 'Live Jazz Evening',
          type: 'entertainment'
        }
      ]
    };

    render(
      <RecommendationsList 
        recommendations={recommendations}
        onChangeInterests={mockOnChangeInterests}
        loading={false}
      />
    );
    
    expect(screen.getByText('Evening Jazz Experience')).toBeInTheDocument();
    // Should not show RAG attribution since source doesn't exist
    expect(screen.queryByText(/Based on:/)).not.toBeInTheDocument();
  });
}); 