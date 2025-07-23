const axios = require('axios');
const qlooClient = require('../services/qlooClient').instance;
const mockData = require('../mock/qlooMock.json');

// Mock axios
jest.mock('axios');

describe('QlooClient getRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return recommendations from API when results array is present', async () => {
    // Mock successful API response with results array
    const mockApiResponse = {
      data: {
        results: [
          {
            id: 'rec1',
            name: 'Cruise Adventure',
            type: 'activity',
            score: 0.95,
            description: 'Amazing cruise adventure',
            categories: ['adventure', 'cruise']
          },
          {
            id: 'rec2',
            name: 'Mediterranean Tour',
            type: 'tour',
            score: 0.85,
            description: 'Explore Mediterranean',
            categories: ['culture', 'history']
          }
        ]
      }
    };

    axios.get.mockResolvedValue(mockApiResponse);

    const entityIds = ['entity1', 'entity2'];
    const result = await qlooClient.getRecommendations(entityIds);

    // Check that axios was called with correct parameters
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/recommendations'),
      expect.objectContaining({
        params: {
          entity_ids: 'entity1,entity2',
          limit: 5,
          locale: expect.any(String)
        }
      })
    );

    // Check result structure
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata.source).toBe('qloo');
    expect(result.metadata.fallback).toBeUndefined();
    expect(result.recommendations).toHaveLength(2);
    
    // Check formatted recommendations
    expect(result.recommendations[0]).toHaveProperty('name', 'Cruise Adventure');
    expect(result.recommendations[0]).toHaveProperty('score', 0.95);
    expect(result.recommendations[0].metadata).toHaveProperty('categories');
  });

  it('should return fallback data when API response has invalid format', async () => {
    // Mock API response with missing results array
    const mockInvalidResponse = {
      data: {
        status: 'success',
        message: 'No results found'
        // No results array
      }
    };

    axios.get.mockResolvedValue(mockInvalidResponse);

    const entityIds = ['entity1', 'entity2'];
    const result = await qlooClient.getRecommendations(entityIds);

    // Check that fallback was used
    expect(result).toHaveProperty('metadata.fallback', true);
    expect(result).toHaveProperty('metadata.source', 'mock');
    expect(result).toHaveProperty('metadata.error');
  });

  it('should return fallback data when API request fails', async () => {
    // Mock API error
    axios.get.mockRejectedValue(new Error('API connection failed'));

    const entityIds = ['entity1', 'entity2'];
    const result = await qlooClient.getRecommendations(entityIds);

    // Check that fallback was used
    expect(result).toHaveProperty('metadata.fallback', true);
    expect(result).toHaveProperty('metadata.source', 'mock');
    expect(result).toHaveProperty('metadata.error', 'API connection failed');
  });

  it('should return fallback data when rate limit is exceeded', async () => {
    // Mock 429 rate limit error
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.response = { status: 429 };
    axios.get.mockRejectedValue(rateLimitError);

    const entityIds = ['entity1', 'entity2'];
    const result = await qlooClient.getRecommendations(entityIds);

    // Check that fallback was used
    expect(result).toHaveProperty('metadata.fallback', true);
    expect(result).toHaveProperty('metadata.source', 'mock');
  });

  it('should return mock data when no entity IDs are provided', async () => {
    const result = await qlooClient.getRecommendations([]);
    
    // Check that mock data was used
    expect(result).toHaveProperty('metadata.fallback', true);
    expect(result).toHaveProperty('metadata.source', 'mock');
    
    // Axios should not be called
    expect(axios.get).not.toHaveBeenCalled();
  });
});