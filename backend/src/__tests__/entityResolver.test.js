/**
 * Entity Resolver Service Tests
 */

const EntityResolver = require('../services/entityResolver');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('Entity Resolver Service', () => {
  let entityResolver;

  beforeEach(() => {
    // Create a fresh instance for each test
    entityResolver = new (require('../services/entityResolver').constructor)();
    jest.clearAllMocks();
    
    // Clear URN registry cache for each test
    const urnRegistry = require('../services/urnRegistry');
    urnRegistry.cache.clear();
  });

  describe('Entity Resolution', () => {
    test('should resolve entities from user input successfully', async () => {
      entityResolver.apiKey = 'test-key'; // Ensure API key is set
      const userInput = ['jazz', 'italian food'];
      const mockResponse = {
        data: {
          entities: [
            {
              urn: 'urn:tag:genre:jazz',
              name: 'Jazz Music',
              type: 'tag',
              confidence: 0.8
            },
            {
              urn: 'urn:tag:cuisine:italian',
              name: 'Italian Cuisine',
              type: 'tag',
              confidence: 0.9
            }
          ]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await entityResolver.resolveEntities(userInput);

      expect(result.entities).toHaveLength(2);
      expect(result.metadata.resolved).toBe(true);
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(axios.post).toHaveBeenCalled();
    });

    test('should handle empty user input', async () => {
      const result = await entityResolver.resolveEntities([]);

      expect(result.entities).toHaveLength(0);
      expect(result.metadata.resolved).toBe(false);
      expect(result.metadata.reason).toBe('No user input provided');
    });

    test('should use fallback resolution when API key is not available', async () => {
      entityResolver.apiKey = null;
      const userInput = ['jazz', 'italian food'];

      const result = await entityResolver.resolveEntities(userInput);

      expect(result.entities).toHaveLength(2);
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.resolved).toBe(false);
      expect(result.entities[0].source).toBe('fallback');
    });

    test('should handle API errors gracefully', async () => {
      const userInput = ['jazz'];
      axios.post.mockRejectedValueOnce(new Error('API Error'));

      const result = await entityResolver.resolveEntities(userInput);

      expect(result.entities).toHaveLength(1);
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.resolved).toBe(false);
    });
  });

  describe('Entity Validation', () => {
    test('should validate resolved entities correctly', () => {
      const entities = [
        {
          urn: 'urn:tag:genre:jazz',
          name: 'Jazz Music',
          confidence: 0.8
        },
        {
          urn: 'invalid:urn',
          name: 'Invalid Entity',
          confidence: 0.3
        },
        {
          name: 'Missing URN',
          confidence: 0.5
        }
      ];

      const validated = entityResolver._validateResolvedEntities(entities);

      expect(validated).toHaveLength(1);
      expect(validated[0].urn).toBe('urn:tag:genre:jazz');
    });

    test('should filter entities below confidence threshold', () => {
      const entities = [
        {
          urn: 'urn:tag:genre:jazz',
          name: 'Jazz Music',
          confidence: 0.8
        },
        {
          urn: 'urn:tag:genre:rock',
          name: 'Rock Music',
          confidence: 0.2 // Below low threshold
        }
      ];

      const validated = entityResolver._validateResolvedEntities(entities);

      expect(validated).toHaveLength(1);
      expect(validated[0].name).toBe('Jazz Music');
    });
  });

  describe('URN Resolution', () => {
    test('should resolve entity by URN successfully', async () => {
      const urn = 'urn:tag:genre:jazz';
      const mockResponse = {
        data: {
          name: 'Jazz Music',
          type: 'tag',
          metadata: { genre: 'jazz' }
        }
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await entityResolver.resolveEntityByURN(urn);

      expect(result).toBeTruthy();
      expect(result.urn).toBe(urn);
      expect(result.name).toBe('Jazz Music');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/entities/'),
        expect.any(Object)
      );
    });

    test('should return null for invalid URN', async () => {
      const result = await entityResolver.resolveEntityByURN('invalid:urn');

      expect(result).toBeNull();
    });

    test('should handle API errors for URN resolution', async () => {
      const urn = 'urn:tag:genre:jazz';
      axios.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await entityResolver.resolveEntityByURN(urn);

      expect(result).toBeNull();
    });
  });

  describe('Batch URN Resolution', () => {
    test('should batch resolve multiple URNs', async () => {
      const urns = [
        'urn:tag:genre:jazz',
        'urn:tag:cuisine:italian'
      ];

      const mockResponses = [
        { data: { name: 'Jazz Music' } },
        { data: { name: 'Italian Cuisine' } }
      ];

      axios.get
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);

      const results = await entityResolver.batchResolveURNs(urns);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Jazz Music');
      expect(results[1].name).toBe('Italian Cuisine');
    });

    test('should filter out invalid URNs in batch', async () => {
      const urns = [
        'urn:tag:genre:jazz',
        'invalid:urn',
        'urn:tag:cuisine:italian'
      ];

      const mockResponses = [
        { data: { name: 'Jazz Music' } },
        { data: { name: 'Italian Cuisine' } }
      ];

      axios.get
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);

      const results = await entityResolver.batchResolveURNs(urns);

      expect(results).toHaveLength(2);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('should handle empty URN array', async () => {
      const results = await entityResolver.batchResolveURNs([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('Confidence Calculation', () => {
    test('should calculate overall confidence correctly', () => {
      const entities = [
        { confidence: 0.8 },
        { confidence: 0.6 },
        { confidence: 0.9 }
      ];

      const confidence = entityResolver._calculateOverallConfidence(entities);

      expect(confidence).toBeCloseTo(0.77, 2);
    });

    test('should return 0 for empty entities array', () => {
      const confidence = entityResolver._calculateOverallConfidence([]);

      expect(confidence).toBe(0);
    });
  });

  describe('Fallback Resolution', () => {
    test('should create fallback entities correctly', () => {
      const userInput = ['jazz music', 'italian food'];
      const result = entityResolver._fallbackResolution(userInput);

      expect(result.entities).toHaveLength(2);
      expect(result.metadata.fallback).toBe(true);
      expect(result.metadata.resolved).toBe(false);
      expect(result.entities[0].urn).toContain('fallback');
      expect(result.entities[0].confidence).toBe(0.5);
    });
  });

  describe('Statistics', () => {
    test('should return correct statistics', () => {
      const stats = entityResolver.getStats();

      expect(stats).toHaveProperty('supportedTypes');
      expect(stats).toHaveProperty('confidenceThresholds');
      expect(stats).toHaveProperty('hasApiKey');
      expect(stats).toHaveProperty('baseURL');
      expect(Array.isArray(stats.supportedTypes)).toBe(true);
      expect(typeof stats.confidenceThresholds).toBe('object');
    });
  });
}); 