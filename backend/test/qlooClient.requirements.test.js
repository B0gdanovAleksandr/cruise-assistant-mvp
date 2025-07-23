const QlooClient = require('../src/services/qlooClient');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('QlooClient Requirements', () => {
  let qlooClient;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.QLOO_API_KEY;
  });
  
  afterEach(() => {
    // Clean up
    delete process.env.QLOO_API_KEY;
  });

  describe('searchEntities', () => {
    test('should return empty array when no interests provided', async () => {
      // Arrange
      qlooClient = new QlooClient();
      
      // Act
      const result = await qlooClient.searchEntities([]);
      
      // Assert
      expect(result).toEqual([]);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should search entities for each interest and return unique IDs', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Mock axios to return valid search results
      axios.get.mockResolvedValue({
        data: {
          results: [
            { id: 'entity1', name: 'Music Entity 1' },
            { id: 'entity2', name: 'Music Entity 2' },
            { id: 'entity3', name: 'Food Entity 1' }
          ]
        }
      });
      
      // Act
      const result = await qlooClient.searchEntities(interests);
      
      // Assert
      expect(result).toEqual(['entity1', 'entity2', 'entity3']);
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/search?query=music'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('should handle API errors gracefully and return empty array', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music'];
      
      // Mock axios to throw error
      axios.get.mockRejectedValue(new Error('Network Error'));
      
      // Act
      const result = await qlooClient.searchEntities(interests);
      
      // Assert
      expect(result).toEqual([]);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should handle invalid response format and return empty array', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music'];
      
      // Mock axios to return invalid format
      axios.get.mockResolvedValue({
        data: {
          invalid_field: 'some data'
          // Missing 'results' array
        }
      });
      
      // Act
      const result = await qlooClient.searchEntities(interests);
      
      // Assert
      expect(result).toEqual([]);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should deduplicate entity IDs from multiple interests', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'jazz'];
      
      // Mock axios to return overlapping entities
      axios.get
        .mockResolvedValueOnce({
          data: {
            results: [
              { id: 'entity1', name: 'Music Entity' },
              { id: 'entity2', name: 'Jazz Entity' }
            ]
          }
        })
        .mockResolvedValueOnce({
          data: {
            results: [
              { id: 'entity2', name: 'Jazz Entity' }, // Duplicate
              { id: 'entity3', name: 'Another Jazz Entity' }
            ]
          }
        });
      
      // Act
      const result = await qlooClient.searchEntities(interests);
      
      // Assert
      expect(result).toEqual(['entity1', 'entity2', 'entity3']);
      expect(result.length).toBe(3); // No duplicates
    });
  });

  describe('getRecommendations', () => {
    test('should return fallback data when QLOO_API_KEY is not provided', async () => {
      // Arrange
      delete process.env.QLOO_API_KEY;
      qlooClient = new QlooClient();
      const entityIds = ['entity1', 'entity2'];
      
      // Act
      const result = await qlooClient.getRecommendations(entityIds);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(result.recommendations).toHaveLength(5);
      expect(result.recommendations[0].fallback).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should return fallback data when entity IDs array is empty', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      
      // Act
      const result = await qlooClient.getRecommendations([]);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(result.recommendations[0].fallback).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should return recommendations when API call succeeds', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const entityIds = ['entity1', 'entity2'];
      
      // Mock axios to return valid recommendations
      axios.get.mockResolvedValue({
        data: {
          results: [
            {
              name: 'Recommendation 1',
              type: 'restaurant',
              relevance_score: 0.95,
              metadata: { category: 'dining' }
            },
            {
              name: 'Recommendation 2',
              type: 'activity',
              score: 0.87,
              metadata: { category: 'entertainment' }
            }
          ]
        }
      });
      
      // Act
      const result = await qlooClient.getRecommendations(entityIds);
      
      // Assert
      expect(result.metadata.fallback).toBe(false);
      expect(result.metadata.source).toBe('qloo');
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0]).toEqual({
        name: 'Recommendation 1',
        type: 'restaurant',
        score: 0.95,
        metadata: { category: 'dining' }
      });
      expect(result.recommendations[1]).toEqual({
        name: 'Recommendation 2',
        type: 'activity',
        score: 0.87,
        metadata: { category: 'entertainment' }
      });
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/recs'),
        expect.objectContaining({
          params: {
            entity_ids: 'entity1,entity2',
            limit: 5,
            locale: 'en'
          }
        })
      );
    });

    test('should return fallback data when API response has empty results', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const entityIds = ['entity1', 'entity2'];
      
      // Mock axios to return empty results
      axios.get.mockResolvedValue({
        data: {
          results: []
        }
      });
      
      // Act
      const result = await qlooClient.getRecommendations(entityIds);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(result.recommendations[0].fallback).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should return fallback data when API response has invalid format', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const entityIds = ['entity1', 'entity2'];
      
      // Mock axios to return invalid format
      axios.get.mockResolvedValue({
        data: {
          invalid_field: 'some data'
          // Missing 'results' array
        }
      });
      
      // Act
      const result = await qlooClient.getRecommendations(entityIds);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(result.recommendations[0].fallback).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should return fallback data when API request fails', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const entityIds = ['entity1', 'entity2'];
      
      // Mock axios to throw error
      axios.get.mockRejectedValue(new Error('API connection failed'));
      
      // Act
      const result = await qlooClient.getRecommendations(entityIds);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(result.recommendations[0].fallback).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should handle rate limiting and return fallback data', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const entityIds = ['entity1', 'entity2'];
      
      // Mock axios to throw 429 error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.response = { status: 429 };
      axios.get.mockRejectedValue(rateLimitError);
      
      // Act
      const result = await qlooClient.getRecommendations(entityIds);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(result.recommendations[0].fallback).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration: searchEntities + getRecommendations', () => {
    test('should work together to provide recommendations from interests', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Mock searchEntities response
      axios.get
        .mockResolvedValueOnce({
          data: {
            results: [
              { id: 'music_entity1', name: 'Music Entity 1' },
              { id: 'food_entity1', name: 'Food Entity 1' }
            ]
          }
        })
        .mockResolvedValueOnce({
          data: {
            results: [
              { id: 'food_entity1', name: 'Food Entity 1' },
              { id: 'food_entity2', name: 'Food Entity 2' }
            ]
          }
        })
        .mockResolvedValueOnce({
          data: {
            results: [
              {
                name: 'Music Restaurant',
                type: 'restaurant',
                relevance_score: 0.9,
                metadata: { category: 'dining' }
              }
            ]
          }
        });
      
      // Act
      const entityIds = await qlooClient.searchEntities(interests);
      const recommendations = await qlooClient.getRecommendations(entityIds);
      
      // Assert
      expect(entityIds).toEqual(['music_entity1', 'food_entity1', 'food_entity2']);
      expect(recommendations.metadata.fallback).toBe(false);
      expect(recommendations.metadata.source).toBe('qloo');
      expect(recommendations.recommendations).toHaveLength(1);
      expect(axios.get).toHaveBeenCalledTimes(3);
    });
  });
}); 