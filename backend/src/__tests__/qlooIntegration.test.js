const axios = require('axios');
const qlooClient = require('../services/qlooClient').instance;
const mockData = require('../mock/qlooMock.json');

// Mock axios
jest.mock('axios');

describe('Qloo API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchEntities', () => {
    it('should return empty array when no interests provided', async () => {
      const result = await qlooClient.searchEntities([]);
      expect(result).toEqual([]);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should extract entity IDs from results array', async () => {
      // Mock successful API response with results array
      const mockResponse = {
        data: {
          results: [
            { entity_id: 'entity1', name: 'Entity 1' },
            { entity_id: 'entity2', name: 'Entity 2' }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await qlooClient.searchEntities(['cruise']);
      
      expect(result).toEqual(['entity1', 'entity2']);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          headers: expect.any(Object),
          timeout: expect.any(Number)
        })
      );
    });

    it('should handle missing results array', async () => {
      // Mock API response with missing results array
      const mockResponse = {
        data: {
          status: 'success',
          message: 'No results found'
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await qlooClient.searchEntities(['cruise']);
      
      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));

      const result = await qlooClient.searchEntities(['cruise']);
      
      expect(result).toEqual([]);
    });

    it('should deduplicate entity IDs from multiple interests', async () => {
      // Mock responses for two different interests
      const mockResponse1 = {
        data: {
          results: [
            { entity_id: 'entity1', name: 'Entity 1' },
            { entity_id: 'entity2', name: 'Entity 2' }
          ]
        }
      };
      
      const mockResponse2 = {
        data: {
          results: [
            { entity_id: 'entity2', name: 'Entity 2' },
            { entity_id: 'entity3', name: 'Entity 3' }
          ]
        }
      };
      
      axios.get.mockResolvedValueOnce(mockResponse1);
      axios.get.mockResolvedValueOnce(mockResponse2);
      
      const result = await qlooClient.searchEntities(['cruise', 'travel']);
      
      expect(result).toContain('entity1');
      expect(result).toContain('entity2');
      expect(result).toContain('entity3');
      expect(result.length).toBe(3); // Deduplication should work
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations from API when results array is present', async () => {
      // Mock successful API response with results array
      const mockResponse = {
        data: {
          results: [
            {
              id: 'rec1',
              name: 'Cruise Adventure',
              type: 'activity',
              relevance_score: 0.95,
              description: 'Amazing cruise adventure',
              categories: ['adventure', 'cruise']
            },
            {
              id: 'rec2',
              name: 'Mediterranean Tour',
              type: 'tour',
              relevance_score: 0.85,
              description: 'Explore Mediterranean',
              categories: ['culture', 'history']
            }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const entityIds = ['entity1', 'entity2'];
      const result = await qlooClient.getRecommendations(entityIds);

      // Check that axios was called with correct parameters
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
      const mockResponse = {
        data: {
          status: 'success',
          message: 'No results found'
          // No results array
        }
      };

      axios.get.mockResolvedValue(mockResponse);

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
});