const QlooClient = require('../src/services/qlooClient');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('QlooClient Fallback Logic', () => {
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

  describe('getRecommendations - No API Key', () => {
    test('should return fallback data when QLOO_API_KEY is not provided', async () => {
      // Arrange
      delete process.env.QLOO_API_KEY;
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Act
      const result = await qlooClient.getRecommendations(interests);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(result.recommendations).toHaveLength(5);
      expect(result.recommendations[0]).toHaveProperty('id');
      expect(result.recommendations[0]).toHaveProperty('name');
      expect(result.recommendations[0]).toHaveProperty('description');
    });
  });

  describe('getRecommendations - Invalid Response Format', () => {
    test('should return fallback data when API response has invalid format', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Mock searchEntities to return entity IDs
      qlooClient.searchEntities = jest.fn().mockResolvedValue(['entity_1', 'entity_2']);
      
      // Mock axios to return invalid response format
      axios.get.mockResolvedValue({
        data: {
          invalid_field: 'some data',
          // Missing 'results' array
        }
      });
      
      // Act
      const result = await qlooClient.getRecommendations(interests);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should return fallback data when API response has results but not an array', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Mock axios to return results as string instead of array
      axios.get.mockResolvedValue({
        data: {
          results: 'not an array'
        }
      });
      
      // Act
      const result = await qlooClient.getRecommendations(interests);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
    });
  });

  describe('getRecommendations - API Error', () => {
    test('should return fallback data when API request fails with network error', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Mock axios to throw network error
      axios.get.mockRejectedValue(new Error('Network Error'));
      
      // Act
      const result = await qlooClient.getRecommendations(interests);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
    });

    test('should return fallback data when API returns 429 rate limit error', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Mock axios to throw 429 error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.response = { status: 429 };
      axios.get.mockRejectedValue(rateLimitError);
      
      // Act
      const result = await qlooClient.getRecommendations(interests);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
    });

    test('should return fallback data when API returns 500 server error', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Mock axios to throw 500 error
      const serverError = new Error('Internal Server Error');
      serverError.response = { status: 500 };
      axios.get.mockRejectedValue(serverError);
      
      // Act
      const result = await qlooClient.getRecommendations(interests);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
    });
  });

  describe('getRecommendations - Successful API Response', () => {
    test('should return real data without fallback flag when API call succeeds', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      const interests = ['music', 'food'];
      
      // Mock searchEntities to return entity IDs
      qlooClient.searchEntities = jest.fn().mockResolvedValue(['entity_1', 'entity_2']);
      
      // Mock axios to return valid response
      axios.get.mockResolvedValue({
        data: {
          results: [
            {
              id: 'api_entity_1',
              name: 'API Test Entity',
              description: 'Test description',
              categories: ['test'],
              relevance_score: 0.8
            }
          ]
        }
      });
      
      // Act
      const result = await qlooClient.getRecommendations(interests);
      
      // Assert
      expect(result.metadata.fallback).toBe(false);
      expect(result.metadata.source).toBe('qloo');
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].name).toBe('API Test Entity');
    });
  });

  describe('getRecommendations - Edge Cases', () => {
    test('should return fallback data when no entity IDs provided', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      
      // Act
      const result = await qlooClient.getRecommendations([]);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
    });

    test('should return fallback data when entity IDs is null', async () => {
      // Arrange
      process.env.QLOO_API_KEY = 'test-api-key';
      qlooClient = new QlooClient();
      
      // Act
      const result = await qlooClient.getRecommendations(null);
      
      // Assert
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
    });
  });
}); 