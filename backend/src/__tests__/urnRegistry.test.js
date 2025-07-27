/**
 * URN Registry Service Tests
 */

const URNRegistry = require('../services/urnRegistry');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('URN Registry Service', () => {
  let urnRegistry;

  beforeEach(() => {
    // Create a fresh instance for each test
    urnRegistry = new (require('../services/urnRegistry').constructor)();
    jest.clearAllMocks();
  });

  describe('URN Validation', () => {
    test('should validate correct URN formats', () => {
      const validURNs = [
        'urn:brand:company:apple',
        'urn:place:city:newyork',
        'urn:tag:genre:music',
        'urn:audience:demographic:millennials',
        'urn:type:activity:entertainment'
      ];

      validURNs.forEach(urn => {
        expect(urnRegistry.validateURN(urn)).toBe(true);
      });
    });

    test('should reject invalid URN formats', () => {
      const invalidURNs = [
        'invalid:format',
        'urn:invalid',
        'urn:brand:',
        'urn:brand:company',
        'urn:brand:company:',
        '',
        null,
        undefined
      ];

      invalidURNs.forEach(urn => {
        expect(urnRegistry.validateURN(urn)).toBe(false);
      });
    });

    test('should identify URN types correctly', () => {
      expect(urnRegistry.getURNType('urn:brand:company:apple')).toBe('brand');
      expect(urnRegistry.getURNType('urn:place:city:newyork')).toBe('place');
      expect(urnRegistry.getURNType('urn:tag:genre:music')).toBe('tag');
      expect(urnRegistry.getURNType('urn:audience:demographic:millennials')).toBe('audience');
      expect(urnRegistry.getURNType('urn:type:activity:entertainment')).toBe('type');
      expect(urnRegistry.getURNType('invalid:format')).toBe(null);
    });
  });

  describe('Registry Management', () => {
    test('should load default registry when no API key', async () => {
      urnRegistry.apiKey = null;
      
      await urnRegistry.initialize();
      
      expect(urnRegistry.audiences.size).toBeGreaterThan(0);
      expect(urnRegistry.tags.size).toBeGreaterThan(0);
      expect(urnRegistry.types.size).toBeGreaterThan(0);
      expect(urnRegistry.lastRefresh).toBeInstanceOf(Date);
    });

    test('should load registry from API when API key is available', async () => {
      urnRegistry.apiKey = 'test-key';
      
      const mockRegistryData = {
        audiences: ['urn:audience:demographic:test'],
        tags: ['urn:tag:genre:test'],
        types: ['urn:type:activity:test']
      };

      axios.get.mockResolvedValueOnce({ data: mockRegistryData });
      
      await urnRegistry.initialize();
      
      expect(axios.get).toHaveBeenCalled();
      expect(urnRegistry.audiences.has('urn:audience:demographic:test')).toBe(true);
      expect(urnRegistry.tags.has('urn:tag:genre:test')).toBe(true);
      expect(urnRegistry.types.has('urn:type:activity:test')).toBe(true);
    });

    test('should fallback to defaults when API fails', async () => {
      urnRegistry.apiKey = 'test-key';
      axios.get.mockRejectedValueOnce(new Error('API Error'));
      
      await urnRegistry.initialize();
      
      expect(urnRegistry.audiences.size).toBeGreaterThan(0);
      expect(urnRegistry.tags.size).toBeGreaterThan(0);
      expect(urnRegistry.types.size).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    test('should cache entity data', () => {
      const urn = 'urn:brand:company:apple';
      const data = { name: 'Apple', type: 'brand' };
      
      urnRegistry.cacheEntity(urn, data);
      
      const cached = urnRegistry.getCachedEntity(urn);
      expect(cached).toEqual(data);
    });

    test('should not cache invalid URNs', () => {
      const invalidURN = 'invalid:format';
      const data = { name: 'Test' };
      
      urnRegistry.cacheEntity(invalidURN, data);
      
      const cached = urnRegistry.getCachedEntity(invalidURN);
      expect(cached).toBe(null);
    });

    test('should return null for expired cache', () => {
      const urn = 'urn:brand:company:apple';
      const data = { name: 'Apple' };
      
      urnRegistry.cacheEntity(urn, data);
      
      // Manually expire the cache
      const cached = urnRegistry.cache.get(urn);
      cached.timestamp = Date.now() - urnRegistry.refreshInterval - 1000;
      
      const result = urnRegistry.getCachedEntity(urn);
      expect(result).toBe(null);
    });

    test('should clear expired cache entries', () => {
      const urn1 = 'urn:brand:company:apple';
      const urn2 = 'urn:brand:company:google';
      
      urnRegistry.cacheEntity(urn1, { name: 'Apple' });
      urnRegistry.cacheEntity(urn2, { name: 'Google' });
      
      // Expire first entry
      const cached1 = urnRegistry.cache.get(urn1);
      cached1.timestamp = Date.now() - urnRegistry.refreshInterval - 1000;
      
      urnRegistry.clearExpiredCache();
      
      expect(urnRegistry.getCachedEntity(urn1)).toBe(null);
      expect(urnRegistry.getCachedEntity(urn2)).not.toBe(null);
    });
  });

  describe('Entity ID Validation', () => {
    test('should validate entity IDs', () => {
      const validIds = ['entity1', 'entity_2', 'entity-3', 'urn:brand:company:apple'];
      const invalidIds = ['', null, undefined, 'entity with spaces', 'entity@#$%'];
      
      const result = urnRegistry.validateEntityIds(validIds.concat(invalidIds));
      
      expect(result).toEqual(validIds);
    });

    test('should convert entity IDs to URNs', () => {
      const entityIds = ['apple', 'newyork', 'music'];
      
      const urns = urnRegistry.convertToURNs(entityIds);
      
      expect(urns).toEqual([
        'urn:tag:entity:apple',
        'urn:tag:entity:newyork',
        'urn:tag:entity:music'
      ]);
    });

    test('should preserve existing URNs', () => {
      const entityIds = ['urn:brand:company:apple', 'urn:place:city:newyork'];
      
      const urns = urnRegistry.convertToURNs(entityIds);
      
      expect(urns).toEqual(entityIds);
    });
  });

  describe('Registry Statistics', () => {
    test('should return correct statistics', async () => {
      await urnRegistry.initialize();
      
      const stats = urnRegistry.getStats();
      
      expect(stats).toHaveProperty('audiences');
      expect(stats).toHaveProperty('tags');
      expect(stats).toHaveProperty('types');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('lastRefresh');
      expect(stats).toHaveProperty('isInitialized');
      expect(stats.isInitialized).toBe(true);
    });
  });

  describe('Registry Existence Check', () => {
    test('should check if URN exists in registry', async () => {
      await urnRegistry.initialize();
      
      // Check default URNs
      expect(urnRegistry.existsInRegistry('urn:audience:demographic:millennials')).toBe(true);
      expect(urnRegistry.existsInRegistry('urn:tag:genre:music')).toBe(true);
      expect(urnRegistry.existsInRegistry('urn:type:activity:entertainment')).toBe(true);
      
      // Check non-existent URNs
      expect(urnRegistry.existsInRegistry('urn:audience:demographic:nonexistent')).toBe(false);
      expect(urnRegistry.existsInRegistry('urn:invalid:format')).toBe(false);
    });

    test('should return true for valid brand/place URNs (dynamic entities)', () => {
      expect(urnRegistry.existsInRegistry('urn:brand:company:apple')).toBe(true);
      expect(urnRegistry.existsInRegistry('urn:place:city:newyork')).toBe(true);
    });
  });
}); 