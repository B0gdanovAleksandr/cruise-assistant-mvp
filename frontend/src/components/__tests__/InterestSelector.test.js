import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InterestSelector from '../InterestSelector';

describe('InterestSelector', () => {
  const mockOnGetRecommendations = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all interest options', () => {
    render(<InterestSelector onGetRecommendations={mockOnGetRecommendations} loading={false} />);
    
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText('Culture')).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
  });

  it('allows selecting interests', () => {
    render(<InterestSelector onGetRecommendations={mockOnGetRecommendations} loading={false} />);
    
    const adventureButton = screen.getByText('Adventure');
    fireEvent.click(adventureButton);
    
    expect(adventureButton).toHaveClass('selected');
  });

  it('allows deselecting interests', () => {
    render(<InterestSelector onGetRecommendations={mockOnGetRecommendations} loading={false} />);
    
    const adventureButton = screen.getByText('Adventure');
    fireEvent.click(adventureButton);
    fireEvent.click(adventureButton);
    
    expect(adventureButton).not.toHaveClass('selected');
  });

  it('shows validation alert for incomplete form', () => {
    window.alert = jest.fn();
    
    render(<InterestSelector onGetRecommendations={mockOnGetRecommendations} loading={false} />);
    
    const submitButton = screen.getByText('🎯 Get My Recommendations');
    fireEvent.click(submitButton);
    
    expect(window.alert).toHaveBeenCalledWith(
      'Please select at least one interest, location, and budget'
    );
    expect(mockOnGetRecommendations).not.toHaveBeenCalled();
  });

  it('submits form with valid data', () => {
    render(<InterestSelector onGetRecommendations={mockOnGetRecommendations} loading={false} />);
    
    // Select interest
    fireEvent.click(screen.getByText('Adventure'));
    
    // Select location
    const locationSelect = screen.getByDisplayValue('');
    fireEvent.change(locationSelect, { target: { value: 'Mediterranean' } });
    
    // Select budget
    const budgetRadio = screen.getByLabelText('Moderate ($$)');
    fireEvent.click(budgetRadio);
    
    // Submit form
    const submitButton = screen.getByText('🎯 Get My Recommendations');
    fireEvent.click(submitButton);
    
    expect(mockOnGetRecommendations).toHaveBeenCalledWith({
      interests: ['Adventure'],
      location: 'Mediterranean',
      budget: 'moderate'
    });
  });

  it('disables submit button when loading', () => {
    render(<InterestSelector onGetRecommendations={mockOnGetRecommendations} loading={true} />);
    
    const submitButton = screen.getByText('🔄 Getting Recommendations...');
    expect(submitButton).toBeDisabled();
  });
});