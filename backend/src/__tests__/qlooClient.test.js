const axios = require('axios');
const qlooClient = require('../services/qlooClient').instance;
const mockData = require('../mock/qlooMock.json');

// Mock axios
jest.mock('axios');

describe('QlooClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Force API mode for tests that expect real API calls
    qlooClient.apiKey = 'test-api-key';
    qlooClient.useMock = false;
  });

  describe('searchEntities', () => {
    it('should return empty array when no interests provided', async () => {
      const result = await qlooClient.searchEntities([]);
      expect(result).toEqual([]);
    });

    it('should return mock entity IDs when API key is not available', async () => {
      // Force mock mode
      const originalApiKey = qlooClient.apiKey;
      qlooClient.apiKey = null;
      qlooClient.useMock = true;

      const result = await qlooClient.searchEntities(['adventure', 'dining']);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('mock_entity_');
      
      // Restore
      qlooClient.apiKey = originalApiKey;
      qlooClient.useMock = !qlooClient.apiKey;
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));
      
      const result = await qlooClient.searchEntities(['adventure']);
      
      expect(result).toEqual([]);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should extract entity IDs from API response', async () => {
      const mockResponse = {
        data: {
          results: [
            { id: 'entity1', name: 'Entity 1' },
            { id: 'entity2', name: 'Entity 2' }
          ]
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);
      
      const result = await qlooClient.searchEntities(['adventure']);
      
      expect(result).toEqual(['entity1', 'entity2']);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate entity IDs from multiple interests', async () => {
      const mockResponse1 = {
        data: {
          results: [
            { id: 'entity1', name: 'Entity 1' },
            { id: 'entity2', name: 'Entity 2' }
          ]
        }
      };
      
      const mockResponse2 = {
        data: {
          results: [
            { id: 'entity2', name: 'Entity 2' },
            { id: 'entity3', name: 'Entity 3' }
          ]
        }
      };
      
      axios.get.mockResolvedValueOnce(mockResponse1);
      axios.get.mockResolvedValueOnce(mockResponse2);
      
      const result = await qlooClient.searchEntities(['adventure', 'dining']);
      
      expect(result).toEqual(['entity1', 'entity2', 'entity3']);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRecommendations', () => {
    it('should return fallback data when no entity IDs provided', async () => {
      const result = await qlooClient.getRecommendations([]);
      
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(result.recommendations).toHaveLength(5);
    });

    it('should return mock recommendations when API key is not available', async () => {
      // Force mock mode
      const originalApiKey = qlooClient.apiKey;
      qlooClient.apiKey = null;
      qlooClient.useMock = true;

      const result = await qlooClient.getRecommendations(['entity1', 'entity2']);
      
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      
      // Restore
      qlooClient.apiKey = originalApiKey;
      qlooClient.useMock = !qlooClient.apiKey;
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));
      
      const result = await qlooClient.getRecommendations(['entity1']);
      
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.source).toBe('mock');
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should format recommendations from API response', async () => {
      const mockResponse = {
        data: {
          results: [
            { 
              id: 'rec1', 
              name: 'Recommendation 1',
              type: 'activity',
              relevance_score: 0.95,
              description: 'Test description'
            },
            { 
              id: 'rec2', 
              name: 'Recommendation 2',
              score: 0.85,
              metadata: { categories: ['adventure'] }
            }
          ]
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);
      
      const result = await qlooClient.getRecommendations(['entity1']);
      
      expect(result.metadata.source).toBe('qloo');
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].name).toBe('Recommendation 1');
      expect(result.recommendations[0].score).toBe(0.95);
      expect(result.recommendations[1].name).toBe('Recommendation 2');
      expect(result.recommendations[1].metadata.categories).toEqual(['adventure']);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });
});